import { db } from "../../models/db.js";
import { auditLogs } from "../../models/schema.js";
import { eq, desc } from "drizzle-orm";

/** Audit resource types - use these when calling logAudit */
export const AuditResourceType = Object.freeze({
    AUTH: "auth",
    USER: "user",
    TENANT: "tenant",
    ROLE: "role",
    PERMISSION: "permission",
    MODULE: "module",
    SYSTEM: "system",
});

export const logAudit = async ({ userId, tenantId, action, resourceType, resourceId, details, ipAddress }) => {
    try {
        await db.insert(auditLogs).values({
            userId: userId || null,
            tenantId: tenantId || null,
            action,
            resourceType: resourceType || null,
            resourceId: resourceId || null,
            details: details ? JSON.stringify(details) : null,
            ipAddress: ipAddress || null,
            timestamp: new Date(), // Explicit UTC - ensures correct time regardless of DB server timezone
        });
    } catch (error) {
        console.error("Audit logging failed:", error.message);
    }
};

export const getAuditLogs = async (filters = {}) => {
    try {
        let query = db.select().from(auditLogs);

        if (filters.userId) {
            query = query.where(eq(auditLogs.userId, filters.userId));
        }

        if (filters.tenantId) {
            query = query.where(eq(auditLogs.tenantId, filters.tenantId));
        }

        if (filters.action) {
            query = query.where(eq(auditLogs.action, filters.action));
        }

        const logs = await query.orderBy(desc(auditLogs.timestamp)).limit(filters.limit || 100);
        return logs;
    } catch (error) {
        console.error("Failed to fetch audit logs:", error.message);
        return [];
    }
};
