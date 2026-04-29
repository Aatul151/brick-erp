import { db } from "../../../models/db.js";
import { formDefinitions } from "../models/formStudioSchema.js";
import { eq, and } from "drizzle-orm";
import { isSiteAdmin } from "./tenantScope.js";

function parseTenantUuid(value) {
    if (value == null || value === "") return null;
    const tenantId = String(value).trim();
    if (
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
            tenantId,
        )
    ) {
        return null;
    }
    return tenantId;
}

const selectShape = {
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
};
const FORM_TYPE_MASTER = "master_form";

async function selectById(id) {
    const [row] = await db
        .select(selectShape)
        .from(formDefinitions)
        .where(eq(formDefinitions.id, id))
        .limit(1);
    return row || null;
}

/**
 * Resolve form definition by system name for the current user.
 * Site Admin without tenantId: allowed only when exactly one form matches the name globally.
 */
export async function findFormDefinitionByName(req, formName) {
    const decoded = decodeURIComponent(formName || "").trim();
    if (!decoded) return null;

    if (isSiteAdmin(req)) {
        const tidRaw = req.query.tenantId ?? req.body?.tenantId;
        if (tidRaw != null && tidRaw !== "") {
            const tid = parseTenantUuid(tidRaw);
            if (!tid) return null;
            const [row] = await db
                .select(selectShape)
                .from(formDefinitions)
                .where(
                    and(
                        eq(formDefinitions.name, decoded),
                        eq(formDefinitions.tenantId, tid),
                    ),
                )
                .limit(1);
            return row || null;
        }

        const matches = await db
            .select({ id: formDefinitions.id })
            .from(formDefinitions)
            .where(eq(formDefinitions.name, decoded));

        if (matches.length === 0) return null;
        if (matches.length > 1) return null;
        return selectById(matches[0].id);
    }

    if (!req.user.tenantId) return null;

    const [row] = await db
        .select(selectShape)
        .from(formDefinitions)
        .where(
            and(
                eq(formDefinitions.name, decoded),
                eq(formDefinitions.tenantId, req.user.tenantId),
            ),
        )
        .limit(1);

    if (row) return row;

    const [masterRow] = await db
        .select(selectShape)
        .from(formDefinitions)
        .where(
            and(
                eq(formDefinitions.name, decoded),
                eq(formDefinitions.formType, FORM_TYPE_MASTER),
            ),
        )
        .limit(1);

    return masterRow || null;
}
