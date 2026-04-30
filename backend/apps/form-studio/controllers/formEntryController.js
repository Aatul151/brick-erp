import { db } from "../../../models/db.js";
import { formEntries, masterFormEntries } from "../models/formStudioSchema.js";
import { users } from "../../../models/schema.js";
import { eq, and, desc, sql } from "drizzle-orm";
import { alias, unionAll } from "drizzle-orm/pg-core";
import { mapFormEntry } from "../utils/formMappers.js";
import { resolveWriteTenantId, isSiteAdmin } from "../utils/tenantScope.js";
import { findFormDefinitionByName, FORM_TYPE } from "../utils/formStudioQueries.js";

const formEntryCreator = alias(users, "form_entry_creator");
const formEntryUpdater = alias(users, "form_entry_updater");
const masterEntryCreator = alias(users, "master_entry_creator");
const masterEntryUpdater = alias(users, "master_entry_updater");

export const listFormEntries = async (req, res) => {
    try {
        const formName = req.query.formName;
        if (!formName)
            return res.status(400).json({
                error: "formName query is required",
            });

        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(500, Math.max(1, parseInt(req.query.limit, 10) || 10));
        let filters = {};
        if (req.query.filters) {
            try {
                filters = typeof req.query.filters === "string" ? JSON.parse(req.query.filters) : req.query.filters;
            } catch {
                return res.status(400).json({
                    error: "Invalid filters JSON",
                });
            }
        }

        const def = await findFormDefinitionByName(req, formName);
        if (!def) return res.status(404).json({ error: "Form definition not found" });

        const tf = resolveWriteTenantId(req);
        if (tf != null && def.tenantId !== tf && def.formType !== FORM_TYPE.MASTER_FORM) {
            return res.status(403).json({
                error: "Forbidden",
            });
        }

        const payloadFilterPairs = [];
        if (filters && typeof filters === "object") {
            for (const [k, v] of Object.entries(filters)) {
                if (v === undefined || v === null || v === "") continue;
                if (!/^[a-zA-Z0-9_]+$/.test(k)) continue;
                payloadFilterPairs.push({ key: k, value: String(v) });
            }
        }

        const baseConditions = [eq(formEntries.formDefinitionId, def.id)];
        if (tf != null) baseConditions.push(eq(formEntries.tenantId, tf));
        for (const { key, value } of payloadFilterPairs) {
            baseConditions.push(sql`${formEntries.payload} ->> ${sql.raw(`'${key}'`)} = ${value}`);
        }

        const allConditions = and(...baseConditions);
        const offset = (page - 1) * limit;

        const tenantSelectShape = {
            id: formEntries.id,
            tenantId: formEntries.tenantId,
            formDefinitionId: formEntries.formDefinitionId,
            payload: formEntries.payload,
            createdBy: formEntries.createdBy,
            updatedBy: formEntries.updatedBy,
            createdAt: formEntries.createdAt,
            updatedAt: formEntries.updatedAt,
            creatorName: sql`${formEntryCreator.fullName}`.as("creator_name"),
            creatorEmail: sql`${formEntryCreator.email}`.as("creator_email"),
            updaterName: sql`${formEntryUpdater.fullName}`.as("updater_name"),
            updaterEmail: sql`${formEntryUpdater.email}`.as("updater_email"),
        };

        const qTenantEntries = db
            .select(tenantSelectShape)
            .from(formEntries)
            .leftJoin(formEntryCreator, eq(formEntries.createdBy, formEntryCreator.id))
            .leftJoin(formEntryUpdater, eq(formEntries.updatedBy, formEntryUpdater.id))
            .where(allConditions);

        let rows;
        let total;

        if (def.formType !== FORM_TYPE.MASTER_FORM) {
            const [{ count }] = await db
                .select({ count: sql`count(*)::int` })
                .from(formEntries)
                .where(allConditions);

            rows = await qTenantEntries.orderBy(desc(formEntries.createdAt)).limit(limit).offset(offset);
            total = parseInt(count, 10) || 0;
        } else {
            const masterConditions = [eq(masterFormEntries.formName, def.name)];
            for (const { key, value } of payloadFilterPairs) {
                masterConditions.push(sql`${masterFormEntries.payload} ->> ${sql.raw(`'${key}'`)} = ${value}`);
            }
            const masterAllConditions = and(...masterConditions);

            const masterSelectShape = {
                id: masterFormEntries.id,
                tenantId: sql`NULL::uuid`,
                formDefinitionId: sql`NULL::uuid`,
                payload: masterFormEntries.payload,
                createdBy: masterFormEntries.createdBy,
                updatedBy: masterFormEntries.updatedBy,
                createdAt: masterFormEntries.createdAt,
                updatedAt: masterFormEntries.updatedAt,
                creatorName: sql`${masterEntryCreator.fullName}`.as("creator_name"),
                creatorEmail: sql`${masterEntryCreator.email}`.as("creator_email"),
                updaterName: sql`${masterEntryUpdater.fullName}`.as("updater_name"),
                updaterEmail: sql`${masterEntryUpdater.email}`.as("updater_email"),
            };

            const qMasterEntries = db
                .select(masterSelectShape)
                .from(masterFormEntries)
                .leftJoin(masterEntryCreator, eq(masterFormEntries.createdBy, masterEntryCreator.id))
                .leftJoin(masterEntryUpdater, eq(masterFormEntries.updatedBy, masterEntryUpdater.id))
                .where(masterAllConditions);

            const combined = unionAll(qTenantEntries, qMasterEntries).as("combined_form_entries");

            const [{ count }] = await db.select({ count: sql`count(*)::int` }).from(combined);

            rows = await db
                .select({
                    id: combined.id,
                    tenantId: combined.tenantId,
                    formDefinitionId: combined.formDefinitionId,
                    payload: combined.payload,
                    createdBy: combined.createdBy,
                    updatedBy: combined.updatedBy,
                    createdAt: combined.createdAt,
                    updatedAt: combined.updatedAt,
                    creatorName: combined.creatorName,
                    creatorEmail: combined.creatorEmail,
                    updaterName: combined.updaterName,
                    updaterEmail: combined.updaterEmail,
                })
                .from(combined)
                .orderBy(desc(combined.createdAt))
                .limit(limit)
                .offset(offset);

            total = parseInt(count, 10) || 0;
        }

        const mappedRows = rows.map((r) => mapFormEntry(r));
        const totalPages = Math.ceil(total / limit) || 1;

        res.json({
            success: true,
            data: mappedRows,
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
        console.error("listFormEntries", error);
        res.status(500).json({
            error: "Failed to list form entries",
        });
    }
};

export const createFormEntry = async (req, res) => {
    try {
        const { formName, payload = {} } = req.body;
        if (!formName) return res.status(400).json({ error: "formName is required" });

        const def = await findFormDefinitionByName(req, formName);
        if (!def) return res.status(404).json({ error: "Form definition not found" });

        const isMasterForm = def.formType === FORM_TYPE.MASTER_FORM;

        const adminMaster = isSiteAdmin(req) && isMasterForm;
        if (!adminMaster) {
            if (def.formType !== FORM_TYPE.MASTER_FORM && def.tenantId !== req.user.tenantId) {
                return res.status(400).json({
                    error: "Form not allowed to create entries",
                });
            }
        }

        let created;
        if (adminMaster) {
            [created] = await db
                .insert(masterFormEntries)
                .values({
                    formName: def.name,
                    payload,
                    createdBy: req.user.id,
                })
                .returning();
        } else {
            [created] = await db
                .insert(formEntries)
                .values({
                    tenantId: req.user.tenantId,
                    formDefinitionId: def.id,
                    payload,
                    createdBy: req.user.id,
                })
                .returning();
        }

        res.json({
            success: true,
            data: mapFormEntry(created),
        });
    } catch (error) {
        console.error("createFormEntry", error);
        res.status(500).json({
            error: "Failed to create form entry",
        });
    }
};

export const updateFormEntry = async (req, res) => {
    try {
        const entryId = req.params.id;
        if (!entryId) return res.status(400).json({ error: "Invalid id" });

        const { formName, payload } = req.body;
        if (!formName) return res.status(400).json({ error: "formName is required" });
        if (payload === undefined) return res.status(400).json({ error: "payload is required" });

        const def = await findFormDefinitionByName(req, formName);
        if (!def) return res.status(404).json({ error: "Form definition not found" });

        const isMasterForm = def.formType === FORM_TYPE.MASTER_FORM;
        if (isMasterForm && !isSiteAdmin(req)) {
            return res.status(400).json({
                error: "You can not update master form entries",
            });
        }

        let existing;
        if (isMasterForm) {
            [existing] = await db
                .select()
                .from(masterFormEntries)
                .where(and(eq(masterFormEntries.id, entryId), eq(masterFormEntries.formName, def.name)))
                .limit(1);
        } else {
            const conditions = [eq(formEntries.id, entryId), eq(formEntries.formDefinitionId, def.id), eq(formEntries.tenantId, req.user.tenantId)];
            [existing] = await db
                .select()
                .from(formEntries)
                .where(and(...conditions))
                .limit(1);
        }

        if (!existing) return res.status(404).json({ error: "Entry not found" });

        let updated;
        if (isMasterForm) {
            [updated] = await db
                .update(masterFormEntries)
                .set({
                    payload,
                    updatedBy: req.user.id,
                    updatedAt: new Date(),
                })
                .where(and(eq(masterFormEntries.id, entryId), eq(masterFormEntries.formName, def.name)))
                .returning();
        } else {
            [updated] = await db
                .update(formEntries)
                .set({
                    payload,
                    updatedBy: req.user.id,
                    updatedAt: new Date(),
                })
                .where(eq(formEntries.id, entryId))
                .returning();
        }

        res.json({
            success: true,
            data: mapFormEntry(updated),
        });
    } catch (error) {
        console.error("updateFormEntry", error);
        res.status(500).json({
            error: "Failed to update form entry",
        });
    }
};

export const deleteFormEntry = async (req, res) => {
    try {
        const entryId = req.params.id;
        const formName = req.query.formName;
        if (!entryId) return res.status(400).json({ error: "Invalid id" });
        if (!formName) return res.status(400).json({ error: "formName query is required" });

        const def = await findFormDefinitionByName(req, formName);
        if (!def) return res.status(404).json({ error: "Form definition not found" });

        const isMasterForm = def.formType === FORM_TYPE.MASTER_FORM;
        const adminMaster = isMasterForm && isSiteAdmin(req);

        let del;
        if (adminMaster) {
            del = await db
                .delete(masterFormEntries)
                .where(and(eq(masterFormEntries.id, entryId), eq(masterFormEntries.formName, def.name)))
                .returning({
                    id: masterFormEntries.id,
                });
        } else {
            const conditions = [eq(formEntries.id, entryId), eq(formEntries.formDefinitionId, def.id), eq(formEntries.tenantId, req.user.tenantId)];

            del = await db
                .delete(formEntries)
                .where(and(...conditions))
                .returning({
                    id: formEntries.id,
                });
        }

        if (!del.length)
            return res.status(404).json({
                error: "Entry not found",
            });

        res.json({
            success: true,
            data: {
                id: entryId,
            },
        });
    } catch (error) {
        console.error("deleteFormEntry", error);
        res.status(500).json({
            error: "Failed to delete form entry",
        });
    }
};
