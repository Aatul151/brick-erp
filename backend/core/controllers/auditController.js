import { db } from "../../models/db.js";
import { auditLogs, users, tenants } from "../../models/schema.js";
import { eq, desc, sql, gte, lte } from "drizzle-orm";

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

export const getAuditLogs = async (req, res) => {
    try {
        const {
            userId,
            tenantId,
            action,
            resourceType,
            startDate,
            endDate,
            page = 1,
            limit = 50,
        } = req.query;

        const offset = (parseInt(page) - 1) * parseInt(limit);
        const isSiteAdmin = req.user.roles.some(
            (r) => r.roleName === "Site Admin",
        );

        let query = db
            .select({
                id: auditLogs.id,
                userId: auditLogs.userId,
                userName: users.fullName,
                userEmail: users.email,
                tenantId: auditLogs.tenantId,
                tenantName: tenants.name,
                action: auditLogs.action,
                resourceType: auditLogs.resourceType,
                resourceId: auditLogs.resourceId,
                details: auditLogs.details,
                ipAddress: auditLogs.ipAddress,
                timestamp: auditLogs.timestamp,
            })
            .from(auditLogs)
            .leftJoin(users, eq(auditLogs.userId, users.id))
            .leftJoin(tenants, eq(auditLogs.tenantId, tenants.id));

        const conditions = [];

        if (!isSiteAdmin) {
            conditions.push(eq(auditLogs.tenantId, req.user.tenantId));
        } else if (tenantId) {
            const tenantUuid = parseTenantUuid(tenantId);
            if (!tenantUuid)
                return res.status(400).json({ error: "Invalid tenantId" });
            conditions.push(eq(auditLogs.tenantId, tenantUuid));
        }

        if (userId) {
            conditions.push(eq(auditLogs.userId, parseInt(userId)));
        }

        if (action) {
            conditions.push(eq(auditLogs.action, action));
        }

        if (resourceType) {
            conditions.push(eq(auditLogs.resourceType, resourceType));
        }

        if (startDate) {
            const start = new Date(startDate + "T00:00:00.000Z");
            conditions.push(gte(auditLogs.timestamp, start));
        }

        if (endDate) {
            const end = new Date(endDate + "T23:59:59.999Z");
            conditions.push(lte(auditLogs.timestamp, end));
        }

        if (conditions.length > 0) {
            query = query.where(sql`${sql.join(conditions, sql` AND `)}`);
        }

        const logs = await query
            .orderBy(desc(auditLogs.timestamp))
            .limit(parseInt(limit))
            .offset(offset);

        let countQuery = db.select({ count: sql`count(*)` }).from(auditLogs);
        if (conditions.length > 0) {
            countQuery = countQuery.where(
                sql`${sql.join(conditions, sql` AND `)}`,
            );
        }
        const [{ count }] = await countQuery;

        res.json({
            logs,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: parseInt(count),
                totalPages: Math.ceil(parseInt(count) / parseInt(limit)),
            },
        });
    } catch (error) {
        console.error("Get audit logs error:", error);
        res.status(500).json({ error: "Failed to fetch audit logs" });
    }
};

export const getAuditLogStats = async (req, res) => {
    try {
        const isSiteAdmin = req.user.roles.some(
            (r) => r.roleName === "Site Admin",
        );

        let query = db
            .select({
                action: auditLogs.action,
                count: sql`count(*)`,
            })
            .from(auditLogs);

        if (!isSiteAdmin) {
            query = query.where(eq(auditLogs.tenantId, req.user.tenantId));
        }

        const stats = await query
            .groupBy(auditLogs.action)
            .orderBy(desc(sql`count(*)`));

        res.json(stats);
    } catch (error) {
        console.error("Get audit log stats error:", error);
        res.status(500).json({ error: "Failed to fetch audit log statistics" });
    }
};
