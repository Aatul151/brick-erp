import { db } from "../../../models/db.js";
import { formDefinitions } from "../models/formStudioSchema.js";
import { eq, and } from "drizzle-orm";

export const FORM_TYPE = {
    SYSTEM: "system",
    CUSTOM: "custom",
    MASTER_FORM: "master_form",
};

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

export async function findFormDefinitionByName(req, formName) {
    const decoded = decodeURIComponent(formName || "").trim();
    if (!decoded) return null;

    const [row] = await db
        .select(selectShape)
        .from(formDefinitions)
        .where(and(eq(formDefinitions.name, decoded), eq(formDefinitions.tenantId, req.user.tenantId)))
        .limit(1);

    if (row) return row;

    const [masterRow] = await db
        .select(selectShape)
        .from(formDefinitions)
        .where(and(eq(formDefinitions.name, decoded), eq(formDefinitions.formType, FORM_TYPE.MASTER_FORM)))
        .limit(1);

    return masterRow || null;
}
