import { FORM_TYPE } from "./formStudioQueries.js";

export function mapFormDefinition(row) {
    if (!row) return null;

    return {
        id: row.id,
        tenantId: row.tenantId,
        title: row.title,
        name: row.name,
        formType: row.formType ?? FORM_TYPE.CUSTOM,
        collectionName: row.collectionName,
        sections: row.sections ?? [],
        settings: row.settings ?? {},
        createdBy: row.createdBy,
        updatedBy: row.updatedBy ?? null,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
}

export function mapFormEntry(row) {
    if (!row) return null;
    const createdBy = row.createdBy ? { id: row.createdBy, name: row.creatorName ?? "", email: row.creatorEmail ?? "" } : null;
    const updatedBy = row.updatedBy ? { id: row.updatedBy, name: row.updaterName ?? "", email: row.updaterEmail ?? "" } : null;
    return {
        id: row.id,
        payload: row.payload ?? {},
        createdBy: createdBy,
        updatedBy: updatedBy,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
}
