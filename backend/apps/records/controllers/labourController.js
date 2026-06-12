import { db } from "../../../models/db.js";
import { labours } from "../models/records.schema.js";
import { eq, and, desc, sql, or } from "drizzle-orm";
import {
    createLabourSchema,
    updateLabourSchema,
    listLaboursQuerySchema,
} from "../utils/labourSchemas.js";
import { tenantWhere, UUID_PARAM } from "../utils/utilities.js";

function mapLabour(row) {
    return {
        id: row.id,
        tenantId: row.tenantId,
        labourCode: row.labourCode,
        labourType: row.labourType,
        fullName: row.fullName,
        mobileNumber: row.mobileNumber,
        mobileNumber2: row.mobileNumber2,
        gender: row.gender,
        address: row.address,
        aadhaarNumber: row.aadhaarNumber,
        defaultRate: row.defaultRate != null ? Number(row.defaultRate) : null,
        brickBuilderRate: row.brickBuilderRate != null ? Number(row.brickBuilderRate) : null,
        brickMoverRate: row.brickMoverRate != null ? Number(row.brickMoverRate) : null,
        sapaRate: row.sapaRate != null ? Number(row.sapaRate) : null,
        rojRate: row.rojRate != null ? Number(row.rojRate) : null,
        metadata: row.metadata,
        accountName: row.accountName,
        account: row.account,
        remark: row.remark,
        createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
        updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt,
        createdBy: row.createdBy,
        updatedBy: row.updatedBy,
    };
}

const generateNextLabourCode = async (tenantId, prefix = "LB") => {
    const lastLabour = await db.select({ labourCode: labours.labourCode, })
        .from(labours)
        .where(eq(labours.tenantId, tenantId))
        .orderBy(desc(labours.createdAt))
        .limit(1);

    const lastCode = lastLabour?.[0]?.labourCode ?? `${prefix}000`;
    const lastNumber = parseInt(lastCode.replace(prefix, ""), 10);
    const nextNumber = lastNumber + 1;
    return `${prefix}${String(nextNumber).padStart(3, "0")}`;
};

export const listLabours = async (req, res) => {
    try {
        const parsed = listLaboursQuerySchema.safeParse(req.query);
        if (!parsed.success) {
            return res.status(400).json({
                error: "Invalid query parameters",
                details: parsed.error.flatten(),
            });
        }

        const { page, limit, searchtext, labourCode, labourType, fullName } = parsed.data;
        const conditions = [tenantWhere(labours.tenantId, req)];

        if (searchtext) {
            conditions?.push(
                or(
                    sql`lower(${labours?.fullName}) like lower(${`%${searchtext}%`})`,
                    sql`lower(${labours?.labourCode}) like lower(${`%${searchtext}%`})`
                )
            );
        }

        if (labourCode) {
            conditions.push(eq(labours.labourCode, labourCode));
        }

        if (labourType) {
            conditions.push(eq(labours.labourType, labourType));
        }

        if (fullName) {
            conditions.push(sql`lower(${labours.fullName}) like lower(${`%${fullName}%`})`);
        }

        const whereClause = and(...conditions);
        const offset = (page - 1) * limit;

        const [{ count }] = await db
            .select({ count: sql`count(*)::int` })
            .from(labours)
            .where(whereClause);

        const rows = await db
            .select()
            .from(labours)
            .where(whereClause)
            .orderBy(desc(labours.createdAt))
            .limit(limit)
            .offset(offset);

        const total = Number(count) || 0;
        const totalPages = Math.ceil(total / limit) || 1;

        res.json({
            success: true,
            data: rows.map(mapLabour),
            pagination: {
                currentPage: page,
                limit,
                total,
                totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
            },
        });
    } catch (error) {
        console.error("listLabours", error);
        res.status(500).json({
            error: "Failed to list labours",
        });
    }
};

export const getLabour = async (req, res) => {
    try {
        const id = req.params.id;
        if (!id || !UUID_PARAM.test(id)) {
            return res.status(400).json({
                error: "Invalid labour id",
            });
        }

        const [row] = await db
            .select()
            .from(labours)
            .where(and(eq(labours.id, id), tenantWhere(labours.tenantId, req)))
            .limit(1);

        if (!row) {
            return res.status(404).json({
                error: "Labour not found",
            });
        }

        res.json({
            success: true,
            data: mapLabour(row),
        });
    } catch (error) {
        console.error("getLabour", error);
        res.status(500).json({
            error: "Failed to get labour",
        });
    }
};

export const createLabour = async (req, res) => {
    try {
        const parsed = createLabourSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                error: "Validation failed",
                details: parsed.error.flatten(),
            });
        }

        const body = parsed.data;
        const labourCode = await generateNextLabourCode(req.user.tenantId)

        const [created] = await db
            .insert(labours)
            .values({
                tenantId: req.user.tenantId,
                accountName: body.account?.name ?? null,
                account: body.account ?? {},
                labourCode: labourCode,
                labourType: body.labourType ?? null,
                fullName: body.fullName,
                mobileNumber: body.mobileNumber ?? null,
                mobileNumber2: body.mobileNumber2 ?? null,
                gender: body.gender ?? null,
                address: body.address ?? null,
                aadhaarNumber: body.aadhaarNumber ?? null,
                defaultRate: body.defaultRate != null ? String(body.defaultRate) : null,
                brickBuilderRate: body.brickBuilderRate != null ? String(body.brickBuilderRate) : null,
                brickMoverRate: body.brickMoverRate != null ? String(body.brickMoverRate) : null,
                sapaRate: body.sapaRate != null ? String(body.sapaRate) : null,
                rojRate: body.rojRate != null ? String(body.rojRate) : null,
                metadata: body.metadata ?? {},
                remark: body.remark ?? null,
                createdBy: req.user.id,
                updatedBy: req.user.id,
            })
            .returning();

        res.status(201).json({
            success: true,
            data: mapLabour(created),
        });
    } catch (error) {
        console.error("createLabour", error);
        res.status(500).json({
            error: "Failed to create labour",
        });
    }
};

export const updateLabour = async (req, res) => {
    try {
        const id = req.params.id;
        if (!id || !UUID_PARAM.test(id)) {
            return res.status(400).json({
                error: "Invalid labour id",
            });
        }

        const parsed = updateLabourSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                error: "Validation failed",
                details: parsed.error.flatten(),
            });
        }

        const body = parsed.data;

        const [existing] = await db
            .select({ id: labours.id })
            .from(labours)
            .where(and(eq(labours.id, id), tenantWhere(labours.tenantId, req)))
            .limit(1);

        if (!existing) {
            return res.status(404).json({
                error: "Labour not found or access denied",
            });
        }

        const patch = {
            updatedBy: req.user.id,
            updatedAt: new Date(),
        };

        if (body.labourType !== undefined) patch.labourType = body.labourType;
        if (body.fullName !== undefined) patch.fullName = body.fullName;
        if (body.mobileNumber !== undefined) patch.mobileNumber = body.mobileNumber;
        if (body.mobileNumber2 !== undefined) patch.mobileNumber2 = body.mobileNumber2;
        if (body.gender !== undefined) patch.gender = body.gender;
        if (body.address !== undefined) patch.address = body.address;
        if (body.aadhaarNumber !== undefined) patch.aadhaarNumber = body.aadhaarNumber;
        if (body.defaultRate !== undefined) patch.defaultRate = body.defaultRate != null ? String(body.defaultRate) : null;
        if (body.brickBuilderRate !== undefined) patch.brickBuilderRate = body.brickBuilderRate != null ? String(body.brickBuilderRate) : null;
        if (body.brickMoverRate !== undefined) patch.brickMoverRate = body.brickMoverRate != null ? String(body.brickMoverRate) : null;
        if (body.sapaRate !== undefined) patch.sapaRate = body.sapaRate != null ? String(body.sapaRate) : null;
        if (body.rojRate !== undefined) patch.rojRate = body.rojRate != null ? String(body.rojRate) : null;
        if (body.metadata !== undefined) patch.metadata = body.metadata;
        if (body.remark !== undefined) patch.remark = body.remark;
        if (body.account !== undefined) {
            patch.account = body.account;
            patch.accountName = body.account?.name ?? null;
        }

        const [updated] = await db
            .update(labours)
            .set(patch)
            .where(and(eq(labours.id, id), tenantWhere(labours.tenantId, req)))
            .returning();

        res.json({
            success: true,
            data: mapLabour(updated),
        });
    } catch (error) {
        console.error("updateLabour", error);
        res.status(500).json({
            error: "Failed to update labour",
        });
    }
};

export const deleteLabour = async (req, res) => {
    try {
        const id = req.params.id;
        if (!id || !UUID_PARAM.test(id)) {
            return res.status(400).json({
                error: "Invalid labour id",
            });
        }

        const del = await db
            .delete(labours)
            .where(and(eq(labours.id, id), tenantWhere(labours.tenantId, req)))
            .returning({ id: labours.id });

        if (!del.length) {
            return res.status(404).json({
                error: "Labour not found or access denied",
            });
        }

        res.json({
            success: true,
            data: { id },
        });
    } catch (error) {
        console.error("deleteLabour", error);
        res.status(500).json({
            error: "Failed to delete labour",
        });
    }
};
