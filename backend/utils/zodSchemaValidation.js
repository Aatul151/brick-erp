import { z } from "zod";

const digitsOnly = (value) => String(value ?? "").replace(/\D/g, "");
const uuidSchema = z.string().uuid("Invalid tenant id");

// Auth Schemas — accepts legacy { email, password }, optional { mobile }, or email field as mobile digits
export const loginSchema = z
    .object({
        email: z.string().optional(),
        mobile: z.string().optional(),
        password: z.string().min(6, "Password must be at least 6 characters"),
    })
    .superRefine((data, ctx) => {
        const mobileDigits = digitsOnly(data.mobile);
        if (mobileDigits.length > 0) {
            if (mobileDigits.length < 10 || mobileDigits.length > 15) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "Invalid mobile number",
                    path: ["mobile"],
                });
            }
            return;
        }
        const primary = String(data.email ?? "").trim();
        if (!primary) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Email or mobile number is required",
                path: ["email"],
            });
            return;
        }
        if (z.string().email().safeParse(primary).success) return;
        const d = digitsOnly(primary);
        if (d.length >= 10 && d.length <= 15) return;
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Invalid email or mobile number",
            path: ["email"],
        });
    });

export const registerSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: z
        .string()
        .min(8, "Password must be at least 8 characters")
        .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
        .regex(/[a-z]/, "Password must contain at least one lowercase letter")
        .regex(/[0-9]/, "Password must contain at least one number")
        .regex(/[@$!%*?&#]/, "Password must contain at least one special character"),
    fullName: z.string().min(2, "Full name must be at least 2 characters"),
    tenantId: uuidSchema.optional(),
});

export const passwordResetRequestSchema = z.object({
    email: z.string().email("Invalid email address"),
});

export const passwordResetConfirmSchema = z.object({
    token: z.string().min(1, "Token is required"),
    newPassword: z
        .string()
        .min(8, "Password must be at least 8 characters")
        .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
        .regex(/[a-z]/, "Password must contain at least one lowercase letter")
        .regex(/[0-9]/, "Password must contain at least one number")
        .regex(/[@$!%*?&#]/, "Password must contain at least one special character"),
});

// Tenant Schemas
export const createTenantSchema = z.object({
    name: z.string().min(2, "Tenant name must be at least 2 characters"),
    subdomain: z
        .string()
        .min(3, "Subdomain must be at least 3 characters")
        .regex(/^[a-z0-9-]+$/, "Subdomain can only contain lowercase letters, numbers, and hyphens")
        .optional(),
});

export const updateTenantSchema = z.object({
    name: z.string().min(2, "Tenant name must be at least 2 characters").optional(),
    subdomain: z
        .string()
        .min(3, "Subdomain must be at least 3 characters")
        .regex(/^[a-z0-9-]+$/, "Subdomain can only contain lowercase letters, numbers, and hyphens")
        .optional(),
    status: z.enum(["active", "suspended"]).optional(),
});

// User Schemas
export const createUserSchema = z
    .object({
        email: z.string().email("Invalid email address"),
        mobile: z.string().optional(),
        password: z
            .string()
            .min(8, "Password must be at least 8 characters")
            .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
            .regex(/[a-z]/, "Password must contain at least one lowercase letter")
            .regex(/[0-9]/, "Password must contain at least one number")
            .regex(/[@$!%*?&#]/, "Password must contain at least one special character"),
        fullName: z.string().min(2, "Full name must be at least 2 characters"),
        tenantId: uuidSchema,
        roleIds: z.array(z.number().int().positive()).min(1, "At least one role is required"),
    })
    .superRefine((data, ctx) => {
        const d = String(data.mobile ?? "").replace(/\D/g, "");
        if (!data.mobile || String(data.mobile).trim() === "") return;
        if (d.length < 10 || d.length > 15) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Invalid mobile number",
                path: ["mobile"],
            });
        }
    });

export const updateUserSchema = z
    .object({
        email: z.string().email("Invalid email address").optional(),
        mobile: z.string().nullable().optional(),
        fullName: z.string().min(2, "Full name must be at least 2 characters").optional(),
        status: z.enum(["active", "inactive", "suspended"]).optional(),
        roleIds: z.array(z.number().int().positive()).optional(),
    })
    .superRefine((data, ctx) => {
        if (data.mobile === undefined) return;
        if (data.mobile === null || String(data.mobile).trim() === "") return;
        const d = String(data.mobile).replace(/\D/g, "");
        if (d.length < 10 || d.length > 15) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Invalid mobile number",
                path: ["mobile"],
            });
        }
    });

export const updateProfileSchema = z
    .object({
        fullName: z.string().min(2, "Full name must be at least 2 characters").optional(),
        email: z.string().email("Invalid email address").optional(),
        mobile: z.string().nullable().optional(),
        currentPassword: z.string().optional(),
        newPassword: z
            .string()
            .min(8, "Password must be at least 8 characters")
            .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
            .regex(/[a-z]/, "Password must contain at least one lowercase letter")
            .regex(/[0-9]/, "Password must contain at least one number")
            .regex(/[@$!%*?&#]/, "Password must contain at least one special character")
            .optional(),
    })
    .superRefine((data, ctx) => {
        if (data.mobile === undefined) return;
        if (data.mobile === null || String(data.mobile).trim() === "") return;
        const d = String(data.mobile).replace(/\D/g, "");
        if (d.length < 10 || d.length > 15) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Invalid mobile number",
                path: ["mobile"],
            });
        }
    });

// Role Schemas
export const createRoleSchema = z.object({
    name: z.string().min(2, "Role name must be at least 2 characters"),
    description: z.string().optional(),
    scope: z.enum(["global", "tenant"]),
    permissionIds: z.array(z.number().int().positive()).optional(),
});

export const updateRoleSchema = z.object({
    name: z.string().min(2, "Role name must be at least 2 characters").optional(),
    description: z.string().optional(),
    permissionIds: z.array(z.number().int().positive()).optional(),
});

// Permission Schemas
export const createPermissionSchema = z.object({
    resourceName: z.string().min(2, "Resource name must be at least 2 characters"),
    action: z.enum(["create", "read", "update", "delete", "menu"]),
    description: z.string().optional(),
});

export const updatePermissionSchema = z.object({
    resourceName: z.string().min(2, "Resource name must be at least 2 characters").optional(),
    action: z.enum(["create", "read", "update", "delete", "menu"]).optional(),
    description: z.string().optional(),
});

// Module Schemas
export const createModuleSchema = z.object({
    name: z.string().min(2, "Module name must be at least 2 characters"),
    slug: z
        .string()
        .min(2, "Slug must be at least 2 characters")
        .regex(/^[a-z0-9_]+$/, "Slug can only contain lowercase letters, numbers, and underscores")
        .optional(),
    icon: z.string().max(50).optional(),
    description: z.string().optional(),
    sortOrder: z.number().int().min(0).optional(),
    isActive: z.boolean().optional(),
});

export const updateModuleSchema = z.object({
    name: z.string().min(2, "Module name must be at least 2 characters").optional(),
    slug: z
        .string()
        .min(2, "Slug must be at least 2 characters")
        .regex(/^[a-z0-9_]+$/, "Slug can only contain lowercase letters, numbers, and underscores")
        .optional(),
    icon: z.string().max(50).optional(),
    description: z.string().optional(),
    sortOrder: z.number().int().min(0).optional(),
    isActive: z.boolean().optional(),
});
