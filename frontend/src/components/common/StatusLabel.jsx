/**
 * StatusLabel - Reusable status/chip label matching original UI
 * Uses same Tailwind classes as previous inline implementations.
 *
 * @param {string|boolean} value - Raw value (e.g. 'active', 'inactive', true, 'global', 'tenant')
 * @param {string} [variant='status'] - Preset mapping:
 *   - 'status': user/tenant (active=green, inactive=yellow, else=red)
 *   - 'scope': role (global=purple, tenant=blue)
 *   - 'active': module (true=green, false=gray)
 *   - 'action': audit log (blue)
 * @param {string} [label] - Override display text
 */
export function StatusLabel({ value, variant = "status", label }) {
    const getConfig = () => {
        switch (variant) {
            case "status": {
                const v = String(value || "").toLowerCase();
                if (v === "active")
                    return {
                        className: "bg-green-100 text-green-800",
                        label: label ?? "Active",
                    };
                if (v === "inactive")
                    return {
                        className: "bg-yellow-100 text-yellow-800",
                        label: label ?? "Inactive",
                    };
                return {
                    className: "bg-red-100 text-red-800",
                    label: label ?? (value ? String(value).charAt(0).toUpperCase() + String(value).slice(1).toLowerCase() : "Suspended"),
                };
            }
            case "scope": {
                const v = String(value || "").toLowerCase();
                if (v === "global")
                    return {
                        className: "bg-purple-100 text-purple-800",
                        label: label ?? "Global",
                    };
                if (v === "tenant")
                    return {
                        className: "bg-blue-100 text-blue-800",
                        label: label ?? "Tenant",
                    };
                return {
                    className: "bg-gray-100 text-gray-600",
                    label: label ?? (value ? String(value).charAt(0).toUpperCase() + String(value).slice(1).toLowerCase() : "-"),
                };
            }
            case "active": {
                const isActive = value === true || value === "true";
                return {
                    className: isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600",
                    label: label ?? (isActive ? "Yes" : "No"),
                };
            }
            case "action": {
                const v = String(value || "");
                return {
                    className: "bg-blue-100 text-blue-800",
                    label: label ?? v,
                };
            }
            default:
                return {
                    className: "bg-gray-100 text-gray-600",
                    label: label ?? value ?? "-",
                };
        }
    };

    const { className, label: displayLabel } = getConfig();

    return <span className={`px-2 py-1 text-xs font-semibold rounded-full ${className}`}>{displayLabel}</span>;
}
