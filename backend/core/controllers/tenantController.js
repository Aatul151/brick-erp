import { db } from '../../models/db.js';
import { tenants, users, userRoles, roles } from '../../models/schema.js';
import { eq, desc, sql, or, ilike, and } from 'drizzle-orm';
import { logAudit, AuditResourceType } from '../services/auditService.js';
import { sendTenantSuspensionEmail, sendAccountReactivationEmail } from '../services/emailService.js';

export const createTenant = async (req, res) => {
  try {
    const { name, subdomain } = req.body;

    const [tenant] = await db.insert(tenants).values({
      name,
      subdomain: subdomain || null,
      status: 'active'
    }).returning();

    await logAudit({
      userId: req.user.id,
      tenantId: tenant.id,
      action: 'TENANT_CREATED',
      resourceType: AuditResourceType.TENANT,
      resourceId: tenant.id,
      details: { name, subdomain },
      ipAddress: req.ip
    });

    res.status(201).json(tenant);
  } catch (error) {
    console.error('Create tenant error:', error);
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Subdomain already exists' });
    }
    res.status(500).json({ error: 'Failed to create tenant' });
  }
};

export const getTenants = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = db.select({
      id: tenants.id,
      name: tenants.name,
      subdomain: tenants.subdomain,
      status: tenants.status,
      themeSetting: tenants.themeSetting,
      createdAt: tenants.createdAt,
      updatedAt: tenants.updatedAt,
      userCount: sql`(SELECT COUNT(*) FROM ${users} WHERE ${users.tenantId} = ${tenants.id})`
    }).from(tenants);

    const conditions = [];

    if (status) {
      conditions.push(eq(tenants.status, status));
    }

    if (search) {
      conditions.push(
        or(
          ilike(tenants.name, `%${search}%`),
          ilike(tenants.subdomain, `%${search}%`)
        )
      );
    }

    if (conditions.length > 0) {
      query = query.where(sql`${sql.join(conditions, sql` AND `)}`);
    }

    const allTenants = await query.orderBy(desc(tenants.createdAt)).limit(parseInt(limit)).offset(offset);

    const [{ count }] = await db.select({ count: sql`count(*)` }).from(tenants);

    res.json({
      tenants: allTenants,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(count),
        totalPages: Math.ceil(parseInt(count) / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get tenants error:', error);
    res.status(500).json({ error: 'Failed to fetch tenants' });
  }
};

export const getTenant = async (req, res) => {
  try {
    const { id } = req.params;

    const [tenant] = await db.select({
      id: tenants.id,
      name: tenants.name,
      subdomain: tenants.subdomain,
      status: tenants.status,
      themeSetting: tenants.themeSetting,
      createdAt: tenants.createdAt,
      updatedAt: tenants.updatedAt,
      userCount: sql`(SELECT COUNT(*) FROM ${users} WHERE ${users.tenantId} = ${tenants.id})`,
      activeUserCount: sql`(SELECT COUNT(*) FROM ${users} WHERE ${users.tenantId} = ${tenants.id} AND ${users.status} = 'active')`
    }).from(tenants).where(eq(tenants.id, parseInt(id))).limit(1);

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    res.json(tenant);
  } catch (error) {
    console.error('Get tenant error:', error);
    res.status(500).json({ error: 'Failed to fetch tenant' });
  }
};

export const updateTenant = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, subdomain, status } = req.body;

    const updates = {};
    if (name) updates.name = name;
    if (subdomain !== undefined) updates.subdomain = subdomain;
    if (status) updates.status = status;
    updates.updatedAt = new Date();

    const [tenant] = await db.update(tenants)
      .set(updates)
      .where(eq(tenants.id, parseInt(id)))
      .returning();

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    await logAudit({
      userId: req.user.id,
      tenantId: tenant.id,
      action: 'TENANT_UPDATED',
      resourceType: AuditResourceType.TENANT,
      resourceId: tenant.id,
      details: updates,
      ipAddress: req.ip
    });

    res.json(tenant);
  } catch (error) {
    console.error('Update tenant error:', error);
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Subdomain already exists' });
    }
    res.status(500).json({ error: 'Failed to update tenant' });
  }
};

export const suspendTenant = async (req, res) => {
  try {
    const { id } = req.params;

    const [tenant] = await db.update(tenants)
      .set({ status: 'suspended', updatedAt: new Date() })
      .where(eq(tenants.id, parseInt(id)))
      .returning();

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const clientAdmins = await db
      .select({
        email: users.email,
        fullName: users.fullName
      })
      .from(users)
      .innerJoin(userRoles, eq(users.id, userRoles.userId))
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(and(eq(users.tenantId, parseInt(id)), eq(roles.name, 'Client Admin')));

    for (const admin of clientAdmins) {
      await sendTenantSuspensionEmail(admin.email, tenant.name, admin.fullName);
    }

    await logAudit({
      userId: req.user.id,
      tenantId: tenant.id,
      action: 'TENANT_SUSPENDED',
      resourceType: AuditResourceType.TENANT,
      resourceId: tenant.id,
      ipAddress: req.ip
    });

    res.json({ message: 'Tenant suspended successfully', tenant });
  } catch (error) {
    console.error('Suspend tenant error:', error);
    res.status(500).json({ error: 'Failed to suspend tenant' });
  }
};

export const activateTenant = async (req, res) => {
  try {
    const { id } = req.params;

    const [tenant] = await db.update(tenants)
      .set({ status: 'active', updatedAt: new Date() })
      .where(eq(tenants.id, parseInt(id)))
      .returning();

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const clientAdmins = await db
      .select({
        email: users.email,
        fullName: users.fullName
      })
      .from(users)
      .innerJoin(userRoles, eq(users.id, userRoles.userId))
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(and(eq(users.tenantId, parseInt(id)), eq(roles.name, 'Client Admin')));

    for (const admin of clientAdmins) {
      await sendAccountReactivationEmail(admin.email, admin.fullName, tenant.name);
    }

    await logAudit({
      userId: req.user.id,
      tenantId: tenant.id,
      action: 'TENANT_ACTIVATED',
      resourceType: AuditResourceType.TENANT,
      resourceId: tenant.id,
      ipAddress: req.ip
    });

    res.json({ message: 'Tenant activated successfully', tenant });
  } catch (error) {
    console.error('Activate tenant error:', error);
    res.status(500).json({ error: 'Failed to activate tenant' });
  }
};

export const deleteTenant = async (req, res) => {
  try {
    const { id } = req.params;

    const [tenant] = await db.delete(tenants)
      .where(eq(tenants.id, parseInt(id)))
      .returning();

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    await logAudit({
      userId: req.user.id,
      action: 'TENANT_DELETED',
      resourceType: AuditResourceType.TENANT,
      resourceId: parseInt(id),
      details: { name: tenant.name },
      ipAddress: req.ip
    });

    res.json({ message: 'Tenant deleted successfully' });
  } catch (error) {
    console.error('Delete tenant error:', error);
    res.status(500).json({ error: 'Failed to delete tenant' });
  }
};

export const updateTenantThemeSetting = async (req, res) => {
  try {
    const { id } = req.params;
    const { themeSetting } = req.body;

    const [tenant] = await db.update(tenants)
      .set({
        themeSetting: themeSetting ?? null,
        updatedAt: new Date()
      })
      .where(eq(tenants.id, parseInt(id)))
      .returning();

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    await logAudit({
      userId: req.user.id,
      tenantId: tenant.id,
      action: 'TENANT_THEME_UPDATED',
      resourceType: AuditResourceType.TENANT,
      resourceId: tenant.id,
      details: { themeSetting },
      ipAddress: req.ip
    });

    res.json({ message: 'Theme updated successfully', tenant });
  } catch (error) {
    console.error('Update tenant theme error:', error);
    res.status(500).json({ error: 'Failed to update tenant theme' });
  }
};

export const updateMyTenantThemeMode = async (req, res) => {
  try {
    if (!req.user.tenantId) {
      return res.status(400).json({ error: 'No tenant associated with user' });
    }

    const { mode } = req.body;
    if (!mode || !['light', 'dark'].includes(mode)) {
      return res.status(400).json({ error: 'Invalid mode. Use "light" or "dark"' });
    }

    const [existing] = await db.select({ themeSetting: tenants.themeSetting }).from(tenants).where(eq(tenants.id, req.user.tenantId)).limit(1);
    const currentTheme = existing?.themeSetting && typeof existing.themeSetting === 'object' ? existing.themeSetting : {};
    const newThemeSetting = { ...currentTheme, mode };

    const [tenant] = await db.update(tenants)
      .set({
        themeSetting: newThemeSetting,
        updatedAt: new Date()
      })
      .where(eq(tenants.id, req.user.tenantId))
      .returning();

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    await logAudit({
      userId: req.user.id,
      tenantId: tenant.id,
      action: 'TENANT_THEME_MODE_UPDATED',
      resourceType: AuditResourceType.TENANT,
      resourceId: tenant.id,
      details: { mode },
      ipAddress: req.ip
    });

    res.json({ message: 'Theme mode updated successfully', themeSetting: newThemeSetting });
  } catch (error) {
    console.error('Update tenant theme mode error:', error);
    res.status(500).json({ error: 'Failed to update theme mode' });
  }
};

export const getTenantStats = async (req, res) => {
  try {
    const isSiteAdmin = req.user.roles.some(r => r.roleName === 'Site Admin');
    
    if (isSiteAdmin) {
      const [stats] = await db.select({
        totalTenants: sql`COUNT(*)`,
        activeTenants: sql`COUNT(*) FILTER (WHERE ${tenants.status} = 'active')`,
        suspendedTenants: sql`COUNT(*) FILTER (WHERE ${tenants.status} = 'suspended')`
      }).from(tenants);

      const [userStats] = await db.select({
        totalUsers: sql`COUNT(*)`,
        activeUsers: sql`COUNT(*) FILTER (WHERE ${users.status} = 'active')`
      }).from(users);

      res.json({
        ...stats,
        ...userStats
      });
    } else {
      const [stats] = await db.select({
        totalUsers: sql`COUNT(*)`,
        activeUsers: sql`COUNT(*) FILTER (WHERE ${users.status} = 'active')`,
        inactiveUsers: sql`COUNT(*) FILTER (WHERE ${users.status} = 'inactive')`,
        suspendedUsers: sql`COUNT(*) FILTER (WHERE ${users.status} = 'suspended')`
      }).from(users).where(eq(users.tenantId, req.user.tenantId));

      res.json(stats);
    }
  } catch (error) {
    console.error('Get tenant stats error:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
};
