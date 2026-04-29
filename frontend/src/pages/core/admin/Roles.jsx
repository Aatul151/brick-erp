import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { roleApi } from "../../../utils/api/coreapi";
import { RESOURCE, ACTION } from "../../../utils/resources";
import { useAuth } from "../../../contexts/AuthContext";
import { PageHeader } from "../../../components/common/PageHeader";
import { PageContent } from "../../../components/common/PageContent";
import { AppDataTable } from "../../../components/common/AppDataTable";
import { ActionColumnCell } from "../../../components/common/ActionColumnCell";
import { StatusLabel } from "../../../components/common/StatusLabel";
import { useConfirm } from "../../../components/common/ConfirmDialog";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import AddIcon from "@mui/icons-material/Add";
import Button from "../../../components/ui/Button";
import Modal from "../../../components/ui/Modal";
import Input from "../../../components/ui/Input";
import Select from "../../../components/ui/Select";

export default function Roles() {
    const { confirm } = useConfirm();
    const queryClient = useQueryClient();
    const { hasPermission } = useAuth();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedRole, setSelectedRole] = useState(null);

    const { data: roles, isLoading } = useQuery({
        queryKey: ["roles"],
        queryFn: roleApi.getAll,
    });

    const createMutation = useMutation({
        mutationFn: roleApi.create,
        onSuccess: () => {
            queryClient.invalidateQueries(["roles"]);
            setIsCreateModalOpen(false);
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => roleApi.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries(["roles"]);
            setSelectedRole(null);
        },
    });

    const deleteMutation = useMutation({
        mutationFn: roleApi.delete,
        onSuccess: () => queryClient.invalidateQueries(["roles"]),
    });
    const columns = [
        { field: "name", headerName: "Name", flex: 1, minWidth: 120 },
        {
            field: "description",
            headerName: "Description",
            width: 200,
            valueGetter: (_, row) => row.description || "-",
        },
        {
            field: "scope",
            headerName: "Scope",
            width: 100,
            renderCell: (params) => <StatusLabel value={params.row.scope} variant="scope" />,
        },
        { field: "userCount", headerName: "Users", width: 80 },
        {
            field: "permissions",
            headerName: "Permissions",
            width: 110,
            valueGetter: (_, row) => row.permissions?.length || 0,
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
                            resource: RESOURCE.ROLES,
                            action: ACTION.UPDATE,
                            onClick: () => setSelectedRole(row),
                        },
                        {
                            id: "delete",
                            label: "Delete",
                            resource: RESOURCE.ROLES,
                            action: ACTION.DELETE,
                            variant: "danger",
                            disabled: parseInt(row.userCount) > 0,
                            onClick: async () => {
                                const ok = await confirm("Delete this role? This action cannot be undone.", {
                                    confirmText: "Delete",
                                    confirmVariant: "danger",
                                });
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
                title="Roles"
                subtitle="Create and manage roles"
                icon={<AdminPanelSettingsIcon fontSize="small" color="primary" />}
                actions={[
                    {
                        label: "Create Role",
                        icon: <AddIcon fontSize="small" />,
                        onClick: () => setIsCreateModalOpen(true),
                        resource: RESOURCE.ROLES,
                        action: ACTION.CREATE,
                        variant: "contained",
                    },
                ]}
            />
            <PageContent>
                <AppDataTable rows={roles || []} columns={columns} getRowId={(row) => row.id} loading={isLoading} height={500} />

                <CreateRoleModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} onSubmit={(data) => createMutation.mutate(data)} isLoading={createMutation.isPending} />

                {selectedRole && (
                    <EditRoleModal
                        isOpen={!!selectedRole}
                        onClose={() => setSelectedRole(null)}
                        role={selectedRole}
                        onSubmit={(data) => updateMutation.mutate({ id: selectedRole.id, data })}
                        isLoading={updateMutation.isPending}
                    />
                )}
            </PageContent>
        </div>
    );
}

function CreateRoleModal({ isOpen, onClose, onSubmit, isLoading }) {
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        scope: "tenant",
    });
    const [error, setError] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        try {
            await onSubmit({ ...formData, permissionIds: [] });
            setFormData({ name: "", description: "", scope: "tenant" });
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Create New Role" size="md">
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div>}
                <Input label="Role Name" name="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
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
                <Select
                    label="Scope"
                    name="scope"
                    value={formData.scope}
                    onChange={(e) => setFormData({ ...formData, scope: e.target.value })}
                    options={[
                        { value: "global", label: "Global (System-wide)" },
                        {
                            value: "tenant",
                            label: "Tenant (Organization-level)",
                        },
                    ]}
                    required
                />
                <div className="flex justify-end space-x-3 mt-6">
                    <Button variant="secondary" onClick={onClose} type="button">
                        Cancel
                    </Button>
                    <Button type="submit" disabled={isLoading}>
                        {isLoading ? "Creating..." : "Create Role"}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}

function EditRoleModal({ isOpen, onClose, role, onSubmit, isLoading }) {
    const [formData, setFormData] = useState({
        name: role.name,
        description: role.description || "",
    });
    const [error, setError] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        try {
            const permissionIds = (role.permissions || []).map((p) => p.permissionId);
            await onSubmit({ ...formData, permissionIds });
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Edit Role" size="md">
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div>}
                <Input label="Role Name" name="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
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
                <div className="flex justify-end space-x-3 mt-6">
                    <Button variant="secondary" onClick={onClose} type="button">
                        Cancel
                    </Button>
                    <Button type="submit" disabled={isLoading}>
                        {isLoading ? "Updating..." : "Update Role"}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
