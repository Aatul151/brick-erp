import { db } from "../../../models/db.js";
import { formEntries } from "../models/formStudioSchema.js";
import { users } from "../../../models/schema.js";
import { eq, and, desc, sql } from "drizzle-orm";
import { mapFormEntry } from "../utils/formMappers.js";
import { resolveWriteTenantId } from "../utils/tenantScope.js";
import { findFormDefinitionByName } from "../utils/formStudioQueries.js";

function parseUuid(value) {
    if (value == null || value === "") return null;
    const id = String(value).trim();
    if (
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
            id,
        )
    ) {
        return null;
    }
    return id;
}

export const listFormEntries = async (req, res) => {
    try {
        const formName = req.query.formName;
        if (!formName)
            return res
                .status(400)
                .json({ error: "formName query is required" });

        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(
            500,
            Math.max(1, parseInt(req.query.limit, 10) || 10),
        );
        let filters = {};
        if (req.query.filters) {
            try {
                filters =
                    typeof req.query.filters === "string"
                        ? JSON.parse(req.query.filters)
                        : req.query.filters;
            } catch {
                return res.status(400).json({ error: "Invalid filters JSON" });
            }
        }

        const def = await findFormDefinitionByName(req, formName);
        if (!def)
            return res.status(404).json({ error: "Form definition not found" });

        const tf = resolveWriteTenantId(req);
        if (tf != null && def.tenantId !== tf) {
            return res.status(403).json({ error: "Forbidden" });
        }

        const baseConditions = [eq(formEntries.formDefinitionId, def.id)];
        if (tf != null) baseConditions.push(eq(formEntries.tenantId, tf));

        if (filters && typeof filters === "object") {
            for (const [k, v] of Object.entries(filters)) {
                if (v === undefined || v === null || v === "") continue;
                if (!/^[a-zA-Z0-9_]+$/.test(k)) continue;
                baseConditions.push(
                    sql`${formEntries.payload} ->> ${sql.raw(`'${k}'`)} = ${String(v)}`,
                );
            }
        }

        const allConditions = and(...baseConditions);
        const offset = (page - 1) * limit;

        const [{ count }] = await db
            .select({ count: sql`count(*)::int` })
            .from(formEntries)
            .where(allConditions);

        const rows = await db
            .select({
                id: formEntries.id,
                tenantId: formEntries.tenantId,
                formDefinitionId: formEntries.formDefinitionId,
                payload: formEntries.payload,
                submittedBy: formEntries.submittedBy,
                createdAt: formEntries.createdAt,
                updatedAt: formEntries.updatedAt,
                submitterName: users.fullName,
                submitterEmail: users.email,
            })
            .from(formEntries)
            .leftJoin(users, eq(formEntries.submittedBy, users.id))
            .where(allConditions)
            .orderBy(desc(formEntries.createdAt))
            .limit(limit)
            .offset(offset);

        const mapped = rows.map((r) => {
            const submittedUser =
                r.submittedBy && r.submitterEmail
                    ? {
                          id: r.submittedBy,
                          fullName: r.submitterName,
                          email: r.submitterEmail,
                      }
                    : null;
            return mapFormEntry(
                {
                    id: r.id,
                    tenantId: r.tenantId,
                    formDefinitionId: r.formDefinitionId,
                    payload: r.payload,
                    submittedBy: r.submittedBy,
                    createdAt: r.createdAt,
                    updatedAt: r.updatedAt,
                },
                submittedUser,
            );
        });

        const total = parseInt(count, 10) || 0;
        const totalPages = Math.ceil(total / limit) || 1;

        res.json({
            success: true,
            data: mapped,
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
        res.status(500).json({ error: "Failed to list form entries" });
    }
};

export const createFormEntry = async (req, res) => {
    try {
        const { formName, payload = {} } = req.body;
        if (!formName)
            return res.status(400).json({ error: "formName is required" });

        const def = await findFormDefinitionByName(req, formName);
        if (!def)
            return res.status(404).json({ error: "Form definition not found" });

        const tf = resolveWriteTenantId(req);
        if (tf != null && def.tenantId !== tf) {
            return res.status(403).json({ error: "Forbidden" });
        }

        const [created] = await db
            .insert(formEntries)
            .values({
                tenantId: def.tenantId,
                formDefinitionId: def.id,
                payload,
                submittedBy: req.user.id,
            })
            .returning();

        const [u] = await db
            .select()
            .from(users)
            .where(eq(users.id, req.user.id))
            .limit(1);

        res.status(201).json({
            success: true,
            data: mapFormEntry(created, u),
        });
    } catch (error) {
        console.error("createFormEntry", error);
        res.status(500).json({ error: "Failed to create form entry" });
    }
};

export const updateFormEntry = async (req, res) => {
    try {
        const entryId = parseUuid(req.params.id);
        if (!entryId) return res.status(400).json({ error: "Invalid id" });

        const { formName, payload } = req.body;
        if (!formName)
            return res.status(400).json({ error: "formName is required" });
        if (payload === undefined)
            return res.status(400).json({ error: "payload is required" });

        const def = await findFormDefinitionByName(req, formName);
        if (!def)
            return res.status(404).json({ error: "Form definition not found" });

        const tf = resolveWriteTenantId(req);
        const conditions = [
            eq(formEntries.id, entryId),
            eq(formEntries.formDefinitionId, def.id),
        ];
        if (tf != null) conditions.push(eq(formEntries.tenantId, tf));

        const [existing] = await db
            .select()
            .from(formEntries)
            .where(and(...conditions))
            .limit(1);

        if (!existing)
            return res.status(404).json({ error: "Entry not found" });

        const [updated] = await db
            .update(formEntries)
            .set({
                payload,
                updatedAt: new Date(),
            })
            .where(eq(formEntries.id, entryId))
            .returning();

        const [u] = await db
            .select()
            .from(users)
            .where(eq(users.id, req.user.id))
            .limit(1);

        res.json({ success: true, data: mapFormEntry(updated, u) });
    } catch (error) {
        console.error("updateFormEntry", error);
        res.status(500).json({ error: "Failed to update form entry" });
    }
};

export const deleteFormEntry = async (req, res) => {
    try {
        const entryId = parseUuid(req.params.id);
        const formName = req.query.formName;
        if (!entryId) return res.status(400).json({ error: "Invalid id" });
        if (!formName)
            return res
                .status(400)
                .json({ error: "formName query is required" });

        const def = await findFormDefinitionByName(req, formName);
        if (!def)
            return res.status(404).json({ error: "Form definition not found" });

        const tf = resolveWriteTenantId(req);
        const conditions = [
            eq(formEntries.id, entryId),
            eq(formEntries.formDefinitionId, def.id),
        ];
        if (tf != null) conditions.push(eq(formEntries.tenantId, tf));

        const del = await db
            .delete(formEntries)
            .where(and(...conditions))
            .returning({ id: formEntries.id });

        if (!del.length)
            return res.status(404).json({ error: "Entry not found" });

        res.json({ success: true, data: { id: entryId } });
    } catch (error) {
        console.error("deleteFormEntry", error);
        res.status(500).json({ error: "Failed to delete form entry" });
    }
};
