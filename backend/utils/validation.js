import { z } from 'zod';

// Auth Schemas
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[@$!%*?&#]/, 'Password must contain at least one special character'),
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  tenantId: z.number().int().positive().optional()
});

export const passwordResetRequestSchema = z.object({
  email: z.string().email('Invalid email address')
});

export const passwordResetConfirmSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[@$!%*?&#]/, 'Password must contain at least one special character')
});

// Tenant Schemas
export const createTenantSchema = z.object({
  name: z.string().min(2, 'Tenant name must be at least 2 characters'),
  subdomain: z.string().min(3, 'Subdomain must be at least 3 characters')
    .regex(/^[a-z0-9-]+$/, 'Subdomain can only contain lowercase letters, numbers, and hyphens')
    .optional()
});

export const updateTenantSchema = z.object({
  name: z.string().min(2, 'Tenant name must be at least 2 characters').optional(),
  subdomain: z.string().min(3, 'Subdomain must be at least 3 characters')
    .regex(/^[a-z0-9-]+$/, 'Subdomain can only contain lowercase letters, numbers, and hyphens')
    .optional(),
  status: z.enum(['active', 'suspended']).optional()
});

// User Schemas
export const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[@$!%*?&#]/, 'Password must contain at least one special character'),
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  tenantId: z.number().int().positive(),
  roleIds: z.array(z.number().int().positive()).min(1, 'At least one role is required')
});

export const updateUserSchema = z.object({
  email: z.string().email('Invalid email address').optional(),
  fullName: z.string().min(2, 'Full name must be at least 2 characters').optional(),
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
  roleIds: z.array(z.number().int().positive()).optional()
});

export const updateProfileSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters').optional(),
  email: z.string().email('Invalid email address').optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[@$!%*?&#]/, 'Password must contain at least one special character')
    .optional()
});

// Role Schemas
export const createRoleSchema = z.object({
  name: z.string().min(2, 'Role name must be at least 2 characters'),
  description: z.string().optional(),
  scope: z.enum(['global', 'tenant']),
  permissionIds: z.array(z.number().int().positive()).optional()
});

export const updateRoleSchema = z.object({
  name: z.string().min(2, 'Role name must be at least 2 characters').optional(),
  description: z.string().optional(),
  permissionIds: z.array(z.number().int().positive()).optional()
});

// Permission Schemas
export const createPermissionSchema = z.object({
  resourceName: z.string().min(2, 'Resource name must be at least 2 characters'),
  action: z.enum(['create', 'read', 'update', 'delete', 'menu']),
  description: z.string().optional()
});

export const updatePermissionSchema = z.object({
  resourceName: z.string().min(2, 'Resource name must be at least 2 characters').optional(),
  action: z.enum(['create', 'read', 'update', 'delete', 'menu']).optional(),
  description: z.string().optional()
});

// Module Schemas
export const createModuleSchema = z.object({
  name: z.string().min(2, 'Module name must be at least 2 characters'),
  slug: z.string().min(2, 'Slug must be at least 2 characters')
    .regex(/^[a-z0-9_]+$/, 'Slug can only contain lowercase letters, numbers, and underscores')
    .optional(),
  icon: z.string().max(50).optional(),
  description: z.string().optional(),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional()
});

export const updateModuleSchema = z.object({
  name: z.string().min(2, 'Module name must be at least 2 characters').optional(),
  slug: z.string().min(2, 'Slug must be at least 2 characters')
    .regex(/^[a-z0-9_]+$/, 'Slug can only contain lowercase letters, numbers, and underscores')
    .optional(),
  icon: z.string().max(50).optional(),
  description: z.string().optional(),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional()
});
