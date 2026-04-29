import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tenantApi } from "../../../utils/api/coreapi";
import { RESOURCE, ACTION } from "../../../utils/resources";
import { formatDate } from "../../../utils/dateFormat";
import { useAuth } from "../../../contexts/AuthContext";
import { PageHeader } from "../../../components/common/PageHeader";
import { PageContent } from "../../../components/common/PageContent";
import { AppDataTable } from "../../../components/common/AppDataTable";
import { ActionColumnCell } from "../../../components/common/ActionColumnCell";
import { StatusLabel } from "../../../components/common/StatusLabel";
import { useConfirm } from "../../../components/common/ConfirmDialog";
import BusinessIcon from "@mui/icons-material/Business";
import AddIcon from "@mui/icons-material/Add";
import {
    Box,
    Typography,
    Switch,
    FormControlLabel,
    ToggleButtonGroup,
    ToggleButton,
} from "@mui/material";
import ViewListIcon from "@mui/icons-material/ViewList";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import BlockIcon from "@mui/icons-material/Block";
import Button from "../../../components/ui/Button";
import Modal from "../../../components/ui/Modal";
import Input from "../../../components/ui/Input";
import Select from "../../../components/ui/Select";
import CheckIcon from "@mui/icons-material/Check";

export default function Tenants() {
    const { confirm } = useConfirm();
    const queryClient = useQueryClient();
    const { hasPermission } = useAuth();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedTenant, setSelectedTenant] = useState(null);
    const [themeTenant, setThemeTenant] = useState(null);
    const [statusFilter, setStatusFilter] = useState("all");

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const status = params.get("status");
        if (status && ["all", "active", "suspended"].includes(status)) {
            setStatusFilter(status);
        }
    }, []);

    const { data, isLoading } = useQuery({
        queryKey: ["tenants", statusFilter],
        queryFn: () =>
            tenantApi.getAll(
                statusFilter === "all" ? {} : { status: statusFilter },
            ),
    });

    const createMutation = useMutation({
        mutationFn: tenantApi.create,
        onSuccess: () => {
            queryClient.invalidateQueries(["tenants"]);
            setIsCreateModalOpen(false);
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => tenantApi.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries(["tenants"]);
            setSelectedTenant(null);
        },
    });

    const suspendMutation = useMutation({
        mutationFn: tenantApi.suspend,
        onSuccess: () => queryClient.invalidateQueries(["tenants"]),
    });

    const activateMutation = useMutation({
        mutationFn: tenantApi.activate,
        onSuccess: () => queryClient.invalidateQueries(["tenants"]),
    });

    const deleteMutation = useMutation({
        mutationFn: tenantApi.delete,
        onSuccess: () => queryClient.invalidateQueries(["tenants"]),
    });

    const updateThemeMutation = useMutation({
        mutationFn: ({ id, themeSetting }) =>
            tenantApi.updateThemeSetting(id, themeSetting),
        onSuccess: () => {
            queryClient.invalidateQueries(["tenants"]);
            setThemeTenant(null);
        },
    });

    const columns = [
        { field: "name", headerName: "Name", flex: 1, minWidth: 150 },
        {
            field: "subdomain",
            headerName: "Subdomain",
            width: 130,
            valueGetter: (_, row) => row.subdomain || "-",
        },
        {
            field: "status",
            headerName: "Status",
            width: 110,
            renderCell: (params) => (
                <StatusLabel value={params.row.status} variant="status" />
            ),
        },
        { field: "userCount", headerName: "Users", width: 80 },
        {
            field: "createdAt",
            headerName: "Created",
            width: 120,
            valueGetter: (_, row) => formatDate(row.createdAt),
        },
        {
            field: "actions",
            headerName: "Actions",
            width: 120,
            sortable: false,
            filterable: false,
            renderCell: (params) => (
                <ActionColumnCell
                    params={params}
                    getActions={(row) => [
                        {
                            id: "edit",
                            label: "Edit",
                            resource: RESOURCE.TENANTS,
                            action: ACTION.UPDATE,
                            onClick: () => setSelectedTenant(row),
                        },
                        {
                            id: "delete",
                            label: "Delete",
                            resource: RESOURCE.TENANTS,
                            action: ACTION.DELETE,
                            variant: "danger",
                            onClick: async () => {
                                const ok = await confirm(
                                    "Delete this tenant? This action cannot be undone.",
                                    {
                                        confirmText: "Delete",
                                        confirmVariant: "danger",
                                    },
                                );
                                if (ok) deleteMutation.mutate(row.id);
                            },
                        },
                        {
                            id: "setupTheme",
                            label: "Setup Theme",
                            resource: RESOURCE.TENANTS,
                            action: ACTION.UPDATE,
                            onClick: () => setThemeTenant(row),
                        },
                        ...(row.status === "active"
                            ? [
                                  {
                                      id: "suspend",
                                      label: "Suspend",
                                      resource: RESOURCE.TENANTS,
                                      action: ACTION.UPDATE,
                                      variant: "danger",
                                      dividerBefore: true,
                                      onClick: async () => {
                                          const ok = await confirm(
                                              "Suspend this tenant?",
                                              {
                                                  confirmText: "Suspend",
                                                  confirmVariant: "danger",
                                              },
                                          );
                                          if (ok)
                                              suspendMutation.mutate(row.id);
                                      },
                                  },
                              ]
                            : [
                                  {
                                      id: "activate",
                                      label: "Activate",
                                      resource: RESOURCE.TENANTS,
                                      action: ACTION.UPDATE,
                                      variant: "success",
                                      dividerBefore: true,
                                      onClick: () =>
                                          activateMutation.mutate(row.id),
                                  },
                              ]),
                    ]}
                />
            ),
        },
    ];

    return (
        <div className="px-4 sm:px-0 flex flex-col gap-4 min-h-0 flex-1">
            <PageHeader
                title="Tenants"
                subtitle="Manage organizations and their settings"
                icon={<BusinessIcon fontSize="small" color="primary" />}
                actions={[
                    {
                        label: "Create Tenant",
                        icon: <AddIcon fontSize="small" />,
                        onClick: () => setIsCreateModalOpen(true),
                        resource: RESOURCE.TENANTS,
                        action: ACTION.CREATE,
                        variant: "contained",
                        primary: true,
                    },
                ]}
            />
            <PageContent>
                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 2,
                        mb: 2,
                        flexWrap: "wrap",
                    }}
                >
                    <ToggleButtonGroup
                        value={statusFilter}
                        exclusive
                        onChange={(_, v) => v != null && setStatusFilter(v)}
                        size="small"
                        color="primary"
                        sx={{
                            "& .MuiToggleButton-root": {
                                py: 0.5,
                                px: 1.5,
                                textTransform: "none",
                            },
                        }}
                    >
                        <ToggleButton value="all">
                            <ViewListIcon sx={{ fontSize: 18, mr: 0.5 }} />
                            All
                        </ToggleButton>
                        <ToggleButton value="active">
                            <CheckCircleIcon sx={{ fontSize: 18, mr: 0.5 }} />
                            Active
                        </ToggleButton>
                        <ToggleButton value="suspended">
                            <BlockIcon sx={{ fontSize: 18, mr: 0.5 }} />
                            Suspended
                        </ToggleButton>
                    </ToggleButtonGroup>
                </Box>

                <AppDataTable
                    rows={data?.tenants || []}
                    columns={columns}
                    getRowId={(row) => row.id}
                    loading={isLoading}
                    height={500}
                />

                <CreateTenantModal
                    isOpen={isCreateModalOpen}
                    onClose={() => setIsCreateModalOpen(false)}
                    onSubmit={(data) => createMutation.mutate(data)}
                    isLoading={createMutation.isPending}
                />

                {themeTenant && (
                    <TenantThemeModal
                        isOpen={!!themeTenant}
                        onClose={() => setThemeTenant(null)}
                        tenant={themeTenant}
                        onSubmit={(themeSetting) =>
                            updateThemeMutation.mutate({
                                id: themeTenant.id,
                                themeSetting,
                            })
                        }
                        isLoading={updateThemeMutation.isPending}
                    />
                )}
                {selectedTenant && (
                    <EditTenantModal
                        isOpen={!!selectedTenant}
                        onClose={() => setSelectedTenant(null)}
                        tenant={selectedTenant}
                        onSubmit={(data) =>
                            updateMutation.mutate({
                                id: selectedTenant.id,
                                data,
                            })
                        }
                        isLoading={updateMutation.isPending}
                    />
                )}
            </PageContent>
        </div>
    );
}

const PREDEFINED_THEMES = [
    { primaryColor: "#2563eb", secondaryColor: "#64748b", name: "Blue" },
    { primaryColor: "#2196f3", secondaryColor: "#f50057", name: "Blue Pink" },
    {
        primaryColor: "#4caf50",
        secondaryColor: "#ff9800",
        name: "Green Orange",
    },
    { primaryColor: "#9c27b0", secondaryColor: "#e91e63", name: "Purple Pink" },
    { primaryColor: "#00bcd4", secondaryColor: "#3f51b5", name: "Cyan Indigo" },
    { primaryColor: "#f44336", secondaryColor: "#ff9800", name: "Red Orange" },
    {
        primaryColor: "#03a9f4",
        secondaryColor: "#9c27b0",
        name: "Light Blue Purple",
    },
    {
        primaryColor: "#e91e63",
        secondaryColor: "#ff4081",
        name: "Pink Magenta",
    },
    {
        primaryColor: "#ff6f00",
        secondaryColor: "#ffc107",
        name: "Orange Amber",
    },
    { primaryColor: "#3f51b5", secondaryColor: "#00bcd4", name: "Indigo Cyan" },
];

function TenantThemeModal({ isOpen, onClose, tenant, onSubmit, isLoading }) {
    const existing =
        tenant?.themeSetting && typeof tenant.themeSetting === "object"
            ? tenant.themeSetting
            : {};
    const [mode, setMode] = useState(existing.mode ?? "light");
    const [primaryColor, setPrimaryColor] = useState(
        existing.primaryColor ?? "#2563eb",
    );
    const [secondaryColor, setSecondaryColor] = useState(
        existing.secondaryColor ?? "#64748b",
    );
    const [error, setError] = useState("");

    useEffect(() => {
        if (isOpen && tenant) {
            const ex =
                tenant.themeSetting && typeof tenant.themeSetting === "object"
                    ? tenant.themeSetting
                    : {};
            setMode(ex.mode ?? "light");
            setPrimaryColor(ex.primaryColor ?? "#2563eb");
            setSecondaryColor(ex.secondaryColor ?? "#64748b");
        }
    }, [isOpen, tenant]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        try {
            await onSubmit({ mode, primaryColor, secondaryColor });
        } catch (err) {
            setError(err.message);
        }
    };

    const isActive = (cfg) =>
        cfg.primaryColor === primaryColor &&
        cfg.secondaryColor === secondaryColor;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Setup Theme - ${tenant?.name}`}
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                        {error}
                    </div>
                )}
                <Box sx={{ mb: 2 }}>
                    <Typography
                        variant="caption"
                        sx={{
                            fontSize: "0.75rem",
                            color: "text.secondary",
                            fontWeight: 500,
                        }}
                    >
                        Mode
                    </Typography>
                    <FormControlLabel
                        control={
                            <Switch
                                checked={mode === "dark"}
                                onChange={(e) =>
                                    setMode(e.target.checked ? "dark" : "light")
                                }
                                size="small"
                            />
                        }
                        label={mode === "dark" ? "Dark" : "Light"}
                        sx={{
                            mt: 0.5,
                            display: "block",
                            "& .MuiFormControlLabel-label": {
                                fontSize: "0.875rem",
                            },
                        }}
                    />
                </Box>
                <Box sx={{ mb: 2 }}>
                    <Typography
                        variant="caption"
                        sx={{
                            fontSize: "0.75rem",
                            color: "text.secondary",
                            fontWeight: 500,
                            display: "block",
                            mb: 1,
                        }}
                    >
                        Theme Colors
                    </Typography>
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                        {PREDEFINED_THEMES.map((cfg, i) => (
                            <Box
                                key={i}
                                sx={{
                                    position: "relative",
                                    width: 40,
                                    height: 40,
                                    borderRadius: "50%",
                                    background: `linear-gradient(135deg, ${cfg.primaryColor} 0%, ${cfg.secondaryColor} 100%)`,
                                    cursor: "pointer",
                                    border: `2px solid ${isActive(cfg) ? "#2563eb" : "transparent"}`,
                                    flexShrink: 0,
                                    "&:hover": { transform: "scale(1.1)" },
                                }}
                                onClick={() => {
                                    setPrimaryColor(cfg.primaryColor);
                                    setSecondaryColor(cfg.secondaryColor);
                                }}
                                title={cfg.name}
                            >
                                {isActive(cfg) && (
                                    <CheckIcon
                                        sx={{
                                            position: "absolute",
                                            top: "50%",
                                            left: "50%",
                                            transform: "translate(-50%, -50%)",
                                            color: "white",
                                            fontSize: 20,
                                            filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.5))",
                                        }}
                                    />
                                )}
                            </Box>
                        ))}
                    </Box>
                </Box>
                <div className="flex justify-end space-x-3 mt-6">
                    <Button variant="secondary" onClick={onClose} type="button">
                        Cancel
                    </Button>
                    <Button type="submit" disabled={isLoading}>
                        {isLoading ? "Saving..." : "Save Theme"}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}

function CreateTenantModal({ isOpen, onClose, onSubmit, isLoading }) {
    const [formData, setFormData] = useState({ name: "", subdomain: "" });
    const [error, setError] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        try {
            await onSubmit(formData);
            setFormData({ name: "", subdomain: "" });
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Create New Tenant">
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                        {error}
                    </div>
                )}
                <Input
                    label="Tenant Name"
                    name="name"
                    value={formData.name}
                    onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                    }
                    required
                />
                <Input
                    label="Subdomain"
                    name="subdomain"
                    value={formData.subdomain}
                    onChange={(e) =>
                        setFormData({ ...formData, subdomain: e.target.value })
                    }
                    placeholder="e.g., acme-corp"
                />
                <div className="flex justify-end space-x-3 mt-6">
                    <Button variant="secondary" onClick={onClose} type="button">
                        Cancel
                    </Button>
                    <Button type="submit" disabled={isLoading}>
                        {isLoading ? "Creating..." : "Create Tenant"}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}

function EditTenantModal({ isOpen, onClose, tenant, onSubmit, isLoading }) {
    const [formData, setFormData] = useState({
        name: tenant.name,
        subdomain: tenant.subdomain || "",
        status: tenant.status,
    });
    const [error, setError] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        try {
            await onSubmit(formData);
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Edit Tenant">
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                        {error}
                    </div>
                )}
                <Input
                    label="Tenant Name"
                    name="name"
                    value={formData.name}
                    onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                    }
                    required
                />
                <Input
                    label="Subdomain"
                    name="subdomain"
                    value={formData.subdomain}
                    onChange={(e) =>
                        setFormData({ ...formData, subdomain: e.target.value })
                    }
                />
                <Select
                    label="Status"
                    name="status"
                    value={formData.status}
                    onChange={(e) =>
                        setFormData({ ...formData, status: e.target.value })
                    }
                    options={[
                        { value: "active", label: "Active" },
                        { value: "suspended", label: "Suspended" },
                    ]}
                />
                <div className="flex justify-end space-x-3 mt-6">
                    <Button variant="secondary" onClick={onClose} type="button">
                        Cancel
                    </Button>
                    <Button type="submit" disabled={isLoading}>
                        {isLoading ? "Updating..." : "Update Tenant"}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
