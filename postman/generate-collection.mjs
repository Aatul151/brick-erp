import { writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const bearer = {
    type: "bearer",
    bearer: [{ key: "token", value: "{{accessToken}}", type: "string" }],
};

const noAuth = { type: "noauth" };

/** @param {string} path - begins with / (e.g. /health) */
function req(name, method, path, options = {}) {
    const { body, auth = bearer, jsonHeaders = true } = options;
    const raw = `{{baseUrl}}/api${path.startsWith("/") ? path : "/" + path}`;
    const r = {
        name,
        request: {
            method,
            header: jsonHeaders && body !== undefined ? [{ key: "Content-Type", value: "application/json" }] : [],
            url: raw,
            auth,
        },
    };
    if (body !== undefined) {
        r.request.body = {
            mode: "raw",
            raw: typeof body === "string" ? body : JSON.stringify(body, null, 2),
        };
    }
    return r;
}

const collection = {
    info: {
        name: "Brick ERP API",
        description:
            "REST API (`/api`). Import the Brick ERP Local environment, set `baseUrl`, `loginEmail`, and `loginPassword`. Run **Auth → Login** to save `accessToken`, `refreshToken`, and `tenantId`. Protected routes use Bearer auth from `accessToken`.",
        schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
    },
    variable: [{ key: "baseUrl", value: "http://localhost:4000" }],
    item: [
        {
            name: "Health",
            item: [req("Health check", "GET", "/health", { auth: noAuth, jsonHeaders: false })],
        },
        {
            name: "Auth",
            item: [
                req("Login", "POST", "/auth/login", {
                    auth: noAuth,
                    body: {
                        email: "{{loginEmail}}",
                        password: "{{loginPassword}}",
                    },
                }),
                req("Logout (Bearer — revokes refresh tokens)", "POST", "/auth/logout", {}),
                req("Logout (no auth)", "POST", "/auth/logout", { auth: noAuth }),
                req("Refresh access token", "POST", "/auth/refresh", {
                    auth: noAuth,
                    body: { refreshToken: "{{refreshToken}}" },
                }),
                req("Request password reset", "POST", "/auth/password-reset/request", {
                    auth: noAuth,
                    body: { email: "{{loginEmail}}" },
                }),
                req("Confirm password reset", "POST", "/auth/password-reset/confirm", {
                    auth: noAuth,
                    body: {
                        token: "{{passwordResetToken}}",
                        newPassword: "NewPassword1@",
                    },
                }),
                req("Get profile", "GET", "/auth/profile", {}),
                req("Update profile", "PUT", "/auth/profile", {
                    body: {
                        fullName: "Updated Name",
                        email: "{{loginEmail}}",
                        mobile: null,
                    },
                }),
            ],
        },
        {
            name: "Tenants",
            item: [
                req("Stats", "GET", "/tenants/stats", {}),
                req("List tenants", "GET", "/tenants", {}),
                req("Get tenant by id", "GET", "/tenants/{{tenantId}}", {}),
                req("Create tenant", "POST", "/tenants", {
                    body: {
                        name: "Acme Corp",
                        subdomain: "acme-{{$timestamp}}",
                    },
                }),
                req("Update tenant", "PUT", "/tenants/{{tenantId}}", {
                    body: { name: "Acme Corp Updated" },
                }),
                req("Update tenant theme (Site Admin)", "PUT", "/tenants/{{tenantId}}/theme", {
                    body: { themeSetting: { primaryColor: "#1976d2" } },
                }),
                req("Update my tenant theme mode", "PUT", "/tenants/my-theme/mode", {
                    body: { mode: "light" },
                }),
                req("Suspend tenant", "POST", "/tenants/{{tenantId}}/suspend", { body: {} }),
                req("Activate tenant", "POST", "/tenants/{{tenantId}}/activate", { body: {} }),
                req("Delete tenant", "DELETE", "/tenants/{{tenantId}}", {}),
            ],
        },
        {
            name: "Users",
            item: [
                req("List users", "GET", "/users", {}),
                req("Get user by id", "GET", "/users/{{userId}}", {}),
                req("Create user", "POST", "/users", {
                    body: {
                        email: "newuser@example.com",
                        password: "Password1@",
                        fullName: "New User",
                        tenantId: "{{tenantId}}",
                        roleIds: [1],
                    },
                }),
                req("Invite user", "POST", "/users/invite", {
                    body: {
                        email: "invited@example.com",
                        fullName: "Invited User",
                        roleIds: [1],
                    },
                }),
                req("Update user", "PUT", "/users/{{userId}}", {
                    body: { fullName: "Updated User Name" },
                }),
                req("Delete user", "DELETE", "/users/{{userId}}", {}),
            ],
        },
        {
            name: "Roles",
            item: [
                req("List roles", "GET", "/roles", {}),
                req("Get role by id", "GET", "/roles/{{roleId}}", {}),
                req("Create role", "POST", "/roles", {
                    body: {
                        name: "Custom Role",
                        description: "Optional",
                        scope: "tenant",
                        permissionIds: [],
                    },
                }),
                req("Update role", "PUT", "/roles/{{roleId}}", {
                    body: { name: "Custom Role Updated" },
                }),
                req("Delete role", "DELETE", "/roles/{{roleId}}", {}),
            ],
        },
        {
            name: "Permissions",
            item: [
                req("List permissions", "GET", "/permissions", {}),
                req("Create permission", "POST", "/permissions", {
                    body: {
                        resourceName: "widgets",
                        action: "read",
                        description: "Read widgets",
                    },
                }),
                req("Update permission", "PUT", "/permissions/{{permissionId}}", {
                    body: { description: "Updated" },
                }),
                req("Delete permission", "DELETE", "/permissions/{{permissionId}}", {}),
            ],
        },
        {
            name: "Modules",
            item: [
                req("List modules", "GET", "/modules", {}),
                req("Get module by id", "GET", "/modules/{{moduleId}}", {}),
                req("Create module", "POST", "/modules", {
                    body: {
                        name: "Sample Module",
                        slug: "sample_module_{{$timestamp}}",
                        icon: "Extension",
                        description: "Optional",
                        sortOrder: 0,
                        isActive: true,
                    },
                }),
                req("Update module", "PUT", "/modules/{{moduleId}}", {
                    body: { description: "Updated module" },
                }),
                req("Delete module", "DELETE", "/modules/{{moduleId}}", {}),
            ],
        },
        {
            name: "Audit logs",
            item: [
                req("List audit logs", "GET", "/audit-logs?tenantId={{tenantId}}&page=1&limit=50", { jsonHeaders: false }),
                req("Audit stats", "GET", "/audit-logs/stats", {}),
            ],
        },
        {
            name: "Form Studio — Definitions",
            item: [
                req("List form definitions", "GET", "/form-definitions", {}),
                req("List form definitions (menu)", "GET", "/form-definitions/menu", {}),
                req("Get form definition by name", "GET", "/form-definitions/name/{{formName}}", {}),
                req("Get form definition by id", "GET", "/form-definitions/{{formDefinitionId}}", {}),
                req("Create form definition", "POST", "/form-definitions", {
                    body: {
                        title: "Sample Form",
                        name: "sample_form_{{$timestamp}}",
                        formType: "custom",
                        collectionName: null,
                        sections: [],
                        settings: {},
                    },
                }),
                req("Update form definition", "PUT", "/form-definitions/{{formDefinitionId}}", {
                    body: { title: "Updated Form Title" },
                }),
                req("Delete form definition", "DELETE", "/form-definitions/{{formDefinitionId}}", {}),
            ],
        },
        {
            name: "Form Studio — Entries",
            item: [
                req("List form entries", "GET", "/form-entries?formName={{formName}}&page=1&limit=10", { jsonHeaders: false }),
                req("Create form entry", "POST", "/form-entries", {
                    body: {
                        formName: "{{formName}}",
                        payload: {},
                    },
                }),
                req("Update form entry", "PUT", "/form-entries/{{formEntryId}}", {
                    body: {
                        formName: "{{formName}}",
                        payload: {},
                    },
                }),
                req("Delete form entry", "DELETE", "/form-entries/{{formEntryId}}?formName={{formName}}", { jsonHeaders: false }),
            ],
        },
        {
            name: "Form Studio — Media",
            item: [
                {
                    name: "Upload files (multipart)",
                    request: {
                        method: "POST",
                        header: [],
                        body: {
                            mode: "formdata",
                            formdata: [
                                {
                                    key: "files",
                                    type: "file",
                                    src: [],
                                    description: "One or more files (max 20 per request)",
                                },
                            ],
                        },
                        url: "{{baseUrl}}/api/form-media/file-upload",
                        auth: bearer,
                    },
                },
                req("Download file by public id", "GET", "/form-media/files/{{filePublicId}}", { jsonHeaders: false }),
            ],
        },
    ],
};

const authFolder = collection.item.find((f) => f.name === "Auth");
const loginItem = authFolder.item.find((i) => i.name === "Login");
loginItem.event = [
    {
        listen: "test",
        script: {
            exec: [
                "if (pm.response.code === 200) {",
                "    const j = pm.response.json();",
                "    if (j.accessToken) pm.environment.set('accessToken', j.accessToken);",
                "    if (j.refreshToken) pm.environment.set('refreshToken', j.refreshToken);",
                "    if (j.user && j.user.tenantId) pm.environment.set('tenantId', j.user.tenantId);",
                "    if (j.user && j.user.id != null) pm.environment.set('userId', String(j.user.id));",
                "}",
            ],
            type: "text/javascript",
        },
    },
];

writeFileSync(join(__dirname, "Brick-ERP-API.postman_collection.json"), JSON.stringify(collection, null, 2), "utf8");
console.log("Wrote Brick-ERP-API.postman_collection.json");
