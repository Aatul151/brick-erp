import { eq } from "drizzle-orm";

export const UUID_PARAM = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const tenantWhere = (column, req) => {
    return eq(column, req.user.tenantId);
}

export const parseEntryDate = (value, isEnd = false) => {
    if (!value || typeof value !== "string") return null;
    const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return null;
    const d = new Date(`${m[1]}-${m[2]}-${m[3]}T${isEnd ? '23:59:59.999Z' : '00:00:00.000Z'}`);
    return Number.isNaN(d.getTime()) ? null : d;
}