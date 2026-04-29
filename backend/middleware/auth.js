import { verifyToken } from "../utils/jwt.js";
import { db } from "../models/db.js";
import { users, userRoles, roles, rolePermissions, permissions, tenants } from "../models/schema.js";
import { eq, inArray, and } from "drizzle-orm";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseTenantUuid(value) {
    if (value == null || value === "") return null;
    const tenantId = String(value).trim();
    return UUID_REGEX.test(tenantId) ? tenantId : null;
}

export const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(403).json({
                error: "No token provided",
            });
        }

        const token = authHeader.substring(7);
        const decoded = verifyToken(token);

        if (!decoded) {
            return res.status(403).json({
                error: "Invalid or expired token",
            });
        }

        const user = await db.select().from(users).where(eq(users.id, decoded.userId)).limit(1);
        if (!user.length) {
            return res.status(403).json({
                error: "User not found",
            });
        }
        const loginUser = user[0];

        if (loginUser.status !== "active") {
            return res.status(403).json({
                error: "User is inactive",
            });
        }

        if (!loginUser.tenantId) {
            return res.status(403).json({
                error: "User is not associated with a tenant",
            });
        }

        if (loginUser.tenantId !== decoded.tenantId) {
            return res.status(403).json({
                error: "User is not associated with the correct tenant",
            });
        }

        const userRolesData = await db
            .select({
                roleId: roles.id,
                roleName: roles.name,
                roleScope: roles.scope,
            })
            .from(userRoles)
            .innerJoin(roles, eq(userRoles.roleId, roles.id))
            .where(eq(userRoles.userId, loginUser.id));

        req.user = {
            ...loginUser,
            roles: userRolesData,
        };

        //#region  Validate Non Site Admin Access to System Tenant
        const isSiteAdmin = userRolesData.some((r) => r.roleName === "Site Admin");
        if (!isSiteAdmin) {
            const [protectedTenant] = await db
                .select({
                    id: tenants.id,
                })
                .from(tenants)
                .where(and(eq(tenants.id, req.user.tenantId), eq(tenants.subdomain, "system")))
                .limit(1);
            if (protectedTenant) {
                await logAudit({
                    userId: req.user.id,
                    tenantId: req.user.tenantId,
                    action: "PROTECTED_TENANT_ACCESS_BLOCKED",
                    resourceType: "tenant",
                    resourceId: req.user.tenantId,
                    details: {
                        reason: "Protected tenant access blocked",
                    },
                    ipAddress: req.ip,
                });
                return res.status(403).json({
                    error: "Access denied to protected system tenant",
                });
            }
        }
        //#endregion

        next();
    } catch (error) {
        console.error("Authentication error:", error);
        return res.status(403).json({
            error: "Authentication failed",
        });
    }
};

export const requireRole = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(403).json({
                error: "Authentication required",
            });
        }

        const userRoleNames = req.user.roles.map((r) => r.roleName);
        const hasRole = allowedRoles.some((role) => userRoleNames.includes(role));

        if (!hasRole) {
            return res.status(403).json({
                error: "Insufficient permissions",
            });
        }

        next();
    };
};

export const requirePermission = (resourceName, action) => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(403).json({
                    error: "Authentication required",
                });
            }

            const userRoleIds = req.user.roles.map((r) => r.roleId);
            if (userRoleIds.length === 0) {
                return res.status(403).json({
                    error: "Insufficient permissions for this action",
                });
            }

            const userPermissions = await db
                .select({
                    resourceName: permissions.resourceName,
                    action: permissions.action,
                })
                .from(rolePermissions)
                .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
                .where(inArray(rolePermissions.roleId, userRoleIds));

            const hasPermission = userPermissions.some((p) => p.resourceName === resourceName && p.action === action);

            if (!hasPermission) {
                return res.status(403).json({
                    error: "Insufficient permissions for this action",
                });
            }

            next();
        } catch (error) {
            console.error("Permission check error:", error);
            return res.status(500).json({
                error: "Permission check failed",
            });
        }
    };
};

export const requireTenantAccess = (req, res, next) => {
    if (!req.user) {
        return res.status(403).json({
            error: "Authentication required",
        });
    }

    const isSiteAdmin = req.user.roles.some((r) => r.roleName === "Site Admin");

    if (isSiteAdmin) {
        return next();
    }

    const requestedTenantId = parseTenantUuid(req.params.tenantId || req.body.tenantId || req.query.tenantId);

    if (requestedTenantId && req.user.tenantId !== requestedTenantId) {
        return res.status(403).json({
            error: "Access denied to this tenant",
        });
    }

    next();
};
