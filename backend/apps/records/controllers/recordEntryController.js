import { randomUUID } from "crypto";
import { db } from "../../../models/db.js";
import { records } from "../models/records.schema.js";
import { eq, and, desc, gte, lte, sql } from "drizzle-orm";
import { createRecordSchema, updateRecordSchema, listRecordsQuerySchema } from "../utils/recordEntrySchemas.js";

const UUID_PARAM = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseEntryDate(value) {
    if (!value || typeof value !== "string") return null;
    const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return null;
    const d = new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00.000Z`);
    return Number.isNaN(d.getTime()) ? null : d;
}

function mapRecord(row) {
    const ed = row.entryDate;
    const entryDateStr =
        ed instanceof Date ? ed.toISOString().slice(0, 10) : typeof ed === "string" ? ed.slice(0, 10) : ed;
    return {
        id: row.id,
        tenantId: row.tenantId,
        recordType: row.recordType,
        recordUnit: row.recordUnit,
        value: row.value != null ? Number(row.value) : null,
        entryDate: entryDateStr,
        entryTime: row.entryTime,
        year: row.year,
        month: row.month,
        accountName: row.accountName,
        account: row.account,
        categoryName: row.categoryName,
        category: row.category,
        label: row.label,
        remark: row.remark,
        createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
        updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt,
        createdBy: row.createdBy,
        updatedBy: row.updatedBy,
    };
}

function tenantWhere(req) {
    return eq(records.tenantId, req.user.tenantId);
}

export const listRecords = async (req, res) => {
    try {
        const parsed = listRecordsQuerySchema.safeParse(req.query);
        if (!parsed.success) {
            return res.status(400).json({
                error: "Invalid query parameters",
                details: parsed.error.flatten(),
            });
        }
        const { page, limit, recordType, entryDateFrom, entryDateTo } = parsed.data;
        const conditions = [tenantWhere(req)];
        if (recordType) {
            conditions.push(eq(records.recordType, recordType));
        }
        const fromD = entryDateFrom ? parseEntryDate(entryDateFrom) : null;
        const toD = entryDateTo ? parseEntryDate(entryDateTo) : null;
        if (fromD) {
            conditions.push(gte(records.entryDate, fromD));
        }
        if (toD) {
            conditions.push(lte(records.entryDate, toD));
        }
        const whereClause = and(...conditions);
        const offset = (page - 1) * limit;

        const [{ count }] = await db
            .select({
                count: sql`count(*)::int`,
            })
            .from(records)
            .where(whereClause);

        const rows = await db
            .select()
            .from(records)
            .where(whereClause)
            .orderBy(desc(records.entryDate), desc(records.createdAt))
            .limit(limit)
            .offset(offset);

        const total = Number(count) || 0;
        const totalPages = Math.ceil(total / limit) || 1;

        res.json({
            success: true,
            data: rows.map(mapRecord),
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
        console.error("listRecords", error);
        res.status(500).json({
            error: "Failed to list records",
        });
    }
};

export const getRecord = async (req, res) => {
    try {
        const id = req.params.id;
        if (!id || !UUID_PARAM.test(id)) {
            return res.status(400).json({
                error: "Invalid record id",
            });
        }

        const [row] = await db
            .select()
            .from(records)
            .where(and(eq(records.id, id), tenantWhere(req)))
            .limit(1);

        if (!row) {
            return res.status(404).json({
                error: "Record not found",
            });
        }

        res.json({
            success: true,
            data: mapRecord(row),
        });
    } catch (error) {
        console.error("getRecord", error);
        res.status(500).json({
            error: "Failed to get record",
        });
    }
};

export const createRecord = async (req, res) => {
    try {
        const parsed = createRecordSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                error: "Validation failed",
                details: parsed.error.flatten(),
            });
        }
        const body = parsed.data;
        if (body.tenantId !== req.user.tenantId) {
            return res.status(403).json({
                error: "tenantId must match your authenticated tenant",
            });
        }

        const entryDate = parseEntryDate(body.entryDate);
        if (!entryDate) {
            return res.status(400).json({
                error: "Invalid entryDate",
            });
        }

        const [created] = await db
            .insert(records)
            .values({
                tenantId: req.user.tenantId,
                recordType: body.recordType,
                recordUnit: body.recordUnit ?? null,
                value: body.value != null ? String(body.value) : null,
                entryDate,
                entryTime: body.entryTime ?? null,
                accountName: body.account?.name ?? null,
                account: body.account ?? {},
                categoryName: body.category?.name ?? null,
                category: body.category ?? {},
                label: body.label ?? {},
                remark: body.remark ?? null,
                createdBy: req.user.id,
                updatedBy: req.user.id,
            })
            .returning();

        res.status(201).json({
            success: true,
            data: mapRecord(created),
        });
    } catch (error) {
        console.error("createRecord", error);
        res.status(500).json({
            error: "Failed to create record",
        });
    }
};

export const updateRecord = async (req, res) => {
    try {
        const id = req.params.id;
        if (!id || !UUID_PARAM.test(id)) {
            return res.status(400).json({
                error: "Invalid record id",
            });
        }

        const parsed = updateRecordSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                error: "Validation failed",
                details: parsed.error.flatten(),
            });
        }
        const body = parsed.data;

        const [existing] = await db
            .select({ id: records.id })
            .from(records)
            .where(and(eq(records.id, id), tenantWhere(req)))
            .limit(1);

        if (!existing) {
            return res.status(404).json({
                error: "Record not found or access denied",
            });
        }

        const patch = {
            updatedBy: req.user.id,
            updatedAt: new Date(),
        };
        if (body.recordType !== undefined) patch.recordType = body.recordType;
        if (body.recordUnit !== undefined) patch.recordUnit = body.recordUnit;
        if (body.value !== undefined) patch.value = body.value != null ? String(body.value) : null;
        if (body.entryDate !== undefined) patch.entryDate = body.entryDate;
        if (body.entryTime !== undefined) patch.entryTime = body.entryTime;
        if (body.account !== undefined) {
            patch.account = body.account;
            patch.accountName = body.account?.name ?? null;
        }
        if (body.category !== undefined) {
            patch.category = body.category;
            patch.categoryName = body.category?.name ?? null;
        }
        if (body.label !== undefined) patch.label = body.label;
        if (body.remark !== undefined) patch.remark = body.remark;

        const [updated] = await db
            .update(records)
            .set(patch)
            .where(and(eq(records.id, id), tenantWhere(req)))
            .returning();

        res.json({
            success: true,
            data: mapRecord(updated),
        });
    } catch (error) {
        console.error("updateRecord", error);
        res.status(500).json({
            error: "Failed to update record",
        });
    }
};

export const deleteRecord = async (req, res) => {
    try {
        const id = req.params.id;
        if (!id || !UUID_PARAM.test(id)) {
            return res.status(400).json({
                error: "Invalid record id",
            });
        }

        const del = await db
            .delete(records)
            .where(and(eq(records.id, id), tenantWhere(req)))
            .returning({
                id: records.id,
                entryDate: records.entryDate,
            });

        if (!del.length) {
            return res.status(404).json({
                error: "Record not found or access denied",
            });
        }

        const row = del[0];

        res.json({
            success: true,
            data: {
                id,
                entryDate: row.entryDate,
            },
        });
    } catch (error) {
        console.error("deleteRecord", error);
        res.status(500).json({
            error: "Failed to delete record",
        });
    }
};
