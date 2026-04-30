import { mkdirSync, createReadStream, existsSync } from "fs";
import { join, dirname, relative } from "path";
import { fileURLToPath } from "url";
import { randomBytes } from "crypto";
import { db } from "../../../models/db.js";
import { formUploadedFiles } from "../models/formStudioSchema.js";
import { eq } from "drizzle-orm";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const UPLOAD_ROOT = join(__dirname, "../../../uploads");

function ensureDir(p) {
    mkdirSync(p, {
        recursive: true,
    });
}

const FORMS_FALLBACK_DIR = "forms";
const FIELDS_FALLBACK_DIR = "fields";

/** Length-10 [a-z0-9] token for public file URLs (not DB serial id). */
const PUBLIC_ID_LENGTH = 15;
const PUBLIC_ID_REGEX = new RegExp(`^[a-z0-9]{${PUBLIC_ID_LENGTH}}$`);
const PUBLIC_ID_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

function randomPublicId() {
    const buf = randomBytes(PUBLIC_ID_LENGTH);
    let out = "";
    for (let i = 0; i < PUBLIC_ID_LENGTH; i++) {
        out += PUBLIC_ID_ALPHABET[buf[i] % PUBLIC_ID_ALPHABET.length];
    }
    return out;
}

async function allocateUniquePublicId() {
    for (let attempt = 0; attempt < 12; attempt++) {
        const candidate = randomPublicId();
        const dup = await db
            .select({
                id: formUploadedFiles.id,
            })
            .from(formUploadedFiles)
            .where(eq(formUploadedFiles.publicId, candidate))
            .limit(1);
        if (dup.length === 0) return candidate;
    }
    throw new Error("Failed to allocate unique public file id");
}

/** Safe single path segment for disk (no traversal). */
function safeDirSegment(input, fallback) {
    const raw = String(input ?? "").trim();
    if (!raw) return fallback;
    let s = raw
        .replace(/[^a-zA-Z0-9_-]/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_|_$/g, "");
    if (!s) return fallback;
    if (s.length > 120) s = s.slice(0, 120);
    return s;
}

function uploadRelativeDir(req) {
    const tenantId = resolveTenantId(req);
    const formName = req.body?.formName;
    const fieldName = req.body?.fieldName;
    const formSeg = safeDirSegment(formName, FORMS_FALLBACK_DIR);
    const fieldSeg = safeDirSegment(fieldName, FIELDS_FALLBACK_DIR);
    return join(String(tenantId), formSeg, fieldSeg);
}

function resolveFormUploadDir(req) {
    const rel = uploadRelativeDir(req);
    const dir = join(UPLOAD_ROOT, rel);
    ensureDir(dir);
    return dir;
}

function isSiteAdmin(req) {
    return req.user?.roles?.some((r) => r.roleName === "Site Admin");
}

function resolveTenantId(req) {
    if (isSiteAdmin(req)) {
        const t = req.body?.tenantId;
        if (t != null) return parseInt(t, 10);
    }
    return req.user.tenantId;
}

/**
 * Multer factory — call once after importing this module.
 */
export function createUploadMiddleware(multer) {
    const storage = multer.diskStorage({
        destination: (req, _file, cb) => {
            try {
                const tenantId = resolveTenantId(req);
                if (!tenantId) {
                    return cb(new Error("tenantId required for upload"));
                }
                cb(null, resolveFormUploadDir(req));
            } catch (e) {
                cb(e);
            }
        },
        filename: (_req, file, cb) => {
            const safe = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}_${file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
            cb(null, safe);
        },
    });
    return multer({
        storage,
        limits: {
            fileSize: 50 * 1024 * 1024,
        },
    });
}

export const uploadFormFiles = async (req, res) => {
    try {
        const tenantId = resolveTenantId(req);
        if (!tenantId) {
            return res.status(400).json({
                error: "tenantId is required (or use a tenant-scoped user)",
            });
        }

        const { formName, fieldName } = req.body;
        if (!formName || !fieldName) {
            return res.status(400).json({
                error: "formName and fieldName are required",
            });
        }

        const files = req.files;
        if (!files?.length) {
            return res.status(400).json({
                error: "No files uploaded",
            });
        }

        const baseUrl = `${req.protocol}://${req.get("host")}`;
        const results = [];

        for (const file of files) {
            const storagePath = relative(UPLOAD_ROOT, file.path).replace(/\\/g, "/");
            const publicId = await allocateUniquePublicId();
            const [row] = await db
                .insert(formUploadedFiles)
                .values({
                    tenantId,
                    formName,
                    fieldName,
                    publicId,
                    storagePath,
                    originalName: file.originalname,
                    fileName: file.filename,
                    mimeType: file.mimetype,
                    size: file.size,
                    uploadedBy: req.user.id,
                })
                .returning();

            const fileUrl = `${baseUrl}/api/form-media/files/${row.publicId}`;
            results.push({
                publicId: row.publicId,
                fileName: file.filename,
                originalName: file.originalname,
                size: file.size,
                mimeType: file.mimetype,
                fileUrl,
                uploadedAt: row.createdAt?.toISOString?.() || new Date().toISOString(),
            });
        }

        res.json({
            success: true,
            data: results,
        });
    } catch (error) {
        console.error("uploadFormFiles", error);
        res.status(500).json({
            error: error.message || "Upload failed",
        });
    }
};

export const downloadFile = async (req, res) => {
    try {
        const publicId = req.params.publicId;
        if (!publicId || typeof publicId !== "string" || !PUBLIC_ID_REGEX.test(publicId)) {
            return res.status(400).json({
                error: "Invalid file reference",
            });
        }

        const [row] = await db.select().from(formUploadedFiles).where(eq(formUploadedFiles.publicId, publicId)).limit(1);
        if (!row)
            return res.status(404).json({
                error: "File not found",
            });

        const tf = isSiteAdmin(req) ? null : req.user.tenantId;
        if (tf != null && row.tenantId !== tf) {
            return res.status(403).json({
                error: "Forbidden",
            });
        }

        const abs = join(UPLOAD_ROOT, row.storagePath);
        if (!existsSync(abs)) {
            return res.status(404).json({
                error: "File missing on disk",
            });
        }

        res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(row.originalName)}"`);
        if (row.mimeType) res.setHeader("Content-Type", row.mimeType);
        createReadStream(abs).pipe(res);
    } catch (error) {
        console.error("downloadFile", error);
        res.status(500).json({
            error: "Failed to read file",
        });
    }
};
