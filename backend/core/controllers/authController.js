import { db } from "../../models/db.js";
import { users, refreshTokens, passwordResetTokens, userRoles, roles, rolePermissions, permissions, tenants } from "../../models/schema.js";
import { eq, and, inArray } from "drizzle-orm";
import { hashPassword, verifyPassword, generateRandomToken } from "../../utils/password.js";
import { generateAccessToken, generateRefreshToken, verifyToken } from "../../utils/jwt.js";
import { sendPasswordResetEmail } from "../services/emailService.js";
import { logAudit, AuditResourceType } from "../services/auditService.js";

const SITE_ADMIN_TENANT_SUBDOMAIN = "system";

/** Resolve login identifier from body (after loginSchema validation). */
function resolveLoginLookup(body) {
    const digits = (s) => String(s ?? "").replace(/\D/g, "");
    const fromMobileField = digits(body.mobile);
    if (fromMobileField.length >= 10) {
        return {
            kind: "mobile",
            value: fromMobileField,
        };
    }
    const primary = String(body.email ?? "").trim();
    if (primary.includes("@")) {
        return {
            kind: "email",
            value: primary.toLowerCase(),
        };
    }
    const fromEmailField = digits(primary);
    if (fromEmailField.length >= 10) {
        return {
            kind: "mobile",
            value: fromEmailField,
        };
    }
    return {
        kind: "email",
        value: primary.toLowerCase(),
    };
}

export const login = async (req, res) => {
    try {
        const { password } = req.body;
        const lookup = resolveLoginLookup(req.body);

        const user =
            lookup.kind === "email" ? await db.select().from(users).where(eq(users.email, lookup.value)).limit(1) : await db.select().from(users).where(eq(users.mobile, lookup.value)).limit(1);

        if (!user.length) {
            await logAudit({
                action: "LOGIN_FAILED",
                resourceType: AuditResourceType.AUTH,
                details: {
                    loginMethod: lookup.kind,
                    ...(lookup.kind === "email"
                        ? {
                              email: lookup.value,
                          }
                        : {}),
                    reason: "User not found",
                },
                ipAddress: req.ip,
            });
            return res.status(401).json({
                error: "Invalid email, mobile, or password",
            });
        }

        if (user[0].status !== "active") {
            await logAudit({
                userId: user[0].id,
                tenantId: user[0].tenantId,
                action: "LOGIN_FAILED",
                resourceType: AuditResourceType.AUTH,
                details: {
                    loginMethod: lookup.kind,
                    email: user[0].email,
                    reason: "User inactive",
                },
                ipAddress: req.ip,
            });
            return res.status(401).json({
                error: "Account is inactive or suspended",
            });
        }

        const isValidPassword = await verifyPassword(password, user[0].passwordHash);

        if (!isValidPassword) {
            await logAudit({
                userId: user[0].id,
                tenantId: user[0].tenantId,
                action: "LOGIN_FAILED",
                resourceType: AuditResourceType.AUTH,
                details: {
                    loginMethod: lookup.kind,
                    email: user[0].email,
                    reason: "Invalid password",
                },
                ipAddress: req.ip,
            });
            return res.status(401).json({
                error: "Invalid email, mobile, or password",
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
            .where(eq(userRoles.userId, user[0].id));

        const isSiteAdmin = userRolesData.some((r) => r.roleName === "Site Admin");
        if (user[0].tenantId && !isSiteAdmin) {
            const [protectedTenant] = await db
                .select({
                    id: tenants.id,
                })
                .from(tenants)
                .where(and(eq(tenants.id, user[0].tenantId), eq(tenants.subdomain, SITE_ADMIN_TENANT_SUBDOMAIN)))
                .limit(1);
            if (protectedTenant) {
                await logAudit({
                    userId: user[0].id,
                    tenantId: user[0].tenantId,
                    action: "LOGIN_FAILED",
                    resourceType: AuditResourceType.AUTH,
                    details: {
                        loginMethod: lookup.kind,
                        email: user[0].email,
                        reason: "Protected tenant access denied",
                    },
                    ipAddress: req.ip,
                });
                return res.status(403).json({
                    error: "Access denied to protected system tenant",
                });
            }
        }

        const tokenPayload = {
            userId: user[0].id,
            email: user[0].email,
            tenantId: user[0].tenantId,
            roles: userRolesData.map((r) => r.roleName),
        };

        const accessToken = generateAccessToken(tokenPayload);
        const refreshTokenValue = generateRefreshToken(tokenPayload);

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        await db.insert(refreshTokens).values({
            userId: user[0].id,
            token: refreshTokenValue,
            expiresAt,
        });

        await logAudit({
            userId: user[0].id,
            tenantId: user[0].tenantId,
            action: "LOGIN_SUCCESS",
            resourceType: AuditResourceType.AUTH,
            ipAddress: req.ip,
        });

        // const isSiteAdmin = userRolesData.some(r => r.roleName === 'Site Admin');
        let userPermissions = [];
        if (userRolesData.length > 0) {
            const roleIds = userRolesData.map((r) => r.roleId);
            const perms = await db
                .select({
                    resourceName: permissions.resourceName,
                    action: permissions.action,
                })
                .from(rolePermissions)
                .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
                .where(inArray(rolePermissions.roleId, roleIds));
            const seen = new Set();
            userPermissions = perms.filter((p) => {
                const key = `${p.resourceName}_${p.action}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });
        }

        let tenantName = null;
        let tenantThemeSetting = null;
        if (user[0].tenantId) {
            const [tenant] = await db
                .select({
                    name: tenants.name,
                    themeSetting: tenants.themeSetting,
                })
                .from(tenants)
                .where(eq(tenants.id, user[0].tenantId))
                .limit(1);
            tenantName = tenant?.name || null;
            tenantThemeSetting = tenant?.themeSetting || null;
        }

        res.json({
            accessToken,
            refreshToken: refreshTokenValue,
            user: {
                id: user[0].id,
                email: user[0].email,
                mobile: user[0].mobile ?? null,
                fullName: user[0].fullName,
                tenantId: user[0].tenantId,
                status: user[0].status,
                createdAt: user[0].createdAt,
                updatedAt: user[0].updatedAt,
                tenantName,
                tenantThemeSetting,
                roles: userRolesData,
                permissions: userPermissions,
            },
        });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({
            error: "Login failed",
        });
    }
};

export const logout = async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith("Bearer ")) {
            const token = authHeader.substring(7);
            const decoded = verifyToken(token);

            if (decoded) {
                await db
                    .update(refreshTokens)
                    .set({
                        revokedAt: new Date(),
                    })
                    .where(eq(refreshTokens.userId, decoded.userId));

                await logAudit({
                    userId: decoded.userId,
                    tenantId: decoded.tenantId,
                    action: "LOGOUT",
                    resourceType: AuditResourceType.AUTH,
                    ipAddress: req.ip,
                });
            }
        }

        res.json({
            message: "Logged out successfully",
        });
    } catch (error) {
        console.error("Logout error:", error);
        res.status(500).json({
            error: "Logout failed",
        });
    }
};

export const refreshAccessToken = async (req, res) => {
    try {
        const { refreshToken: token } = req.body;

        if (!token) {
            return res.status(400).json({
                error: "Refresh token required",
            });
        }

        const decoded = verifyToken(token);
        if (!decoded) {
            return res.status(401).json({
                error: "Invalid refresh token",
            });
        }

        const storedToken = await db
            .select()
            .from(refreshTokens)
            .where(and(eq(refreshTokens.token, token), eq(refreshTokens.userId, decoded.userId)))
            .limit(1);

        if (!storedToken.length || storedToken[0].revokedAt) {
            return res.status(401).json({
                error: "Refresh token revoked or not found",
            });
        }

        if (new Date() > new Date(storedToken[0].expiresAt)) {
            return res.status(401).json({
                error: "Refresh token expired",
            });
        }

        const user = await db.select().from(users).where(eq(users.id, decoded.userId)).limit(1);

        if (!user.length || user[0].status !== "active") {
            return res.status(401).json({
                error: "User not found or inactive",
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
            .where(eq(userRoles.userId, user[0].id));

        const isSiteAdmin = userRolesData.some((r) => r.roleName === "Site Admin");
        if (user[0].tenantId && !isSiteAdmin) {
            const [protectedTenant] = await db
                .select({
                    id: tenants.id,
                })
                .from(tenants)
                .where(and(eq(tenants.id, user[0].tenantId), eq(tenants.subdomain, SITE_ADMIN_TENANT_SUBDOMAIN)))
                .limit(1);
            if (protectedTenant) {
                return res.status(403).json({
                    error: "Access denied to protected system tenant",
                });
            }
        }

        const tokenPayload = {
            userId: user[0].id,
            email: user[0].email,
            tenantId: user[0].tenantId,
            roles: userRolesData.map((r) => r.roleName),
        };

        const accessToken = generateAccessToken(tokenPayload);

        await logAudit({
            userId: decoded.userId,
            tenantId: decoded.tenantId,
            action: "TOKEN_REFRESHED",
            resourceType: AuditResourceType.AUTH,
            ipAddress: req.ip,
        });

        res.json({
            accessToken,
        });
    } catch (error) {
        console.error("Token refresh error:", error);
        res.status(500).json({
            error: "Token refresh failed",
        });
    }
};

export const requestPasswordReset = async (req, res) => {
    try {
        const { email } = req.body;

        const user = await db.select().from(users).where(eq(users.email, email)).limit(1);

        if (!user.length) {
            return res.json({
                message: "If the email exists, a reset link has been sent",
            });
        }

        const token = generateRandomToken();
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 1);

        await db.insert(passwordResetTokens).values({
            userId: user[0].id,
            token,
            expiresAt,
        });

        await sendPasswordResetEmail(user[0].email, token, user[0].fullName);

        await logAudit({
            userId: user[0].id,
            tenantId: user[0].tenantId,
            action: "PASSWORD_RESET_REQUESTED",
            resourceType: AuditResourceType.AUTH,
            ipAddress: req.ip,
        });

        res.json({
            message: "If the email exists, a reset link has been sent",
        });
    } catch (error) {
        console.error("Password reset request error:", error);
        res.status(500).json({
            error: "Password reset request failed",
        });
    }
};

export const resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        const resetToken = await db
            .select()
            .from(passwordResetTokens)
            .where(and(eq(passwordResetTokens.token, token), eq(passwordResetTokens.usedAt, null)))
            .limit(1);

        if (!resetToken.length) {
            return res.status(400).json({
                error: "Invalid or already used reset token",
            });
        }

        if (new Date() > new Date(resetToken[0].expiresAt)) {
            return res.status(400).json({
                error: "Reset token has expired",
            });
        }

        const hashedPassword = await hashPassword(newPassword);

        await db
            .update(users)
            .set({
                passwordHash: hashedPassword,
                updatedAt: new Date(),
            })
            .where(eq(users.id, resetToken[0].userId));

        await db
            .update(passwordResetTokens)
            .set({
                usedAt: new Date(),
            })
            .where(eq(passwordResetTokens.id, resetToken[0].id));

        const user = await db.select().from(users).where(eq(users.id, resetToken[0].userId)).limit(1);

        await logAudit({
            userId: resetToken[0].userId,
            tenantId: user[0].tenantId,
            action: "PASSWORD_RESET_COMPLETED",
            resourceType: AuditResourceType.AUTH,
            ipAddress: req.ip,
        });

        res.json({
            message: "Password reset successfully",
        });
    } catch (error) {
        console.error("Password reset error:", error);
        res.status(500).json({
            error: "Password reset failed",
        });
    }
};

export const getProfile = async (req, res) => {
    try {
        const userData = await db
            .select({
                id: users.id,
                email: users.email,
                mobile: users.mobile,
                fullName: users.fullName,
                tenantId: users.tenantId,
                tenantName: tenants.name,
                tenantThemeSetting: tenants.themeSetting,
                status: users.status,
                createdAt: users.createdAt,
            })
            .from(users)
            .leftJoin(tenants, eq(users.tenantId, tenants.id))
            .where(eq(users.id, req.user.id))
            .limit(1);

        if (!userData.length) {
            return res.status(404).json({
                error: "User not found",
            });
        }

        const user = userData[0];
        const userRolesData = await db
            .select({
                roleId: roles.id,
                roleName: roles.name,
                roleScope: roles.scope,
            })
            .from(userRoles)
            .innerJoin(roles, eq(userRoles.roleId, roles.id))
            .where(eq(userRoles.userId, user.id));

        let userPermissions = [];
        if (userRolesData.length > 0) {
            const roleIds = userRolesData.map((r) => r.roleId);
            const perms = await db
                .select({
                    resourceName: permissions.resourceName,
                    action: permissions.action,
                })
                .from(rolePermissions)
                .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
                .where(inArray(rolePermissions.roleId, roleIds));
            const seen = new Set();
            userPermissions = perms.filter((p) => {
                const key = `${p.resourceName}_${p.action}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });
        }

        res.json({
            id: user.id,
            email: user.email,
            mobile: user.mobile ?? null,
            fullName: user.fullName,
            tenantId: user.tenantId,
            tenantName: user.tenantName || null,
            tenantThemeSetting: user.tenantThemeSetting || null,
            status: user.status,
            createdAt: user.createdAt,
            roles: userRolesData,
            permissions: userPermissions,
        });
    } catch (error) {
        console.error("Get profile error:", error);
        res.status(500).json({
            error: "Failed to fetch profile",
        });
    }
};

export const updateProfile = async (req, res) => {
    try {
        const { fullName, email, mobile, currentPassword, newPassword } = req.body;
        const updates = {};

        if (fullName) {
            updates.fullName = fullName;
        }

        if (email && email !== req.user.email) {
            const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
            if (existingUser.length) {
                return res.status(400).json({
                    error: "Email already in use",
                });
            }
            updates.email = email;
        }

        if (mobile !== undefined) {
            if (mobile === null || String(mobile).trim() === "") {
                updates.mobile = null;
            } else {
                const mobileDigits = String(mobile).replace(/\D/g, "");
                const mobileTaken = await db.select().from(users).where(eq(users.mobile, mobileDigits)).limit(1);
                if (mobileTaken.length && mobileTaken[0].id !== req.user.id) {
                    return res.status(400).json({
                        error: "Mobile number already in use",
                    });
                }
                updates.mobile = mobileDigits;
            }
        }

        if (newPassword) {
            if (!currentPassword) {
                return res.status(400).json({
                    error: "Current password required to set new password",
                });
            }

            const user = await db.select().from(users).where(eq(users.id, req.user.id)).limit(1);
            const isValidPassword = await verifyPassword(currentPassword, user[0].passwordHash);

            if (!isValidPassword) {
                return res.status(400).json({
                    error: "Current password is incorrect",
                });
            }

            updates.passwordHash = await hashPassword(newPassword);
        }

        if (Object.keys(updates).length > 0) {
            updates.updatedAt = new Date();
            await db.update(users).set(updates).where(eq(users.id, req.user.id));

            await logAudit({
                userId: req.user.id,
                tenantId: req.user.tenantId,
                action: "PROFILE_UPDATED",
                resourceType: AuditResourceType.USER,
                resourceId: req.user.id,
                details: {
                    fields: Object.keys(updates),
                },
                ipAddress: req.ip,
            });
        }

        res.json({
            message: "Profile updated successfully",
        });
    } catch (error) {
        console.error("Update profile error:", error);
        res.status(500).json({
            error: "Failed to update profile",
        });
    }
};
