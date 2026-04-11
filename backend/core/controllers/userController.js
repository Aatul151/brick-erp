import { db } from '../../models/db.js';
import { users, userRoles, roles, tenants } from '../../models/schema.js';
import { eq, desc, sql, or, ilike } from 'drizzle-orm';
import { hashPassword } from '../../utils/password.js';
import { logAudit, AuditResourceType } from '../services/auditService.js';
import { sendWelcomeEmail, sendUserInvitationEmail } from '../services/emailService.js';

export const createUser = async (req, res) => {
  try {
    const { email, password, fullName, tenantId, roleIds } = req.body;

    const isSiteAdmin = req.user.roles.some(r => r.roleName === 'Site Admin');
    
    if (!isSiteAdmin && tenantId !== req.user.tenantId) {
      return res.status(403).json({ error: 'Cannot create users for other tenants' });
    }

    const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existingUser.length) {
      return res.status(409).json({ error: 'Email already exists' });
    }

    const hashedPassword = await hashPassword(password);

    const [user] = await db.insert(users).values({
      email,
      passwordHash: hashedPassword,
      fullName,
      tenantId,
      status: 'active'
    }).returning();

    for (const roleId of roleIds) {
      await db.insert(userRoles).values({
        userId: user.id,
        roleId
      });
    }

    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);

    await sendWelcomeEmail(user.email, user.fullName, password);

    await logAudit({
      userId: req.user.id,
      tenantId: user.tenantId,
      action: 'USER_CREATED',
      resourceType: AuditResourceType.USER,
      resourceId: user.id,
      details: { email, fullName, tenantId, roleIds },
      ipAddress: req.ip
    });

    const userRolesData = await db
      .select({
        roleId: roles.id,
        roleName: roles.name
      })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(eq(userRoles.userId, user.id));

    res.status(201).json({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      tenantId: user.tenantId,
      status: user.status,
      createdAt: user.createdAt,
      roles: userRolesData
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
};

export const getUsers = async (req, res) => {
  try {
    const { tenantId, status, search, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const isSiteAdmin = req.user.roles.some(r => r.roleName === 'Site Admin');

    let query = db.select({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      tenantId: users.tenantId,
      tenantName: tenants.name,
      status: users.status,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt
    }).from(users).leftJoin(tenants, eq(users.tenantId, tenants.id));

    const conditions = [];

    if (!isSiteAdmin) {
      conditions.push(eq(users.tenantId, req.user.tenantId));
    } else if (tenantId) {
      conditions.push(eq(users.tenantId, parseInt(tenantId)));
    }

    if (status) {
      conditions.push(eq(users.status, status));
    }

    if (search) {
      conditions.push(
        or(
          ilike(users.fullName, `%${search}%`),
          ilike(users.email, `%${search}%`)
        )
      );
    }

    if (conditions.length > 0) {
      query = query.where(sql`${sql.join(conditions, sql` AND `)}`);
    }

    const allUsers = await query.orderBy(desc(users.createdAt)).limit(parseInt(limit)).offset(offset);

    for (const user of allUsers) {
      const userRolesData = await db
        .select({
          roleId: roles.id,
          roleName: roles.name
        })
        .from(userRoles)
        .innerJoin(roles, eq(userRoles.roleId, roles.id))
        .where(eq(userRoles.userId, user.id));
      
      user.roles = userRolesData;
    }

    let countQuery = db.select({ count: sql`count(*)` }).from(users);
    if (conditions.length > 0) {
      countQuery = countQuery.where(sql`${sql.join(conditions, sql` AND `)}`);
    }
    const [{ count }] = await countQuery;

    res.json({
      users: allUsers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(count),
        totalPages: Math.ceil(parseInt(count) / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

export const getUser = async (req, res) => {
  try {
    const { id } = req.params;

    const isSiteAdmin = req.user.roles.some(r => r.roleName === 'Site Admin');

    const [user] = await db.select({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      tenantId: users.tenantId,
      tenantName: tenants.name,
      status: users.status,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt
    }).from(users)
      .leftJoin(tenants, eq(users.tenantId, tenants.id))
      .where(eq(users.id, parseInt(id)))
      .limit(1);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!isSiteAdmin && user.tenantId !== req.user.tenantId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const userRolesData = await db
      .select({
        roleId: roles.id,
        roleName: roles.name,
        roleScope: roles.scope
      })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(eq(userRoles.userId, user.id));

    res.json({
      ...user,
      roles: userRolesData
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { email, fullName, status, roleIds } = req.body;

    const isSiteAdmin = req.user.roles.some(r => r.roleName === 'Site Admin');

    const [existingUser] = await db.select().from(users).where(eq(users.id, parseInt(id))).limit(1);

    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!isSiteAdmin && existingUser.tenantId !== req.user.tenantId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updates = {};
    if (email && email !== existingUser.email) {
      const emailExists = await db.select().from(users).where(eq(users.email, email)).limit(1);
      if (emailExists.length) {
        return res.status(409).json({ error: 'Email already exists' });
      }
      updates.email = email;
    }
    if (fullName) updates.fullName = fullName;
    if (status) updates.status = status;
    updates.updatedAt = new Date();

    if (Object.keys(updates).length > 1) {
      await db.update(users).set(updates).where(eq(users.id, parseInt(id)));
    }

    if (roleIds && roleIds.length > 0) {
      await db.delete(userRoles).where(eq(userRoles.userId, parseInt(id)));
      
      for (const roleId of roleIds) {
        await db.insert(userRoles).values({
          userId: parseInt(id),
          roleId
        });
      }
    }

    await logAudit({
      userId: req.user.id,
      tenantId: existingUser.tenantId,
      action: 'USER_UPDATED',
      resourceType: AuditResourceType.USER,
      resourceId: parseInt(id),
      details: { ...updates, roleIds },
      ipAddress: req.ip
    });

    const [updatedUser] = await db.select().from(users).where(eq(users.id, parseInt(id))).limit(1);

    const userRolesData = await db
      .select({
        roleId: roles.id,
        roleName: roles.name
      })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(eq(userRoles.userId, parseInt(id)));

    res.json({
      id: updatedUser.id,
      email: updatedUser.email,
      fullName: updatedUser.fullName,
      tenantId: updatedUser.tenantId,
      status: updatedUser.status,
      updatedAt: updatedUser.updatedAt,
      roles: userRolesData
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const isSiteAdmin = req.user.roles.some(r => r.roleName === 'Site Admin');

    const [user] = await db.select().from(users).where(eq(users.id, parseInt(id))).limit(1);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!isSiteAdmin && user.tenantId !== req.user.tenantId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (user.id === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    await db.delete(users).where(eq(users.id, parseInt(id)));

    await logAudit({
      userId: req.user.id,
      tenantId: user.tenantId,
      action: 'USER_DELETED',
      resourceType: AuditResourceType.USER,
      resourceId: parseInt(id),
      details: { email: user.email, fullName: user.fullName },
      ipAddress: req.ip
    });

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
};

export const inviteUser = async (req, res) => {
  try {
    const { email, fullName, roleIds } = req.body;

    const isClientAdmin = req.user.roles.some(r => r.roleName === 'Client Admin');
    
    if (!isClientAdmin && !req.user.roles.some(r => r.roleName === 'Site Admin')) {
      return res.status(403).json({ error: 'Only admins can invite users' });
    }

    const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existingUser.length) {
      return res.status(409).json({ error: 'Email already exists' });
    }

    const tempPassword = Math.random().toString(36).slice(-10) + 'A1@';
    const hashedPassword = await hashPassword(tempPassword);

    const [user] = await db.insert(users).values({
      email,
      passwordHash: hashedPassword,
      fullName,
      tenantId: req.user.tenantId,
      status: 'active'
    }).returning();

    for (const roleId of roleIds) {
      await db.insert(userRoles).values({
        userId: user.id,
        roleId
      });
    }

    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, req.user.tenantId)).limit(1);

    await sendUserInvitationEmail(user.email, req.user.fullName, tenant.name, tempPassword);

    await logAudit({
      userId: req.user.id,
      tenantId: user.tenantId,
      action: 'USER_INVITED',
      resourceType: AuditResourceType.USER,
      resourceId: user.id,
      details: { email, fullName, roleIds },
      ipAddress: req.ip
    });

    res.status(201).json({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      tenantId: user.tenantId,
      status: user.status,
      message: 'User invited successfully'
    });
  } catch (error) {
    console.error('Invite user error:', error);
    res.status(500).json({ error: 'Failed to invite user' });
  }
};
