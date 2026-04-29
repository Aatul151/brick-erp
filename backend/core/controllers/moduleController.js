import { db } from "../../models/db.js";
import { modules, permissions } from "../../models/schema.js";
import { eq, asc, ilike, or, sql } from "drizzle-orm";
import { logAudit, AuditResourceType } from "../services/auditService.js";

export const getModules = async (req, res) => {
    try {
        const { active, search } = req.query;

        let query = db.select().from(modules);

        const conditions = [];
        if (active !== undefined) {
            conditions.push(eq(modules.isActive, active === "true"));
        }
        if (search) {
            conditions.push(or(ilike(modules.name, `%${search}%`), ilike(modules.slug, `%${search}%`)));
        }
        if (conditions.length > 0) {
            query = query.where(sql`${sql.join(conditions, sql` AND `)}`);
        }

        const allModules = await query.orderBy(asc(modules.sortOrder), asc(modules.name));

        res.json(allModules);
    } catch (error) {
        console.error("Get modules error:", error);
        res.status(500).json({
            error: "Failed to fetch modules",
        });
    }
};

export const getModule = async (req, res) => {
    try {
        const { id } = req.params;

        const [module] = await db
            .select()
            .from(modules)
            .where(eq(modules.id, parseInt(id)))
            .limit(1);

        if (!module) {
            return res.status(404).json({
                error: "Module not found",
            });
        }

        res.json(module);
    } catch (error) {
        console.error("Get module error:", error);
        res.status(500).json({
            error: "Failed to fetch module",
        });
    }
};

export const createModule = async (req, res) => {
    try {
        const { name, slug, icon, description, sortOrder, isActive } = req.body;

        const slugValue =
            slug ||
            name
                .toLowerCase()
                .replace(/\s+/g, "_")
                .replace(/[^a-z0-9_]/g, "");

        const [module] = await db
            .insert(modules)
            .values({
                name,
                slug: slugValue,
                icon: icon || null,
                description: description || null,
                sortOrder: sortOrder ?? 0,
                isActive: isActive !== false,
            })
            .returning();

        await logAudit({
            userId: req.user.id,
            tenantId: req.user.tenantId,
            action: "MODULE_CREATED",
            resourceType: AuditResourceType.MODULE,
            resourceId: module.id,
            details: {
                name,
                slug: slugValue,
            },
            ipAddress: req.ip,
        });

        res.status(201).json(module);
    } catch (error) {
        console.error("Create module error:", error);
        if (error.code === "23505") {
            return res.status(409).json({
                error: "Module slug already exists",
            });
        }
        res.status(500).json({
            error: "Failed to create module",
        });
    }
};

export const updateModule = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, slug, icon, description, sortOrder, isActive } = req.body;

        const updates = {};
        if (name !== undefined) updates.name = name;
        if (slug !== undefined) updates.slug = slug;
        if (icon !== undefined) updates.icon = icon;
        if (description !== undefined) updates.description = description;
        if (sortOrder !== undefined) updates.sortOrder = sortOrder;
        if (isActive !== undefined) updates.isActive = isActive;
        updates.updatedAt = new Date();

        const [module] = await db
            .update(modules)
            .set(updates)
            .where(eq(modules.id, parseInt(id)))
            .returning();

        if (!module) {
            return res.status(404).json({
                error: "Module not found",
            });
        }

        await logAudit({
            userId: req.user.id,
            tenantId: req.user.tenantId,
            action: "MODULE_UPDATED",
            resourceType: AuditResourceType.MODULE,
            resourceId: parseInt(id),
            details: updates,
            ipAddress: req.ip,
        });

        res.json(module);
    } catch (error) {
        console.error("Update module error:", error);
        if (error.code === "23505") {
            return res.status(409).json({
                error: "Module slug already exists",
            });
        }
        res.status(500).json({
            error: "Failed to update module",
        });
    }
};

export const deleteModule = async (req, res) => {
    try {
        const { id } = req.params;

        const [module] = await db
            .select()
            .from(modules)
            .where(eq(modules.id, parseInt(id)))
            .limit(1);

        if (!module) {
            return res.status(404).json({
                error: "Module not found",
            });
        }

        await db.delete(permissions).where(eq(permissions.resourceName, module.slug));
        await db.delete(modules).where(eq(modules.id, parseInt(id)));

        await logAudit({
            userId: req.user.id,
            tenantId: req.user.tenantId,
            action: "MODULE_DELETED",
            resourceType: AuditResourceType.MODULE,
            resourceId: parseInt(id),
            details: {
                name: module.name,
                slug: module.slug,
            },
            ipAddress: req.ip,
        });

        res.json({
            message: "Module deleted successfully",
        });
    } catch (error) {
        console.error("Delete module error:", error);
        res.status(500).json({
            error: "Failed to delete module",
        });
    }
};
