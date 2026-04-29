import { pgTable, serial, varchar, text, timestamp, boolean, integer, pgEnum, index, uniqueIndex, jsonb, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Enums
export const tenantStatusEnum = pgEnum("tenant_status", ["active", "suspended"]);
export const userStatusEnum = pgEnum("user_status", ["active", "inactive", "suspended"]);
export const roleScopeEnum = pgEnum("role_scope", ["global", "tenant"]);
export const permissionActionEnum = pgEnum("permission_action", ["create", "read", "update", "delete", "menu"]);

// Tenants Table
export const tenants = pgTable(
    "tenants",
    {
        id: uuid("id").defaultRandom().primaryKey(),
        name: varchar("name", {
            length: 255,
        }).notNull(),
        subdomain: varchar("subdomain", {
            length: 100,
        }).unique(),
        status: tenantStatusEnum("status").notNull().default("active"),
        themeSetting: jsonb("theme_setting"),
        settings: jsonb("settings"),
        createdAt: timestamp("created_at", {
            withTimezone: true,
        })
            .notNull()
            .defaultNow(),
        updatedAt: timestamp("updated_at", {
            withTimezone: true,
        })
            .notNull()
            .defaultNow(),
    },
    (table) => ({
        statusIdx: index("tenant_status_idx").on(table.status),
        subdomainIdx: uniqueIndex("tenant_subdomain_idx").on(table.subdomain),
    }),
);

// Users Table
export const users = pgTable(
    "users",
    {
        id: serial("id").primaryKey(),
        tenantId: uuid("tenant_id").references(() => tenants.id, {
            onDelete: "cascade",
        }),
        email: varchar("email", {
            length: 255,
        })
            .notNull()
            .unique(),
        mobile: varchar("mobile", {
            length: 20,
        }),
        passwordHash: text("password_hash").notNull(),
        fullName: varchar("full_name", {
            length: 255,
        }).notNull(),
        status: userStatusEnum("status").notNull().default("active"),
        createdAt: timestamp("created_at", {
            withTimezone: true,
        })
            .notNull()
            .defaultNow(),
        updatedAt: timestamp("updated_at", {
            withTimezone: true,
        })
            .notNull()
            .defaultNow(),
    },
    (table) => ({
        emailIdx: uniqueIndex("user_email_idx").on(table.email),
        mobileIdx: uniqueIndex("user_mobile_idx").on(table.mobile),
        tenantIdx: index("user_tenant_idx").on(table.tenantId),
        statusIdx: index("user_status_idx").on(table.status),
    }),
);

// Roles Table
export const roles = pgTable(
    "roles",
    {
        id: serial("id").primaryKey(),
        name: varchar("name", {
            length: 100,
        })
            .notNull()
            .unique(),
        description: text("description"),
        scope: roleScopeEnum("scope").notNull().default("tenant"),
        createdAt: timestamp("created_at", {
            withTimezone: true,
        })
            .notNull()
            .defaultNow(),
        updatedAt: timestamp("updated_at", {
            withTimezone: true,
        })
            .notNull()
            .defaultNow(),
    },
    (table) => ({
        nameIdx: uniqueIndex("role_name_idx").on(table.name),
        scopeIdx: index("role_scope_idx").on(table.scope),
    }),
);

// Modules Table (dynamic modules for permission system)
export const modules = pgTable(
    "modules",
    {
        id: serial("id").primaryKey(),
        name: varchar("name", {
            length: 100,
        }).notNull(),
        slug: varchar("slug", {
            length: 100,
        })
            .notNull()
            .unique(),
        icon: varchar("icon", {
            length: 50,
        }),
        description: text("description"),
        sortOrder: integer("sort_order").notNull().default(0),
        isActive: boolean("is_active").notNull().default(true),
        createdAt: timestamp("created_at", {
            withTimezone: true,
        })
            .notNull()
            .defaultNow(),
        updatedAt: timestamp("updated_at", {
            withTimezone: true,
        })
            .notNull()
            .defaultNow(),
    },
    (table) => ({
        slugIdx: uniqueIndex("module_slug_idx").on(table.slug),
        activeIdx: index("module_active_idx").on(table.isActive),
    }),
);

// Permissions Table
export const permissions = pgTable(
    "permissions",
    {
        id: serial("id").primaryKey(),
        resourceName: varchar("resource_name", {
            length: 100,
        }).notNull(),
        action: permissionActionEnum("action").notNull(),
        description: text("description"),
        createdAt: timestamp("created_at", {
            withTimezone: true,
        })
            .notNull()
            .defaultNow(),
    },
    (table) => ({
        resourceActionIdx: uniqueIndex("permission_resource_action_idx").on(table.resourceName, table.action),
    }),
);

// Role Permissions Junction Table
export const rolePermissions = pgTable(
    "role_permissions",
    {
        id: serial("id").primaryKey(),
        roleId: integer("role_id")
            .notNull()
            .references(() => roles.id, {
                onDelete: "cascade",
            }),
        permissionId: integer("permission_id")
            .notNull()
            .references(() => permissions.id, {
                onDelete: "cascade",
            }),
        createdAt: timestamp("created_at", {
            withTimezone: true,
        })
            .notNull()
            .defaultNow(),
    },
    (table) => ({
        rolePermissionIdx: uniqueIndex("role_permission_idx").on(table.roleId, table.permissionId),
        roleIdx: index("rp_role_idx").on(table.roleId),
        permissionIdx: index("rp_permission_idx").on(table.permissionId),
    }),
);

// User Roles Junction Table
export const userRoles = pgTable(
    "user_roles",
    {
        id: serial("id").primaryKey(),
        userId: integer("user_id")
            .notNull()
            .references(() => users.id, {
                onDelete: "cascade",
            }),
        roleId: integer("role_id")
            .notNull()
            .references(() => roles.id, {
                onDelete: "cascade",
            }),
        createdAt: timestamp("created_at", {
            withTimezone: true,
        })
            .notNull()
            .defaultNow(),
    },
    (table) => ({
        userRoleIdx: uniqueIndex("user_role_idx").on(table.userId, table.roleId),
        userIdx: index("ur_user_idx").on(table.userId),
        roleIdx: index("ur_role_idx").on(table.roleId),
    }),
);

// Audit Logs Table
export const auditLogs = pgTable(
    "audit_logs",
    {
        id: serial("id").primaryKey(),
        userId: integer("user_id").references(() => users.id, {
            onDelete: "set null",
        }),
        tenantId: uuid("tenant_id").references(() => tenants.id, {
            onDelete: "set null",
        }),
        action: varchar("action", {
            length: 100,
        }).notNull(),
        resourceType: varchar("resource_type", {
            length: 100,
        }),
        resourceId: varchar("resource_id", {
            length: 100,
        }),
        details: text("details"),
        ipAddress: varchar("ip_address", {
            length: 45,
        }),
        timestamp: timestamp("timestamp", {
            withTimezone: true,
        })
            .notNull()
            .defaultNow(),
    },
    (table) => ({
        userIdx: index("audit_user_idx").on(table.userId),
        tenantIdx: index("audit_tenant_idx").on(table.tenantId),
        timestampIdx: index("audit_timestamp_idx").on(table.timestamp),
        actionIdx: index("audit_action_idx").on(table.action),
    }),
);

// Password Reset Tokens Table
export const passwordResetTokens = pgTable(
    "password_reset_tokens",
    {
        id: serial("id").primaryKey(),
        userId: integer("user_id")
            .notNull()
            .references(() => users.id, {
                onDelete: "cascade",
            }),
        token: varchar("token", {
            length: 255,
        })
            .notNull()
            .unique(),
        expiresAt: timestamp("expires_at", {
            withTimezone: true,
        }).notNull(),
        usedAt: timestamp("used_at", {
            withTimezone: true,
        }),
        createdAt: timestamp("created_at", {
            withTimezone: true,
        })
            .notNull()
            .defaultNow(),
    },
    (table) => ({
        tokenIdx: uniqueIndex("password_reset_token_idx").on(table.token),
        userIdx: index("password_reset_user_idx").on(table.userId),
    }),
);

// Refresh Tokens Table
export const refreshTokens = pgTable(
    "refresh_tokens",
    {
        id: serial("id").primaryKey(),
        userId: integer("user_id")
            .notNull()
            .references(() => users.id, {
                onDelete: "cascade",
            }),
        token: text("token").notNull().unique(),
        expiresAt: timestamp("expires_at", {
            withTimezone: true,
        }).notNull(),
        revokedAt: timestamp("revoked_at", {
            withTimezone: true,
        }),
        createdAt: timestamp("created_at", {
            withTimezone: true,
        })
            .notNull()
            .defaultNow(),
    },
    (table) => ({
        tokenIdx: uniqueIndex("refresh_token_idx").on(table.token),
        userIdx: index("refresh_token_user_idx").on(table.userId),
    }),
);

// Relations
export const tenantsRelations = relations(tenants, ({ many }) => ({
    users: many(users),
    auditLogs: many(auditLogs),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
    tenant: one(tenants, {
        fields: [users.tenantId],
        references: [tenants.id],
    }),
    userRoles: many(userRoles),
    auditLogs: many(auditLogs),
    passwordResetTokens: many(passwordResetTokens),
    refreshTokens: many(refreshTokens),
}));

export const rolesRelations = relations(roles, ({ many }) => ({
    rolePermissions: many(rolePermissions),
    userRoles: many(userRoles),
}));

export const modulesRelations = relations(modules, () => ({}));

export const permissionsRelations = relations(permissions, ({ many }) => ({
    rolePermissions: many(rolePermissions),
}));

export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
    role: one(roles, {
        fields: [rolePermissions.roleId],
        references: [roles.id],
    }),
    permission: one(permissions, {
        fields: [rolePermissions.permissionId],
        references: [permissions.id],
    }),
}));

export const userRolesRelations = relations(userRoles, ({ one }) => ({
    user: one(users, {
        fields: [userRoles.userId],
        references: [users.id],
    }),
    role: one(roles, {
        fields: [userRoles.roleId],
        references: [roles.id],
    }),
}));
