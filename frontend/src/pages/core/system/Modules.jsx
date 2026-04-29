import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { moduleApi } from "../../../utils/api/coreapi";
import { RESOURCE, ACTION } from "../../../utils/resources";
import { useAuth } from "../../../contexts/AuthContext";
import { PageHeader } from "../../../components/common/PageHeader";
import { PageContent } from "../../../components/common/PageContent";
import { AppDataTable } from "../../../components/common/AppDataTable";
import { ActionColumnCell } from "../../../components/common/ActionColumnCell";
import { StatusLabel } from "../../../components/common/StatusLabel";
import { useConfirm } from "../../../components/common/ConfirmDialog";
import ExtensionIcon from "@mui/icons-material/Extension";
import AddIcon from "@mui/icons-material/Add";
import Button from "../../../components/ui/Button";
import Modal from "../../../components/ui/Modal";
import Input from "../../../components/ui/Input";
import {
    Box,
    Switch,
    FormControlLabel,
    ToggleButtonGroup,
    ToggleButton,
    Typography,
} from "@mui/material";
import ViewListIcon from "@mui/icons-material/ViewList";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";

const ACTIVE_FILTER = { all: null, active: "true", inactive: "false" };

export default function Modules() {
    const { confirm } = useConfirm();
    const queryClient = useQueryClient();
    const { hasPermission } = useAuth();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedModule, setSelectedModule] = useState(null);
    const [activeFilter, setActiveFilter] = useState("all");

    const { data: modules, isLoading } = useQuery({
        queryKey: ["modules", activeFilter],
        queryFn: () =>
            moduleApi.getAll(
                ACTIVE_FILTER[activeFilter] != null
                    ? { active: ACTIVE_FILTER[activeFilter] }
                    : {},
            ),
    });

    const createMutation = useMutation({
        mutationFn: moduleApi.create,
        onSuccess: () => {
            queryClient.invalidateQueries(["modules"]);
            setIsCreateModalOpen(false);
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => moduleApi.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries(["modules"]);
            setSelectedModule(null);
        },
    });

    const deleteMutation = useMutation({
        mutationFn: moduleApi.delete,
        onSuccess: () => queryClient.invalidateQueries(["modules"]),
    });

    const columns = [
        { field: "name", headerName: "Name", width: 140 },
        {
            field: "slug",
            headerName: "Slug",
            width: 140,
            valueGetter: (_, row) => row.slug || "-",
        },
        {
            field: "icon",
            headerName: "Icon",
            width: 130,
            valueGetter: (_, row) => row.icon || "-",
        },
        { field: "sortOrder", headerName: "Order", width: 80 },
        {
            field: "isActive",
            headerName: "Active",
            width: 90,
            renderCell: (params) => (
                <StatusLabel value={params.row.isActive} variant="active" />
            ),
        },
        {
            field: "actions",
            headerName: "Actions",
            width: 100,
            sortable: false,
            filterable: false,
            renderCell: (params) => (
                <ActionColumnCell
                    params={params}
                    getActions={(row) => [
                        {
                            id: "edit",
                            label: "Edit",
                            resource: RESOURCE.MODULES,
                            action: ACTION.UPDATE,
                            onClick: () => setSelectedModule(row),
                        },
                        {
                            id: "delete",
                            label: "Delete",
                            resource: RESOURCE.MODULES,
                            action: ACTION.DELETE,
                            variant: "danger",
                            onClick: async () => {
                                const ok = await confirm(
                                    "Delete this module? Permissions using this module may be affected.",
                                    {
                                        confirmText: "Delete",
                                        confirmVariant: "danger",
                                    },
                                );
                                if (ok) deleteMutation.mutate(row.id);
                            },
                        },
                    ]}
                />
            ),
        },
    ];

    return (
        <div className="px-4 sm:px-0 flex flex-col gap-4 min-h-0 flex-1">
            <PageHeader
                title="Modules"
                subtitle="Manage navigation modules and permissions"
                icon={<ExtensionIcon fontSize="small" color="primary" />}
                actions={[
                    {
                        label: "Add Module",
                        icon: <AddIcon fontSize="small" />,
                        onClick: () => setIsCreateModalOpen(true),
                        resource: RESOURCE.MODULES,
                        action: ACTION.CREATE,
                        variant: "contained",
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
                        value={activeFilter}
                        exclusive
                        onChange={(_, v) => v != null && setActiveFilter(v)}
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
                        <ToggleButton value="inactive">
                            <CancelIcon sx={{ fontSize: 18, mr: 0.5 }} />
                            Inactive
                        </ToggleButton>
                    </ToggleButtonGroup>
                </Box>
                <AppDataTable
                    rows={modules || []}
                    columns={columns}
                    getRowId={(row) => row.id}
                    loading={isLoading}
                    height={500}
                    enableGlobalSearch={true}
                    globalSearchPlaceholder="Search modules..."
                />

                <CreateModuleModal
                    isOpen={isCreateModalOpen}
                    onClose={() => setIsCreateModalOpen(false)}
                    onSubmit={(data) => createMutation.mutate(data)}
                    isLoading={createMutation.isPending}
                />

                {selectedModule && (
                    <EditModuleModal
                        isOpen={!!selectedModule}
                        onClose={() => setSelectedModule(null)}
                        module={selectedModule}
                        onSubmit={(data) =>
                            updateMutation.mutate({
                                id: selectedModule.id,
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

function CreateModuleModal({ isOpen, onClose, onSubmit, isLoading }) {
    const [formData, setFormData] = useState({
        name: "",
        slug: "",
        icon: "",
        description: "",
        sortOrder: 0,
        isActive: true,
    });

    const handleSlugFromName = (name) => {
        return (
            name
                .toLowerCase()
                .replace(/\s+/g, "_")
                .replace(/[^a-z0-9_]/g, "") || ""
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const slug = formData.slug || handleSlugFromName(formData.name);
        await onSubmit({
            ...formData,
            slug: slug || handleSlugFromName(formData.name),
        });
        setFormData({
            name: "",
            slug: "",
            icon: "",
            description: "",
            sortOrder: 0,
            isActive: true,
        });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Add Module" size="md">
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                    label="Name"
                    name="name"
                    value={formData.name}
                    onChange={(e) =>
                        setFormData({
                            ...formData,
                            name: e.target.value,
                            slug:
                                formData.slug ||
                                handleSlugFromName(e.target.value),
                        })
                    }
                    placeholder="e.g. Tenants"
                    required
                />
                <Input
                    label="Slug"
                    name="slug"
                    value={formData.slug}
                    onChange={(e) =>
                        setFormData({ ...formData, slug: e.target.value })
                    }
                    placeholder="e.g. tenants (used for permissions)"
                />
                <Input
                    label="Icon"
                    name="icon"
                    value={formData.icon}
                    onChange={(e) =>
                        setFormData({ ...formData, icon: e.target.value })
                    }
                    placeholder="e.g. Business (MUI icon name)"
                />
                <Input
                    label="Description"
                    name="description"
                    value={formData.description}
                    onChange={(e) =>
                        setFormData({
                            ...formData,
                            description: e.target.value,
                        })
                    }
                />
                <Input
                    label="Sort Order"
                    name="sortOrder"
                    type="number"
                    value={formData.sortOrder}
                    onChange={(e) =>
                        setFormData({
                            ...formData,
                            sortOrder: parseInt(e.target.value) || 0,
                        })
                    }
                />
                <FormControlLabel
                    control={
                        <Switch
                            checked={formData.isActive}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    isActive: e.target.checked,
                                })
                            }
                            color="primary"
                        />
                    }
                    label="Active"
                />
                <Box
                    sx={{
                        display: "flex",
                        justifyContent: "flex-end",
                        gap: 1,
                        mt: 2,
                    }}
                >
                    <Button variant="secondary" onClick={onClose} type="button">
                        Cancel
                    </Button>
                    <Button type="submit" disabled={isLoading}>
                        {isLoading ? "Creating..." : "Create"}
                    </Button>
                </Box>
            </form>
        </Modal>
    );
}

function EditModuleModal({ isOpen, onClose, module, onSubmit, isLoading }) {
    const [formData, setFormData] = useState({
        name: "",
        slug: "",
        icon: "",
        description: "",
        sortOrder: 0,
        isActive: true,
    });

    useEffect(() => {
        if (module) {
            setFormData({
                name: module.name || "",
                slug: module.slug || "",
                icon: module.icon || "",
                description: module.description || "",
                sortOrder: module.sortOrder ?? 0,
                isActive: module.isActive !== false,
            });
        }
    }, [module]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        await onSubmit(formData);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Edit Module" size="md">
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                    label="Name"
                    name="name"
                    value={formData.name}
                    onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                    }
                    required
                />
                <Input
                    label="Slug"
                    name="slug"
                    value={formData.slug}
                    onChange={(e) =>
                        setFormData({ ...formData, slug: e.target.value })
                    }
                />
                <Input
                    label="Icon"
                    name="icon"
                    value={formData.icon}
                    onChange={(e) =>
                        setFormData({ ...formData, icon: e.target.value })
                    }
                />
                <Input
                    label="Description"
                    name="description"
                    value={formData.description}
                    onChange={(e) =>
                        setFormData({
                            ...formData,
                            description: e.target.value,
                        })
                    }
                />
                <Input
                    label="Sort Order"
                    name="sortOrder"
                    type="number"
                    value={formData.sortOrder}
                    onChange={(e) =>
                        setFormData({
                            ...formData,
                            sortOrder: parseInt(e.target.value) || 0,
                        })
                    }
                />
                <FormControlLabel
                    control={
                        <Switch
                            checked={formData.isActive}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    isActive: e.target.checked,
                                })
                            }
                            color="primary"
                        />
                    }
                    label="Active"
                />
                <Box
                    sx={{
                        display: "flex",
                        justifyContent: "flex-end",
                        gap: 1,
                        mt: 2,
                    }}
                >
                    <Button variant="secondary" onClick={onClose} type="button">
                        Cancel
                    </Button>
                    <Button type="submit" disabled={isLoading}>
                        {isLoading ? "Updating..." : "Update"}
                    </Button>
                </Box>
            </form>
        </Modal>
    );
}
