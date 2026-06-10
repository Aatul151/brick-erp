import { randomUUID } from "crypto";
import { db } from "../../../models/db.js";
import { records, labours } from "../models/records.schema.js";
import { eq, and, desc, gte, lte, sql } from "drizzle-orm";
import { createRecordSchema, updateRecordSchema, listRecordsQuerySchema } from "../utils/recordEntrySchemas.js";
import { parseEntryDate, tenantWhere, UUID_PARAM } from "../utils/utilities.js";

function mapRecord(objRow) {
    const row = objRow.records ?? objRow ?? {};
    const labour = objRow.labours ?? null;

    const ed = row.entryDate;
    const entryDateStr = ed instanceof Date ? ed.toISOString().slice(0, 10) : typeof ed === "string" ? ed.slice(0, 10) : ed;
    return {
        id: row.id,
        tenantId: row.tenantId,
        labourId: row.labourId,
        labour: labour ? {
            id: row.labourId,
            labourCode: labour.labourCode ?? null,
            labourType: labour.labourType ?? null,
            fullName: labour.fullName ?? null,
            mobileNumber: row.mobileNumber ?? null,
        } : null,
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

export const listRecords = async (req, res) => {
    try {
        const parsed = listRecordsQuerySchema.safeParse(req.query);
        if (!parsed.success) {
            return res.status(400).json({
                error: "Invalid query parameters",
                details: parsed.error.flatten(),
            });
        }
        const { page, limit, recordType, entryDateFrom, entryDateTo, categoryName, labelValue } = parsed.data;
        const conditions = [tenantWhere(records.tenantId, req)];
        if (recordType) {
            conditions.push(eq(records.recordType, recordType));
        }
        const fromD = entryDateFrom ? parseEntryDate(entryDateFrom) : null;
        const toD = entryDateTo ? parseEntryDate(entryDateTo, true) : null;
        if (fromD) {
            conditions.push(gte(records.entryDate, fromD));
        }
        if (toD) {
            conditions.push(lte(records.entryDate, toD));
        }

        if (categoryName) {
            const categoryNames = categoryName?.split(",").map((v) => v?.trim()).filter(Boolean);
            if (categoryNames.length > 0) {
                conditions.push(
                    sql`${records.categoryName} IN (${sql.join(categoryNames?.map(v => sql`${v}`), sql`, `)})`
                );
            }
        }

        if (labelValue) {
            const labelValues = labelValue?.split(",").map((v) => v?.trim()).filter(Boolean);

            if (labelValues.length > 0) {
                conditions.push(
                    sql`(${sql.join(
                        labelValues.map(v => sql`${records?.label} @> ${JSON.stringify([{ value: v }])}::jsonb`),
                        sql` OR `
                    )})`
                );
            }
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
            .leftJoin(labours, eq(records.labourId, labours.id))
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
            .leftJoin(labours, eq(records.labourId, labours.id))
            .where(and(eq(records.id, id), tenantWhere(records.tenantId, req)))
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
                labourId: body.labourId,
                recordType: body.recordType,
                recordUnit: body.recordUnit ?? null,
                value: body.value != null ? String(body.value) : null,
                entryDate,
                entryTime: body.entryTime ?? null,
                accountName: body.account?.label ?? null,
                account: body.account ?? {},
                categoryName: body.category?.label ?? null,
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
            .where(and(eq(records.id, id), tenantWhere(records.tenantId, req)))
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
        if (body.labourId !== undefined) patch.labourId = body.labourId;
        if (body.recordType !== undefined) patch.recordType = body.recordType;
        if (body.recordUnit !== undefined) patch.recordUnit = body.recordUnit;
        if (body.value !== undefined) patch.value = body.value != null ? String(body.value) : null;
        if (body.entryDate !== undefined) {
            const entryDate = parseEntryDate(body.entryDate);
            if (!entryDate) {
                return res.status(400).json({
                    error: "Invalid entryDate",
                });
            }
            patch.entryDate = entryDate
        };
        if (body.entryTime !== undefined) patch.entryTime = body.entryTime;
        if (body.account !== undefined) {
            patch.account = body.account;
            patch.accountName = body.account?.label ?? null;
        }
        if (body.category !== undefined) {
            patch.category = body.category;
            patch.categoryName = body.category?.label ?? null;
        }
        if (body.label !== undefined) patch.label = body.label;
        if (body.remark !== undefined) patch.remark = body.remark;

        const [updated] = await db
            .update(records)
            .set(patch)
            .where(and(eq(records.id, id), tenantWhere(records.tenantId, req)))
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
            .where(and(eq(records.id, id), tenantWhere(records.tenantId, req)))
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
