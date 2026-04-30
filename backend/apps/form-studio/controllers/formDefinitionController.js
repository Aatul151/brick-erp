import { db } from "../../../models/db.js";
import { formDefinitions } from "../models/formStudioSchema.js";
import { eq, and, desc, or, getTableColumns } from "drizzle-orm";
import { mapFormDefinition } from "../utils/formMappers.js";
import { isSiteAdmin } from "../utils/tenantScope.js";
import { findFormDefinitionByName, FORM_TYPE } from "../utils/formStudioQueries.js";

function normalizeFormType(value) {
    if (value == null || value === "") return FORM_TYPE.CUSTOM;
    const normalized = String(value).toLowerCase().trim();
    return normalized;
}

function ensureValidFormType(formType) {
    if (![FORM_TYPE.SYSTEM, FORM_TYPE.CUSTOM, FORM_TYPE.MASTER_FORM].includes(formType)) {
        const err = new Error("formType must be one of: custom, system, master_form");
        err.statusCode = 400;
        throw err;
    }
}

function ensureCanManageSystemForm(req, targetFormType) {
    if ((targetFormType === FORM_TYPE.SYSTEM || targetFormType === FORM_TYPE.MASTER_FORM) && !isSiteAdmin(req)) {
        const err = new Error("Only Site Admin can manage system/master forms");
        err.statusCode = 403;
        throw err;
    }
}

export const listFormDefinitionsWithMaster = async (req, res) => {
    try {
        const rows = await db
            .select()
            .from(formDefinitions)
            .where(or(eq(formDefinitions.tenantId, req.user.tenantId), eq(formDefinitions.formType, FORM_TYPE.MASTER_FORM)))
            .orderBy(desc(formDefinitions.updatedAt));

        const data = rows.map((r) => mapFormDefinition(r));

        res.json({
            success: true,
            data,
        });
    } catch (error) {
        console.error("listFormDefinitionsWithMaster", error);
        res.status(500).json({
            error: "Failed to list form definitions",
        });
    }
};

export const listFormDefinitions = async (req, res) => {
    try {
        const whereClause = or(eq(formDefinitions.tenantId, req.user.tenantId), eq(formDefinitions.formType, FORM_TYPE.MASTER_FORM));

        const rows = await db
            .select({
                id: formDefinitions.id,
                tenantId: formDefinitions.tenantId,
                name: formDefinitions.name,
                title: formDefinitions.title,
                formType: formDefinitions.formType,
                collectionName: formDefinitions.collectionName,
                sections: formDefinitions.sections,
                settings: formDefinitions.settings,
                createdBy: formDefinitions.createdBy,
                createdAt: formDefinitions.createdAt,
                updatedAt: formDefinitions.updatedAt,
            })
            .from(formDefinitions)
            .where(whereClause)
            .orderBy(desc(formDefinitions.updatedAt));

        const data = rows.map((r) => mapFormDefinition(r));
        res.json({
            success: true,
            data,
        });
    } catch (error) {
        console.error("listFormDefinitions", error);
        res.status(500).json({
            error: "Failed to list form definitions",
        });
    }
};

export const getFormDefinitionById = async (req, res) => {
    try {
        const conditions = [eq(formDefinitions.id, req.params.id)];
        conditions.push(eq(formDefinitions.tenantId, req.user.tenantId));

        const [row] = await db
            .select({
                id: formDefinitions.id,
                tenantId: formDefinitions.tenantId,
                name: formDefinitions.name,
                title: formDefinitions.title,
                formType: formDefinitions.formType,
                collectionName: formDefinitions.collectionName,
                sections: formDefinitions.sections,
                settings: formDefinitions.settings,
                createdBy: formDefinitions.createdBy,
                createdAt: formDefinitions.createdAt,
                updatedAt: formDefinitions.updatedAt,
            })
            .from(formDefinitions)
            .where(and(...conditions))
            .limit(1);

        if (!row)
            return res.status(404).json({
                error: "Form not found",
            });

        res.json({
            success: true,
            data: mapFormDefinition(row),
        });
    } catch (error) {
        console.error("getFormDefinitionById", error);
        res.status(500).json({
            error: "Failed to load form definition",
        });
    }
};

export const getFormDefinitionByName = async (req, res) => {
    try {
        const name = req.params.name;
        const row = await findFormDefinitionByName(req, name);
        if (!row) return res.status(404).json({ error: "Form not found" });

        res.json({
            success: true,
            data: mapFormDefinition(row),
        });
    } catch (error) {
        console.error("getFormDefinitionByName", error);
        res.status(500).json({
            error: "Failed to load form definition",
        });
    }
};

export const createFormDefinition = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { title, name, collectionName, sections = [], settings = {}, formType } = req.body;

        if (!title || !name) {
            return res.status(400).json({
                error: "title and name are required",
            });
        }

        const normalizedName = String(name).toLowerCase().trim();
        const normalizedFormType = normalizeFormType(formType);
        ensureValidFormType(normalizedFormType);
        ensureCanManageSystemForm(req, normalizedFormType);

        const [created] = await db
            .insert(formDefinitions)
            .values({
                tenantId,
                name: normalizedName,
                title,
                formType: normalizedFormType,
                collectionName: collectionName || null,
                sections,
                settings,
                createdBy: req.user.id,
                updatedBy: req.user.id,
            })
            .returning();

        const [row] = await db
            .select({
                id: formDefinitions.id,
                tenantId: formDefinitions.tenantId,
                name: formDefinitions.name,
                title: formDefinitions.title,
                formType: formDefinitions.formType,
                collectionName: formDefinitions.collectionName,
                sections: formDefinitions.sections,
                settings: formDefinitions.settings,
                createdBy: formDefinitions.createdBy,
                createdAt: formDefinitions.createdAt,
                updatedAt: formDefinitions.updatedAt,
            })
            .from(formDefinitions)
            .where(eq(formDefinitions.id, created.id))
            .limit(1);

        res.status(201).json({
            success: true,
            data: mapFormDefinition(row),
        });
    } catch (error) {
        if (error.code === "23505") {
            return res.status(409).json({
                error: "A form with this name already exists for this tenant",
            });
        }
        if (error.statusCode) {
            return res.status(error.statusCode).json({
                error: error.message,
            });
        }
        console.error("createFormDefinition", error);
        res.status(500).json({
            error: "Failed to create form definition",
        });
    }
};

export const updateFormDefinition = async (req, res) => {
    try {
        const id = req.params.id;
        const conditions = [eq(formDefinitions.id, id)];
        conditions.push(eq(formDefinitions.tenantId, req.user.tenantId));

        const [existing] = await db
            .select()
            .from(formDefinitions)
            .where(and(...conditions))
            .limit(1);

        if (!existing)
            return res.status(404).json({
                error: "Form not found",
            });

        if (!isSiteAdmin(req)) {
            if (existing.tenantId !== req.user.tenantId) {
                return res.status(403).json({
                    error: "Forbidden",
                });
            }
        }

        const { title, name, collectionName, sections, settings, formType } = req.body;
        const nextFormType = formType !== undefined ? normalizeFormType(formType) : (existing.formType ?? FORM_TYPE.CUSTOM);
        ensureValidFormType(nextFormType);
        ensureCanManageSystemForm(req, existing.formType ?? FORM_TYPE.CUSTOM);
        ensureCanManageSystemForm(req, nextFormType);

        const patch = {
            updatedBy: req.user.id,
            updatedAt: new Date(),
        };

        if (title !== undefined) patch.title = title;
        if (name !== undefined) patch.name = String(name).toLowerCase().trim();
        if (formType !== undefined) patch.formType = nextFormType;
        if (collectionName !== undefined) patch.collectionName = collectionName || null;
        if (sections !== undefined) patch.sections = sections;
        if (settings !== undefined) patch.settings = settings;
        if (isSiteAdmin(req) && req.body.tenantId !== undefined && req.body.tenantId !== null) {
            patch.tenantId = req.body.tenantId;
        }

        await db.update(formDefinitions).set(patch).where(eq(formDefinitions.id, id));

        const [row] = await db
            .select({
                id: formDefinitions.id,
                tenantId: formDefinitions.tenantId,
                name: formDefinitions.name,
                title: formDefinitions.title,
                formType: formDefinitions.formType,
                collectionName: formDefinitions.collectionName,
                sections: formDefinitions.sections,
                settings: formDefinitions.settings,
                createdBy: formDefinitions.createdBy,
                createdAt: formDefinitions.createdAt,
                updatedAt: formDefinitions.updatedAt,
            })
            .from(formDefinitions)
            .where(eq(formDefinitions.id, id))
            .limit(1);

        res.json({
            success: true,
            data: mapFormDefinition(row),
        });
    } catch (error) {
        if (error.code === "23505") {
            return res.status(409).json({
                error: "A form with this name already exists for this tenant",
            });
        }
        if (error.statusCode) {
            return res.status(error.statusCode).json({
                error: error.message,
            });
        }
        console.error("updateFormDefinition", error);
        res.status(500).json({
            error: "Failed to update form definition",
        });
    }
};

export const deleteFormDefinition = async (req, res) => {
    try {
        const id = req.params.id;
        const conditions = [eq(formDefinitions.id, id)];
        conditions.push(eq(formDefinitions.tenantId, req.user.tenantId));

        const [existing] = await db
            .select({
                id: formDefinitions.id,
                formType: formDefinitions.formType,
            })
            .from(formDefinitions)
            .where(and(...conditions))
            .limit(1);

        if (!existing)
            return res.status(404).json({
                error: "Form not found",
            });
        ensureCanManageSystemForm(req, existing.formType ?? FORM_TYPE.CUSTOM);

        const deleted = await db
            .delete(formDefinitions)
            .where(and(...conditions))
            .returning({
                id: formDefinitions.id,
            });

        if (!deleted.length)
            return res.status(404).json({
                error: "Form not found",
            });

        res.json({
            success: true,
            data: {
                id,
            },
        });
    } catch (error) {
        console.error("deleteFormDefinition", error);
        res.status(500).json({
            error: "Failed to delete form definition",
        });
    }
};
