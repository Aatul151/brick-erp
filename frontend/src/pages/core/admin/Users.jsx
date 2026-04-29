import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { userApi, roleApi, tenantApi } from "../../../utils/api/coreapi";
import { RESOURCE, ACTION } from "../../../utils/resources";
import { formatDate } from "../../../utils/dateFormat";
import { useAuth } from "../../../contexts/AuthContext";
import { PageHeader } from "../../../components/common/PageHeader";
import { PageContent } from "../../../components/common/PageContent";
import { AppDataTable } from "../../../components/common/AppDataTable";
import { ActionColumnCell } from "../../../components/common/ActionColumnCell";
import { StatusLabel } from "../../../components/common/StatusLabel";
import { useConfirm } from "../../../components/common/ConfirmDialog";
import PeopleIcon from "@mui/icons-material/People";
import AddIcon from "@mui/icons-material/Add";
import MailOutlinedIcon from "@mui/icons-material/MailOutlined";
import { Box, ToggleButtonGroup, ToggleButton } from "@mui/material";
import ViewListIcon from "@mui/icons-material/ViewList";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import BlockIcon from "@mui/icons-material/Block";
import Button from "../../../components/ui/Button";
import Modal from "../../../components/ui/Modal";
import Input from "../../../components/ui/Input";
import Select from "../../../components/ui/Select";

export default function Users() {
    const { confirm } = useConfirm();
    const queryClient = useQueryClient();
    const { isSiteAdmin, hasPermission } = useAuth();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [statusFilter, setStatusFilter] = useState("all");

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const status = params.get("status");
        if (
            status &&
            ["all", "active", "inactive", "suspended"].includes(status)
        ) {
            setStatusFilter(status);
        }
    }, []);

    const { data, isLoading } = useQuery({
        queryKey: ["users", statusFilter],
        queryFn: () =>
            userApi.getAll(
                statusFilter === "all" ? {} : { status: statusFilter },
            ),
    });

    const { data: roles } = useQuery({
        queryKey: ["roles"],
        queryFn: roleApi.getAll,
    });

    const { data: tenants } = useQuery({
        queryKey: ["tenants"],
        queryFn: () => tenantApi.getAll({}),
        enabled: isSiteAdmin(),
    });

    const createMutation = useMutation({
        mutationFn: userApi.create,
        onSuccess: () => {
            queryClient.invalidateQueries(["users"]);
            setIsCreateModalOpen(false);
        },
    });

    const inviteMutation = useMutation({
        mutationFn: userApi.invite,
        onSuccess: () => {
            queryClient.invalidateQueries(["users"]);
            setIsInviteModalOpen(false);
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => userApi.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries(["users"]);
            setSelectedUser(null);
        },
    });

    const deleteMutation = useMutation({
        mutationFn: userApi.delete,
        onSuccess: () => queryClient.invalidateQueries(["users"]),
    });

    const columns = [
        { field: "fullName", headerName: "Name", flex: 1, minWidth: 120 },
        { field: "email", headerName: "Email", flex: 1, minWidth: 180 },
        {
            field: "mobile",
            headerName: "Mobile",
            width: 140,
            valueGetter: (_, row) => row.mobile || "—",
        },
        {
            field: "tenantName",
            headerName: "Tenant",
            width: 130,
            valueGetter: (_, row) => row.tenantName || "System",
        },
        {
            field: "roles",
            headerName: "Roles",
            width: 150,
            valueGetter: (_, row) =>
                row.roles?.map((r) => r.roleName).join(", ") || "-",
        },
        {
            field: "status",
            headerName: "Status",
            width: 100,
            renderCell: (params) => (
                <StatusLabel value={params.row.status} variant="status" />
            ),
        },
        {
            field: "createdAt",
            headerName: "Created",
            width: 110,
            valueGetter: (_, row) => formatDate(row.createdAt),
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
                            resource: RESOURCE.USERS,
                            action: ACTION.UPDATE,
                            onClick: () => setSelectedUser(row),
                        },
                        {
                            id: "delete",
                            label: "Delete",
                            resource: RESOURCE.USERS,
                            action: ACTION.DELETE,
                            variant: "danger",
                            onClick: async () => {
                                const ok = await confirm(
                                    "Delete this user? This action cannot be undone.",
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
                title="Users"
                subtitle="Manage users and invitations"
                icon={<PeopleIcon fontSize="small" color="primary" />}
                actions={[
                    {
                        label: "Invite User",
                        icon: <MailOutlinedIcon fontSize="small" />,
                        onClick: () => setIsInviteModalOpen(true),
                        resource: RESOURCE.USERS,
                        action: ACTION.CREATE,
                        primary: true,
                    },
                    {
                        label: "Create User",
                        icon: <AddIcon fontSize="small" />,
                        onClick: () => setIsCreateModalOpen(true),
                        resource: RESOURCE.USERS,
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
                        <ToggleButton value="inactive">
                            <CancelIcon sx={{ fontSize: 18, mr: 0.5 }} />
                            Inactive
                        </ToggleButton>
                        <ToggleButton value="suspended">
                            <BlockIcon sx={{ fontSize: 18, mr: 0.5 }} />
                            Suspended
                        </ToggleButton>
                    </ToggleButtonGroup>
                </Box>

                <AppDataTable
                    rows={data?.users || []}
                    columns={columns}
                    getRowId={(row) => row.id}
                    loading={isLoading}
                    height={500}
                />

                <CreateUserModal
                    isOpen={isCreateModalOpen}
                    onClose={() => setIsCreateModalOpen(false)}
                    onSubmit={(data) => createMutation.mutate(data)}
                    isLoading={createMutation.isPending}
                    roles={roles || []}
                    tenants={tenants?.tenants || []}
                    isSiteAdmin={isSiteAdmin()}
                />

                <InviteUserModal
                    isOpen={isInviteModalOpen}
                    onClose={() => setIsInviteModalOpen(false)}
                    onSubmit={(data) => inviteMutation.mutate(data)}
                    isLoading={inviteMutation.isPending}
                    roles={roles || []}
                />

                {selectedUser && (
                    <EditUserModal
                        isOpen={!!selectedUser}
                        onClose={() => setSelectedUser(null)}
                        user={selectedUser}
                        onSubmit={(data) =>
                            updateMutation.mutate({ id: selectedUser.id, data })
                        }
                        isLoading={updateMutation.isPending}
                        roles={roles || []}
                    />
                )}
            </PageContent>
        </div>
    );
}

function CreateUserModal({
    isOpen,
    onClose,
    onSubmit,
    isLoading,
    roles,
    tenants,
    isSiteAdmin,
}) {
    const [formData, setFormData] = useState({
        email: "",
        mobile: "",
        password: "",
        fullName: "",
        tenantId: "",
        roleIds: [],
    });
    const [error, setError] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        try {
            const data = {
                email: formData.email,
                password: formData.password,
                fullName: formData.fullName,
                tenantId: parseInt(formData.tenantId),
                roleIds: formData.roleIds.map((id) => parseInt(id)),
                ...(formData.mobile.trim() ? { mobile: formData.mobile } : {}),
            };
            await onSubmit(data);
            setFormData({
                email: "",
                mobile: "",
                password: "",
                fullName: "",
                tenantId: "",
                roleIds: [],
            });
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Create New User">
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                        {error}
                    </div>
                )}
                <Input
                    label="Full Name"
                    name="fullName"
                    value={formData.fullName}
                    onChange={(e) =>
                        setFormData({ ...formData, fullName: e.target.value })
                    }
                    required
                />
                <Input
                    label="Email"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                    }
                    required
                />
                <Input
                    label="Mobile (optional)"
                    type="text"
                    name="mobile"
                    value={formData.mobile}
                    onChange={(e) =>
                        setFormData({ ...formData, mobile: e.target.value })
                    }
                    placeholder="10–15 digits; spaces and + allowed"
                />
                <Input
                    label="Password"
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                    }
                    required
                />
                {isSiteAdmin && (
                    <Select
                        label="Tenant"
                        name="tenantId"
                        value={formData.tenantId}
                        onChange={(e) =>
                            setFormData({
                                ...formData,
                                tenantId: e.target.value,
                            })
                        }
                        options={tenants.map((t) => ({
                            value: t.id,
                            label: t.name,
                        }))}
                        required
                    />
                )}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Roles <span className="text-red-500">*</span>
                    </label>
                    {roles
                        .filter((r) => isSiteAdmin || r.scope === "tenant")
                        .map((role) => (
                            <label
                                key={role.id}
                                className="flex items-center mb-2"
                            >
                                <input
                                    type="checkbox"
                                    checked={formData.roleIds.includes(role.id)}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            setFormData({
                                                ...formData,
                                                roleIds: [
                                                    ...formData.roleIds,
                                                    role.id,
                                                ],
                                            });
                                        } else {
                                            setFormData({
                                                ...formData,
                                                roleIds:
                                                    formData.roleIds.filter(
                                                        (id) => id !== role.id,
                                                    ),
                                            });
                                        }
                                    }}
                                    className="mr-2"
                                />
                                {role.name}
                            </label>
                        ))}
                </div>
                <div className="flex justify-end space-x-3 mt-6">
                    <Button variant="secondary" onClick={onClose} type="button">
                        Cancel
                    </Button>
                    <Button type="submit" disabled={isLoading}>
                        {isLoading ? "Creating..." : "Create User"}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}

function InviteUserModal({ isOpen, onClose, onSubmit, isLoading, roles }) {
    const [formData, setFormData] = useState({
        email: "",
        fullName: "",
        roleIds: [],
    });
    const [error, setError] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        try {
            const data = {
                ...formData,
                roleIds: formData.roleIds.map((id) => parseInt(id)),
            };
            await onSubmit(data);
            setFormData({ email: "", fullName: "", roleIds: [] });
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Invite User">
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                        {error}
                    </div>
                )}
                <Input
                    label="Full Name"
                    name="fullName"
                    value={formData.fullName}
                    onChange={(e) =>
                        setFormData({ ...formData, fullName: e.target.value })
                    }
                    required
                />
                <Input
                    label="Email"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                    }
                    required
                />
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Roles <span className="text-red-500">*</span>
                    </label>
                    {roles
                        .filter((r) => r.scope === "tenant")
                        .map((role) => (
                            <label
                                key={role.id}
                                className="flex items-center mb-2"
                            >
                                <input
                                    type="checkbox"
                                    checked={formData.roleIds.includes(role.id)}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            setFormData({
                                                ...formData,
                                                roleIds: [
                                                    ...formData.roleIds,
                                                    role.id,
                                                ],
                                            });
                                        } else {
                                            setFormData({
                                                ...formData,
                                                roleIds:
                                                    formData.roleIds.filter(
                                                        (id) => id !== role.id,
                                                    ),
                                            });
                                        }
                                    }}
                                    className="mr-2"
                                />
                                {role.name}
                            </label>
                        ))}
                </div>
                <div className="flex justify-end space-x-3 mt-6">
                    <Button variant="secondary" onClick={onClose} type="button">
                        Cancel
                    </Button>
                    <Button type="submit" disabled={isLoading}>
                        {isLoading ? "Sending..." : "Send Invitation"}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}

function editFormFromUser(u) {
    return {
        fullName: u.fullName,
        email: u.email,
        mobile: u.mobile ?? "",
        status: u.status,
        roleIds: u.roles?.map((r) => r.roleId) || [],
    };
}

function EditUserModal({ isOpen, onClose, user, onSubmit, isLoading, roles }) {
    const [formData, setFormData] = useState(() => editFormFromUser(user));
    const [error, setError] = useState("");

    useEffect(() => {
        if (isOpen && user) {
            setFormData(editFormFromUser(user));
            setError("");
        }
    }, [isOpen, user]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        try {
            const mobileTrim = String(formData.mobile ?? "").trim();
            const data = {
                fullName: formData.fullName,
                email: formData.email,
                status: formData.status,
                mobile: mobileTrim === "" ? null : formData.mobile,
                roleIds: formData.roleIds.map((id) => parseInt(id)),
            };
            await onSubmit(data);
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Edit User">
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                        {error}
                    </div>
                )}
                <Input
                    label="Full Name"
                    name="fullName"
                    value={formData.fullName}
                    onChange={(e) =>
                        setFormData({ ...formData, fullName: e.target.value })
                    }
                    required
                />
                <Input
                    label="Email"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                    }
                    required
                />
                <Input
                    label="Mobile (optional)"
                    type="text"
                    name="mobile"
                    value={formData.mobile ?? ""}
                    onChange={(e) =>
                        setFormData({ ...formData, mobile: e.target.value })
                    }
                    placeholder="Clear field to remove"
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
                        { value: "inactive", label: "Inactive" },
                        { value: "suspended", label: "Suspended" },
                    ]}
                />
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Roles
                    </label>
                    {roles.map((role) => (
                        <label key={role.id} className="flex items-center mb-2">
                            <input
                                type="checkbox"
                                checked={formData.roleIds.includes(role.id)}
                                onChange={(e) => {
                                    if (e.target.checked) {
                                        setFormData({
                                            ...formData,
                                            roleIds: [
                                                ...formData.roleIds,
                                                role.id,
                                            ],
                                        });
                                    } else {
                                        setFormData({
                                            ...formData,
                                            roleIds: formData.roleIds.filter(
                                                (id) => id !== role.id,
                                            ),
                                        });
                                    }
                                }}
                                className="mr-2"
                            />
                            {role.name}
                        </label>
                    ))}
                </div>
                <div className="flex justify-end space-x-3 mt-6">
                    <Button variant="secondary" onClick={onClose} type="button">
                        Cancel
                    </Button>
                    <Button type="submit" disabled={isLoading}>
                        {isLoading ? "Updating..." : "Update User"}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
