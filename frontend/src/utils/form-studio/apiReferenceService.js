import { api, roleApi, userApi } from "../api/coreapi";

/**
 * Options for apiReference fields (aligned with saas-core admin).
 */
export const apiReferenceService = {
    async fetchOptions(endpoint, labelField, valueField = "id") {
        const ep = endpoint?.replace(/^\//, "") || "";

        try {
            if (ep === "roles" || endpoint === "/roles") {
                const body = await roleApi.getAll();
                const list = Array.isArray(body) ? body : body?.roles || body?.data || [];
                return list.map((item) => ({
                    label: String(item[labelField] ?? item.name ?? item.id ?? ""),
                    value: String(item[valueField] ?? item.id ?? ""),
                }));
            }

            if (ep === "users" || endpoint === "/users") {
                const body = await userApi.getAll({});
                const list = body?.users || body?.data || (Array.isArray(body) ? body : []);
                return list.map((item) => ({
                    label: String(item[labelField] ?? item.fullName ?? item.email ?? item.id ?? "Unknown"),
                    value: String(item[valueField] ?? item.id ?? ""),
                }));
            }

            const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
            const body = await api.get(`/api${path}?${new URLSearchParams({ page: "1", limit: "1000" })}`);
            const data = body?.data ?? (Array.isArray(body) ? body : []);
            return data.map((item) => ({
                label: String(item[labelField] ?? item.name ?? item.title ?? item.id ?? "Unknown"),
                value: String(item[valueField] ?? item.id ?? ""),
            }));
        } catch (e) {
            console.error(`apiReferenceService.fetchOptions(${endpoint}):`, e);
            return [];
        }
    },

    getAvailableEndpoints() {
        return [
            { value: "/roles", label: "Roles", referenceModel: "Role" },
            { value: "/users", label: "Users", referenceModel: "User" },
        ];
    },
};
