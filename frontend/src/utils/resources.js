/**
 * Resource names for permission checks.
 * Use these constants instead of string literals for consistency.
 * It's module slug for permission checks.
 */
export const RESOURCE = {
    TENANTS: "tenants",
    USERS: "users",
    ROLES: "roles",
    PERMISSIONS: "permissions",
    MODULES: "modules",
    AUDIT_LOGS: "audit_logs",
    SETTINGS: "settings",
    FORM_STUDIO: "form_studio",
};

/**
 * Action types for permission checks.
 */
export const ACTION = {
    MENU: "menu",
    READ: "read",
    CREATE: "create",
    UPDATE: "update",
    DELETE: "delete",
};
