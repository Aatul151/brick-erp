import { db } from '../../models/db.js';
import { roles, permissions, rolePermissions, userRoles } from '../../models/schema.js';
import { eq, desc, sql } from 'drizzle-orm';
import { logAudit, AuditResourceType } from '../services/auditService.js';

export const getRoles = async (req, res) => {
  try {
    const allRoles = await db.select({
      id: roles.id,
      name: roles.name,
      description: roles.description,
      scope: roles.scope,
      createdAt: roles.createdAt,
      userCount: sql`(SELECT COUNT(*) FROM ${userRoles} WHERE ${userRoles.roleId} = ${roles.id})`
    }).from(roles).orderBy(roles.name);

    for (const role of allRoles) {
      const rolePerms = await db
        .select({
          permissionId: permissions.id,
          resourceName: permissions.resourceName,
          action: permissions.action,
          description: permissions.description
        })
        .from(rolePermissions)
        .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
        .where(eq(rolePermissions.roleId, role.id));
      
      role.permissions = rolePerms;
    }

    res.json(allRoles);
  } catch (error) {
    console.error('Get roles error:', error);
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
};

export const getRole = async (req, res) => {
  try {
    const { id } = req.params;

    const [role] = await db.select({
      id: roles.id,
      name: roles.name,
      description: roles.description,
      scope: roles.scope,
      createdAt: roles.createdAt,
      updatedAt: roles.updatedAt,
      userCount: sql`(SELECT COUNT(*) FROM ${userRoles} WHERE ${userRoles.roleId} = ${roles.id})`
    }).from(roles).where(eq(roles.id, parseInt(id))).limit(1);

    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    const rolePerms = await db
      .select({
        permissionId: permissions.id,
        resourceName: permissions.resourceName,
        action: permissions.action,
        description: permissions.description
      })
      .from(rolePermissions)
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(eq(rolePermissions.roleId, role.id));

    role.permissions = rolePerms;

    res.json(role);
  } catch (error) {
    console.error('Get role error:', error);
    res.status(500).json({ error: 'Failed to fetch role' });
  }
};

export const createRole = async (req, res) => {
  try {
    const { name, description, scope, permissionIds } = req.body;

    const [role] = await db.insert(roles).values({
      name,
      description: description || null,
      scope
    }).returning();

    if (permissionIds && permissionIds.length > 0) {
      for (const permissionId of permissionIds) {
        await db.insert(rolePermissions).values({
          roleId: role.id,
          permissionId
        });
      }
    }

    await logAudit({
      userId: req.user.id,
      tenantId: req.user.tenantId,
      action: 'ROLE_CREATED',
      resourceType: 'role',
      resourceId: role.id,
      details: { name, scope, permissionIds },
      ipAddress: req.ip
    });

    const rolePerms = await db
      .select({
        permissionId: permissions.id,
        resourceName: permissions.resourceName,
        action: permissions.action
      })
      .from(rolePermissions)
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(eq(rolePermissions.roleId, role.id));

    res.status(201).json({
      ...role,
      permissions: rolePerms
    });
  } catch (error) {
    console.error('Create role error:', error);
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Role name already exists' });
    }
    res.status(500).json({ error: 'Failed to create role' });
  }
};

export const updateRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, permissionIds } = req.body;

    const updates = {};
    if (name) updates.name = name;
    if (description !== undefined) updates.description = description;
    updates.updatedAt = new Date();

    const [role] = await db.update(roles)
      .set(updates)
      .where(eq(roles.id, parseInt(id)))
      .returning();

    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    if (permissionIds !== undefined) {
      await db.delete(rolePermissions).where(eq(rolePermissions.roleId, parseInt(id)));
      
      if (permissionIds.length > 0) {
        for (const permissionId of permissionIds) {
          await db.insert(rolePermissions).values({
            roleId: parseInt(id),
            permissionId
          });
        }
      }
    }

    await logAudit({
      userId: req.user.id,
      tenantId: req.user.tenantId,
      action: 'ROLE_UPDATED',
      resourceType: 'role',
      resourceId: parseInt(id),
      details: { ...updates, permissionIds },
      ipAddress: req.ip
    });

    const rolePerms = await db
      .select({
        permissionId: permissions.id,
        resourceName: permissions.resourceName,
        action: permissions.action
      })
      .from(rolePermissions)
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(eq(rolePermissions.roleId, parseInt(id)));

    res.json({
      ...role,
      permissions: rolePerms
    });
  } catch (error) {
    console.error('Update role error:', error);
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Role name already exists' });
    }
    res.status(500).json({ error: 'Failed to update role' });
  }
};

export const deleteRole = async (req, res) => {
  try {
    const { id } = req.params;

    const [userCount] = await db.select({ count: sql`count(*)` })
      .from(userRoles)
      .where(eq(userRoles.roleId, parseInt(id)));

    if (parseInt(userCount.count) > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete role with assigned users',
        userCount: parseInt(userCount.count)
      });
    }

    const [role] = await db.delete(roles)
      .where(eq(roles.id, parseInt(id)))
      .returning();

    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    await logAudit({
      userId: req.user.id,
      tenantId: req.user.tenantId,
      action: 'ROLE_DELETED',
      resourceType: 'role',
      resourceId: parseInt(id),
      details: { name: role.name },
      ipAddress: req.ip
    });

    res.json({ message: 'Role deleted successfully' });
  } catch (error) {
    console.error('Delete role error:', error);
    res.status(500).json({ error: 'Failed to delete role' });
  }
};

export const getPermissions = async (req, res) => {
  try {
    const allPermissions = await db.select({
      id: permissions.id,
      resourceName: permissions.resourceName,
      action: permissions.action,
      description: permissions.description,
      createdAt: permissions.createdAt,
      roleCount: sql`(SELECT COUNT(*)::int FROM ${rolePermissions} WHERE ${rolePermissions.permissionId} = ${permissions.id})`
    }).from(permissions).orderBy(permissions.resourceName, permissions.action);

    const grouped = allPermissions.reduce((acc, perm) => {
      if (!acc[perm.resourceName]) {
        acc[perm.resourceName] = [];
      }
      acc[perm.resourceName].push(perm);
      return acc;
    }, {});

    res.json({
      permissions: allPermissions,
      grouped
    });
  } catch (error) {
    console.error('Get permissions error:', error);
    res.status(500).json({ error: 'Failed to fetch permissions' });
  }
};

export const createPermission = async (req, res) => {
  try {
    const { resourceName, action, description } = req.body;

    const [permission] = await db.insert(permissions).values({
      resourceName,
      action,
      description: description || null
    }).returning();

    await logAudit({
      userId: req.user.id,
      tenantId: req.user.tenantId,
      action: 'PERMISSION_CREATED',
      resourceType: AuditResourceType.PERMISSION,
      resourceId: permission.id,
      details: { resourceName, action },
      ipAddress: req.ip
    });

    res.status(201).json(permission);
  } catch (error) {
    console.error('Create permission error:', error);
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Permission already exists for this resource and action' });
    }
    res.status(500).json({ error: 'Failed to create permission' });
  }
};

export const updatePermission = async (req, res) => {
  try {
    const { id } = req.params;
    const { resourceName, action, description } = req.body;

    const updates = {};
    if (resourceName) updates.resourceName = resourceName;
    if (action) updates.action = action;
    if (description !== undefined) updates.description = description;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const [permission] = await db.update(permissions)
      .set(updates)
      .where(eq(permissions.id, parseInt(id)))
      .returning();

    if (!permission) {
      return res.status(404).json({ error: 'Permission not found' });
    }

    await logAudit({
      userId: req.user.id,
      tenantId: req.user.tenantId,
      action: 'PERMISSION_UPDATED',
      resourceType: AuditResourceType.PERMISSION,
      resourceId: parseInt(id),
      details: updates,
      ipAddress: req.ip
    });

    res.json(permission);
  } catch (error) {
    console.error('Update permission error:', error);
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Permission already exists for this resource and action' });
    }
    res.status(500).json({ error: 'Failed to update permission' });
  }
};

export const deletePermission = async (req, res) => {
  try {
    const { id } = req.params;

    const [permission] = await db.delete(permissions)
      .where(eq(permissions.id, parseInt(id)))
      .returning();

    if (!permission) {
      return res.status(404).json({ error: 'Permission not found' });
    }

    await logAudit({
      userId: req.user.id,
      tenantId: req.user.tenantId,
      action: 'PERMISSION_DELETED',
      resourceType: AuditResourceType.PERMISSION,
      resourceId: parseInt(id),
      details: { resourceName: permission.resourceName, action: permission.action },
      ipAddress: req.ip
    });

    res.json({ message: 'Permission deleted successfully' });
  } catch (error) {
    console.error('Delete permission error:', error);
    res.status(500).json({ error: 'Failed to delete permission' });
  }
};
