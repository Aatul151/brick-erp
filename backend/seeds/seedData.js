import { db } from "../models/db.js";
import {
    tenants,
    users,
    roles,
    permissions,
    rolePermissions,
    userRoles,
    auditLogs,
    modules,
} from "../models/schema.js";
import { AuditResourceType } from "../core/services/auditService.js";
import { hashPassword } from "../utils/password.js";
import { eq, and } from "drizzle-orm";

const SITE_ADMIN_TENANT_SUBDOMAIN = "system";
const SITE_ADMIN_TENANT_NAME = "System Administration";

async function ensureSiteAdminTenantAndUserBinding() {
    let [systemTenant] = await db
        .select()
        .from(tenants)
        .where(eq(tenants.subdomain, SITE_ADMIN_TENANT_SUBDOMAIN))
        .limit(1);

    if (!systemTenant) {
        [systemTenant] = await db
            .insert(tenants)
            .values({
                name: SITE_ADMIN_TENANT_NAME,
                subdomain: SITE_ADMIN_TENANT_SUBDOMAIN,
                status: "active",
            })
            .returning();
    }

    const siteAdminUsers = await db
        .select({
            id: users.id,
            tenantId: users.tenantId,
        })
        .from(users)
        .innerJoin(userRoles, eq(userRoles.userId, users.id))
        .innerJoin(roles, eq(userRoles.roleId, roles.id))
        .where(eq(roles.name, "Site Admin"));

    for (const adminUser of siteAdminUsers) {
        if (adminUser.tenantId !== systemTenant.id) {
            await db
                .update(users)
                .set({ tenantId: systemTenant.id, updatedAt: new Date() })
                .where(eq(users.id, adminUser.id));
        }
    }

    return systemTenant;
}

const permissionData = [
    {
        resourceName: "tenants",
        action: "menu",
        description: "Show tenants in menu",
    },
    {
        resourceName: "tenants",
        action: "create",
        description: "Create new tenants",
    },
    {
        resourceName: "tenants",
        action: "read",
        description: "View tenant information",
    },
    {
        resourceName: "tenants",
        action: "update",
        description: "Update tenant information",
    },
    {
        resourceName: "tenants",
        action: "delete",
        description: "Delete tenants",
    },
    {
        resourceName: "users",
        action: "menu",
        description: "Show users in menu",
    },
    {
        resourceName: "users",
        action: "create",
        description: "Create new users",
    },
    {
        resourceName: "users",
        action: "read",
        description: "View user information",
    },
    {
        resourceName: "users",
        action: "update",
        description: "Update user information",
    },
    { resourceName: "users", action: "delete", description: "Delete users" },
    {
        resourceName: "roles",
        action: "menu",
        description: "Show roles in menu",
    },
    {
        resourceName: "roles",
        action: "create",
        description: "Create new roles",
    },
    {
        resourceName: "roles",
        action: "read",
        description: "View role information",
    },
    {
        resourceName: "roles",
        action: "update",
        description: "Update role information",
    },
    { resourceName: "roles", action: "delete", description: "Delete roles" },
    {
        resourceName: "permissions",
        action: "menu",
        description: "Show permissions in menu",
    },
    {
        resourceName: "permissions",
        action: "create",
        description: "Create new permissions",
    },
    {
        resourceName: "permissions",
        action: "read",
        description: "View permission information",
    },
    {
        resourceName: "permissions",
        action: "update",
        description: "Update permission information",
    },
    {
        resourceName: "permissions",
        action: "delete",
        description: "Delete permissions",
    },
    {
        resourceName: "modules",
        action: "menu",
        description: "Show modules in menu",
    },
    {
        resourceName: "modules",
        action: "create",
        description: "Create new modules",
    },
    {
        resourceName: "modules",
        action: "read",
        description: "View module information",
    },
    {
        resourceName: "modules",
        action: "update",
        description: "Update module information",
    },
    {
        resourceName: "modules",
        action: "delete",
        description: "Delete modules",
    },
    {
        resourceName: "audit_logs",
        action: "menu",
        description: "Show audit logs in menu",
    },
    {
        resourceName: "audit_logs",
        action: "read",
        description: "View audit logs",
    },
    {
        resourceName: "settings",
        action: "menu",
        description: "Show settings in menu",
    },
    { resourceName: "settings", action: "read", description: "View settings" },
    {
        resourceName: "settings",
        action: "update",
        description: "Update settings",
    },
    {
        resourceName: "form_studio",
        action: "menu",
        description: "Show Form Studio in menu",
    },
    {
        resourceName: "form_studio",
        action: "create",
        description: "Create forms and entries",
    },
    {
        resourceName: "form_studio",
        action: "read",
        description: "View forms and entries",
    },
    {
        resourceName: "form_studio",
        action: "update",
        description: "Update forms and entries",
    },
    {
        resourceName: "form_studio",
        action: "delete",
        description: "Delete forms and entries",
    },
];

async function ensureFormStudioApp(
    db,
    permissionsTable,
    rolePermissions,
    roles,
) {
    const formStudioPermissionData = permissionData.filter(
        (p) => p.resourceName === "form_studio",
    );
    for (const perm of formStudioPermissionData) {
        const existing = await db
            .select()
            .from(permissionsTable)
            .where(
                and(
                    eq(permissionsTable.resourceName, perm.resourceName),
                    eq(permissionsTable.action, perm.action),
                ),
            )
            .limit(1);
        if (existing.length === 0) {
            await db.insert(permissionsTable).values(perm);
        }
    }
    const formPerms = await db
        .select()
        .from(permissionsTable)
        .where(eq(permissionsTable.resourceName, "form_studio"));
    const siteAdminRole = await db
        .select()
        .from(roles)
        .where(eq(roles.name, "Site Admin"))
        .limit(1);
    const clientAdminRole = await db
        .select()
        .from(roles)
        .where(eq(roles.name, "Client Admin"))
        .limit(1);
    const clientUserRole = await db
        .select()
        .from(roles)
        .where(eq(roles.name, "Client User"))
        .limit(1);
    const rolesToAssign = [
        siteAdminRole[0],
        clientAdminRole[0],
        clientUserRole[0],
    ].filter(Boolean);
    for (const perm of formPerms) {
        for (const role of rolesToAssign) {
            const existing = await db
                .select()
                .from(rolePermissions)
                .where(
                    and(
                        eq(rolePermissions.roleId, role.id),
                        eq(rolePermissions.permissionId, perm.id),
                    ),
                )
                .limit(1);
            if (existing.length === 0) {
                await db
                    .insert(rolePermissions)
                    .values({ roleId: role.id, permissionId: perm.id });
            }
        }
    }
}

const DEFAULT_MODULES = [
    { name: "Tenants", slug: "tenants", icon: "Business", sortOrder: 1 },
    { name: "Users", slug: "users", icon: "People", sortOrder: 2 },
    { name: "Roles", slug: "roles", icon: "AdminPanelSettings", sortOrder: 3 },
    {
        name: "Permissions",
        slug: "permissions",
        icon: "Security",
        sortOrder: 4,
    },
    { name: "Modules", slug: "modules", icon: "Extension", sortOrder: 5 },
    { name: "Audit Logs", slug: "audit_logs", icon: "History", sortOrder: 6 },
    { name: "Settings", slug: "settings", icon: "Settings", sortOrder: 7 },
    {
        name: "Form Studio",
        slug: "form_studio",
        icon: "ViewModule",
        sortOrder: 8,
    },
];

export const seedDatabase = async () => {
    try {
        console.log("Starting database seeding...");

        const existingModules = await db.select().from(modules).limit(1);
        if (existingModules.length === 0) {
            console.log("Seeding default modules...");
            await db.insert(modules).values(DEFAULT_MODULES);
        } else {
            const formStudioModule = await db
                .select()
                .from(modules)
                .where(eq(modules.slug, "form_studio"))
                .limit(1);
            if (formStudioModule.length === 0) {
                console.log("Adding Form Studio module...");
                await db.insert(modules).values({
                    name: "Form Studio",
                    slug: "form_studio",
                    icon: "ViewModule",
                    sortOrder: 8,
                });
            }
        }

        const existingRoles = await db.select().from(roles).limit(1);
        if (existingRoles.length > 0) {
            console.log("Database already seeded");
            return;
        }

        console.log("Creating roles...");
        const [siteAdminRole] = await db
            .insert(roles)
            .values({
                name: "Site Admin",
                description: "Full system access across all tenants",
                scope: "global",
            })
            .returning();

        const [clientAdminRole] = await db
            .insert(roles)
            .values({
                name: "Client Admin",
                description: "Full access within tenant organization",
                scope: "tenant",
            })
            .returning();

        const [clientUserRole] = await db
            .insert(roles)
            .values({
                name: "Client User",
                description: "Limited access within tenant organization",
                scope: "tenant",
            })
            .returning();

        console.log("Creating permissions...");
        const createdPermissions = await db
            .insert(permissions)
            .values(permissionData)
            .returning();

        console.log("Assigning permissions to Site Admin role...");
        for (const permission of createdPermissions) {
            await db.insert(rolePermissions).values({
                roleId: siteAdminRole.id,
                permissionId: permission.id,
            });
        }

        console.log("Assigning permissions to Client Admin role...");
        const clientAdminPermissions = createdPermissions.filter((p) =>
            ["users", "audit_logs", "settings", "form_studio"].includes(
                p.resourceName,
            ),
        );
        for (const permission of clientAdminPermissions) {
            await db.insert(rolePermissions).values({
                roleId: clientAdminRole.id,
                permissionId: permission.id,
            });
        }

        console.log("Assigning permissions to Client User role...");
        const clientUserPermissions = createdPermissions.filter(
            (p) =>
                (p.resourceName === "settings" && p.action === "read") ||
                p.resourceName === "form_studio",
        );
        for (const permission of clientUserPermissions) {
            await db.insert(rolePermissions).values({
                roleId: clientUserRole.id,
                permissionId: permission.id,
            });
        }

        console.log("Creating default Site Admin tenant...");
        const [siteAdminTenant] = await db
            .insert(tenants)
            .values({
                name: SITE_ADMIN_TENANT_NAME,
                subdomain: SITE_ADMIN_TENANT_SUBDOMAIN,
                status: "active",
            })
            .returning();

        console.log("Creating default Site Admin user...");
        const adminPassword = await hashPassword(
            process.env.DEFAULT_ADMIN_PASSWORD || "Admin@123456",
        );
        const [siteAdmin] = await db
            .insert(users)
            .values({
                email: process.env.DEFAULT_ADMIN_EMAIL || "admin@system.local",
                passwordHash: adminPassword,
                fullName:
                    process.env.DEFAULT_ADMIN_NAME || "System Administrator",
                tenantId: siteAdminTenant.id,
                status: "active",
            })
            .returning();

        await db.insert(userRoles).values({
            userId: siteAdmin.id,
            roleId: siteAdminRole.id,
        });

        console.log("Creating demo tenant...");
        const [demoTenant] = await db
            .insert(tenants)
            .values({
                name: "Demo Company",
                subdomain: "demo",
                status: "active",
            })
            .returning();

        console.log("Creating demo Client Admin...");
        const clientAdminPassword = await hashPassword("ClientAdmin@123");
        const [clientAdmin] = await db
            .insert(users)
            .values({
                email: "admin@democompany.com",
                passwordHash: clientAdminPassword,
                fullName: "Demo Client Administrator",
                tenantId: demoTenant.id,
                status: "active",
            })
            .returning();

        await db.insert(userRoles).values({
            userId: clientAdmin.id,
            roleId: clientAdminRole.id,
        });

        console.log("Creating demo Client Users...");
        const user1Password = await hashPassword("User@123456");
        const [user1] = await db
            .insert(users)
            .values({
                email: "user1@democompany.com",
                passwordHash: user1Password,
                fullName: "Demo User One",
                tenantId: demoTenant.id,
                status: "active",
            })
            .returning();

        await db.insert(userRoles).values({
            userId: user1.id,
            roleId: clientUserRole.id,
        });

        console.log("Creating sample audit logs...");
        await db.insert(auditLogs).values([
            {
                userId: siteAdmin.id,
                tenantId: siteAdminTenant.id,
                action: "SYSTEM_INITIALIZED",
                resourceType: AuditResourceType.SYSTEM,
                details: JSON.stringify({
                    message: "System initialized with seed data",
                }),
                ipAddress: "127.0.0.1",
            },
            {
                userId: siteAdmin.id,
                tenantId: demoTenant.id,
                action: "TENANT_CREATED",
                resourceType: AuditResourceType.TENANT,
                resourceId: demoTenant.id,
                details: JSON.stringify({ name: "Demo Company" }),
                ipAddress: "127.0.0.1",
            },
            {
                userId: clientAdmin.id,
                tenantId: demoTenant.id,
                action: "USER_CREATED",
                resourceType: AuditResourceType.USER,
                resourceId: user1.id,
                details: JSON.stringify({ email: "user1@democompany.com" }),
                ipAddress: "127.0.0.1",
            },
        ]);

        console.log("Database seeding completed successfully!");
        console.log("\n=== Default Credentials ===");
        console.log("Site Admin:");
        console.log(
            `  Email: ${process.env.DEFAULT_ADMIN_EMAIL || "admin@system.local"}`,
        );
        console.log(
            `  Password: ${process.env.DEFAULT_ADMIN_PASSWORD || "Admin@123456"}`,
        );
        console.log("\nDemo Client Admin:");
        console.log("  Email: admin@democompany.com");
        console.log("  Password: ClientAdmin@123");
        console.log("\nDemo Users:");
        console.log("  Email: user1@democompany.com / user2@democompany.com");
        console.log("  Password: User@123456");
        console.log("===========================\n");
    } catch (error) {
        console.error("Seeding error:", error);
        throw error;
    }
};
