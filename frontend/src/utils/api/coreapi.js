const API_URL = import.meta.env.VITE_API_URL;

const getAuthHeaders = () => {
    const token = localStorage.getItem("accessToken");
    return {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
    };
};

const handleResponse = async (response) => {
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        if (response.status === 403) {
            localStorage.removeItem("accessToken");
            localStorage.removeItem("refreshToken");
            localStorage.removeItem("user");
            window.location.href = "/login";
        }
        throw new Error(data.error || data.message || "Request failed");
    }

    return data;
};

export const api = {
    async get(endpoint) {
        const response = await fetch(`${API_URL}${endpoint}`, {
            method: "GET",
            headers: getAuthHeaders(),
        });
        return handleResponse(response);
    },

    async post(endpoint, data) {
        const response = await fetch(`${API_URL}${endpoint}`, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify(data),
        });
        return handleResponse(response);
    },

    async put(endpoint, data) {
        const response = await fetch(`${API_URL}${endpoint}`, {
            method: "PUT",
            headers: getAuthHeaders(),
            body: JSON.stringify(data),
        });
        return handleResponse(response);
    },

    async delete(endpoint) {
        const response = await fetch(`${API_URL}${endpoint}`, {
            method: "DELETE",
            headers: getAuthHeaders(),
        });
        return handleResponse(response);
    },

    /** GET that returns a Blob (e.g. CSV export). */
    async getBlob(endpoint) {
        const response = await fetch(`${API_URL}${endpoint}`, {
            method: "GET",
            headers: getAuthHeaders(),
        });
        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            if (response.status === 403) {
                localStorage.removeItem("accessToken");
                localStorage.removeItem("refreshToken");
                localStorage.removeItem("user");
                window.location.href = "/login";
            }
            throw new Error(data.error || data.message || "Request failed");
        }
        return response.blob();
    },
};

/** Unwrap `{ data: T }` API envelopes (saas-core style). */
function unwrapData(body) {
    if (body && typeof body === "object" && "data" in body && body.data !== undefined) {
        return body.data;
    }
    return body;
}

/**
 * Form definitions — matches saas-core `/form-definitions` contract.
 * Backend routes can be added to saas-client API later.
 */
export const formsApi = {
    getAll: async () => {
        const body = await api.get("/api/form-definitions");
        return unwrapData(body);
    },
    getMenu: async () => {
        const body = await api.get("/api/form-definitions/menu");
        return unwrapData(body);
    },
    getById: async (id) => {
        const body = await api.get(`/api/form-definitions/${id}`);
        return unwrapData(body);
    },
    getByName: async (name) => {
        const body = await api.get(`/api/form-definitions/name/${encodeURIComponent(name)}`);
        return unwrapData(body);
    },
    create: async (form) => {
        const body = await api.post("/api/form-definitions", form);
        return unwrapData(body);
    },
    update: async (id, form) => {
        const body = await api.put(`/api/form-definitions/${id}`, form);
        return unwrapData(body);
    },
    delete: async (id) => {
        await api.delete(`/api/form-definitions/${id}`);
    },
};

export const formEntriesApi = {
    getAll: async ({ formName, page = 1, limit = 10, fields, filters, scope }) => {
        const params = new URLSearchParams({
            formName: String(formName),
            page: String(page),
            limit: String(limit),
        });
        if (fields?.length) params.set("fields", fields.join(","));
        if (filters && Object.keys(filters).length > 0) params.set("filters", JSON.stringify(filters));
        if (scope) params.set("scope", String(scope));
        const body = await api.get(`/api/form-entries?${params}`);
        // Expected: { data: rows[], pagination } (do not use unwrap — would drop pagination)
        const rows = Array.isArray(body?.data) ? body.data : Array.isArray(body) ? body : [];
        const pagination = body?.pagination;
        if (pagination) {
            return { data: rows, pagination };
        }
        return {
            data: rows,
            pagination: {
                currentPage: page,
                limit,
                total: rows.length,
                totalPages: 1,
                hasNextPage: false,
                hasPrevPage: false,
            },
        };
    },
    create: async (payload) => {
        const body = await api.post("/api/form-entries", payload);
        return unwrapData(body);
    },
    update: async (entryId, payload, scope) => {
        const params = new URLSearchParams();
        if (scope) params.set("scope", String(scope));
        const suffix = params.toString() ? `?${params}` : "";
        const body = await api.put(`/api/form-entries/${entryId}${suffix}`, payload);
        return unwrapData(body);
    },
    delete: async (entryId, formName, scope) => {
        const params = new URLSearchParams({ formName });
        if (scope) params.set("scope", String(scope));
        await api.delete(`/api/form-entries/${entryId}?${params}`);
    },
};

export const fileUploadApi = {
    /** @param {string} [recordId] - Form entry id for path uploads/.../record_id; omit or use 'draft' for new entries */
    uploadFiles: async (formName, fieldName, files, recordId) => {
        const token = localStorage.getItem("accessToken");
        const formData = new FormData();
        formData.append("formName", formName);
        formData.append("fieldName", fieldName);
        const rid = recordId != null && String(recordId).trim() !== "" ? String(recordId).trim() : "draft";
        formData.append("recordId", rid);
        files.forEach((file) => formData.append("files", file));
        const response = await fetch(`${API_URL}/api/form-media/file-upload`, {
            method: "POST",
            headers: {
                ...(token && { Authorization: `Bearer ${token}` }),
            },
            body: formData,
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(data.error || data.message || "Upload failed");
        }
        return unwrapData(data);
    },
};

export const authApi = {
    login: (credentials) => api.post("/api/auth/login", credentials),
    logout: () => api.post("/api/auth/logout", {}),
    getProfile: () => api.get("/api/auth/profile"),
    updateProfile: (data) => api.put("/api/auth/profile", data),
    requestPasswordReset: (email) => api.post("/api/auth/password-reset/request", { email }),
    resetPassword: (data) => api.post("/api/auth/password-reset/confirm", data),
};

export const tenantApi = {
    getAll: (params) => api.get(`/api/tenants?${new URLSearchParams(params)}`),
    getOne: (id) => api.get(`/api/tenants/${id}`),
    create: (data) => api.post("/api/tenants", data),
    update: (id, data) => api.put(`/api/tenants/${id}`, data),
    updateThemeSetting: (id, themeSetting) => api.put(`/api/tenants/${id}/theme`, { themeSetting }),
    updateMyTenantThemeMode: (mode) => api.put("/api/tenants/my-theme/mode", { mode }),
    suspend: (id) => api.post(`/api/tenants/${id}/suspend`, {}),
    activate: (id) => api.post(`/api/tenants/${id}/activate`, {}),
    delete: (id) => api.delete(`/api/tenants/${id}`),
    getStats: () => api.get("/api/tenants/stats"),
};

export const userApi = {
    getAll: (params) => api.get(`/api/users?${new URLSearchParams(params)}`),
    getOne: (id) => api.get(`/api/users/${id}`),
    create: (data) => api.post("/api/users", data),
    update: (id, data) => api.put(`/api/users/${id}`, data),
    delete: (id) => api.delete(`/api/users/${id}`),
    invite: (data) => api.post("/api/users/invite", data),
};

export const roleApi = {
    getAll: () => api.get("/api/roles"),
    getOne: (id) => api.get(`/api/roles/${id}`),
    create: (data) => api.post("/api/roles", data),
    update: (id, data) => api.put(`/api/roles/${id}`, data),
    delete: (id) => api.delete(`/api/roles/${id}`),
};

export const permissionApi = {
    getAll: () => api.get("/api/permissions"),
    create: (data) => api.post("/api/permissions", data),
    update: (id, data) => api.put(`/api/permissions/${id}`, data),
    delete: (id) => api.delete(`/api/permissions/${id}`),
};

export const moduleApi = {
    getAll: (params) => api.get(`/api/modules?${new URLSearchParams(params || {})}`),
    getOne: (id) => api.get(`/api/modules/${id}`),
    create: (data) => api.post("/api/modules", data),
    update: (id, data) => api.put(`/api/modules/${id}`, data),
    delete: (id) => api.delete(`/api/modules/${id}`),
};

export const auditApi = {
    getAll: (params) => api.get(`/api/audit-logs?${new URLSearchParams(params)}`),
    getStats: () => api.get("/api/audit-logs/stats"),
};
