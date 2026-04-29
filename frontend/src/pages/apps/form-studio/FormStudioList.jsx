import { useState, useMemo } from "react";
import { Box, Button, Typography, Dialog, DialogTitle, DialogContent, DialogActions, DialogContentText, Alert } from "@mui/material";
import { GridActionsCellItem } from "@mui/x-data-grid";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../contexts/AuthContext";
import { formsApi } from "../../../utils/api/coreapi";
import { RESOURCE, ACTION } from "../../../utils/resources";
import { PageHeader } from "../../../components/common/PageHeader";
import { PageContent } from "../../../components/common/PageContent";
import { AppDataTable } from "../../../components/common/AppDataTable";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import DynamicFormIcon from "@mui/icons-material/DynamicForm";

export default function FormStudioList() {
    const navigate = useNavigate();
    const { user, isSiteAdmin } = useAuth();
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedForm, setSelectedForm] = useState(null);
    const [snack, setSnack] = useState({
        open: false,
        message: "",
        severity: "success",
    });

    const siteAdmin = isSiteAdmin();
    const hasNoTenant = !user?.tenantId && !siteAdmin;

    const queryClient = useQueryClient();

    const formsQueryKey = ["forms", user?.tenantId ?? "no-tenant", user?.id ?? user?._id ?? "anon"];

    const { data: allForms = [], isLoading } = useQuery({
        queryKey: formsQueryKey,
        queryFn: () => formsApi.getAll(),
        enabled: !!user?.tenantId,
        retry: false,
    });

    const myForms = useMemo(() => {
        if (!user?.tenantId && !siteAdmin) return [];
        return allForms;
    }, [allForms, user?.tenantId, siteAdmin]);

    const canManageFormDefinition = (form) => {
        if (!form) return false;
        if (form.formType === "system" || form.formType === "master_form") return siteAdmin;
        return true;
    };

    const deleteMutation = useMutation({
        mutationFn: (id) => formsApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["forms"] });
            setSnack({
                open: true,
                message: "Form deleted successfully",
                severity: "success",
            });
            setDeleteDialogOpen(false);
            setSelectedForm(null);
        },
        onError: (error) => {
            setSnack({
                open: true,
                message: error?.message || "Failed to delete form",
                severity: "error",
            });
        },
    });

    const handleEdit = (form) => {
        if (!canManageFormDefinition(form)) {
            setSnack({
                open: true,
                message: "Only Site Admin can manage system/master forms",
                severity: "error",
            });
            return;
        }
        if (!form.name) {
            setSnack({
                open: true,
                message: "Form name not found",
                severity: "error",
            });
            return;
        }
        navigate(`/form-studio/build/${encodeURIComponent(form.name)}`);
    };

    const handleDelete = (form) => {
        if (!canManageFormDefinition(form)) {
            setSnack({
                open: true,
                message: "Only Site Admin can manage system/master forms",
                severity: "error",
            });
            return;
        }
        setSelectedForm(form);
        setDeleteDialogOpen(true);
    };

    const confirmDelete = () => {
        if (selectedForm) {
            const formId = selectedForm._id || selectedForm.id;
            if (formId) deleteMutation.mutate(formId);
        }
    };

    const handleAddForm = () => navigate("/form-studio/build");

    const handleOpenEntries = (form) => {
        if (!form.name) return;
        navigate(`/form-studio/entries/${encodeURIComponent(form.name)}`);
    };

    const columns = [
        { field: "title", headerName: "Form Title", flex: 1, minWidth: 200 },
        { field: "name", headerName: "Form Name", flex: 1, minWidth: 150 },
        {
            field: "formType",
            headerName: "Type",
            width: 110,
            valueGetter: (_v, row) => row.formType || "custom",
        },
        {
            field: "sections",
            headerName: "Sections",
            width: 100,
            valueGetter: (_v, row) => row.sections?.length || 0,
        },
        {
            field: "fields",
            headerName: "Fields",
            width: 100,
            valueGetter: (_v, row) => {
                if (row.sections) {
                    return row.sections.reduce((t, s) => t + (s.fields?.length || 0), 0);
                }
                return row.fields?.length || 0;
            },
        },
        {
            field: "createdAt",
            headerName: "Created At",
            flex: 1,
            minWidth: 180,
            valueFormatter: (value) => (value ? new Date(value).toLocaleString() : "-"),
        },
        {
            field: "actions",
            type: "actions",
            headerName: "Actions",
            width: 180,
            getActions: (params) => {
                const row = params.row;
                return [
                    <GridActionsCellItem key="entries" icon={<DynamicFormIcon />} label="Entries" onClick={() => handleOpenEntries(row)} />,
                    <GridActionsCellItem key="edit" icon={<EditIcon />} label="Edit" onClick={() => handleEdit(row)} disabled={!canManageFormDefinition(row)} />,
                    <GridActionsCellItem key="delete" icon={<DeleteIcon />} label="Delete" onClick={() => handleDelete(row)} disabled={!canManageFormDefinition(row)} showInMenu />,
                ];
            },
        },
    ];

    return (
        <div className="px-4 sm:px-0 flex flex-col gap-4 min-h-0 flex-1">
            <PageHeader
                title="Form Studio"
                subtitle="Design and manage your custom forms"
                icon={<DynamicFormIcon fontSize="small" color="primary" />}
                actions={[
                    {
                        id: "new-form",
                        label: "New form",
                        tooltip: hasNoTenant ? "Available for tenant users only" : "New form",
                        icon: <AddIcon fontSize="small" />,
                        onClick: handleAddForm,
                        resource: RESOURCE.FORM_STUDIO,
                        action: ACTION.CREATE,
                        variant: "contained",
                        disabled: hasNoTenant,
                    },
                ]}
            />

            {hasNoTenant && (
                <Alert severity="info" sx={{ mb: 2 }}>
                    Form Studio is available for tenant users. Site Admin cannot access tenant apps.
                </Alert>
            )}

            <PageContent>
                {hasNoTenant ? (
                    <Box
                        sx={{
                            py: 6,
                            textAlign: "center",
                            color: "text.secondary",
                        }}
                    >
                        <Typography>Switch to a tenant account to use Form Studio.</Typography>
                    </Box>
                ) : (
                    <Box>
                        <AppDataTable
                            rows={myForms}
                            columns={columns}
                            loading={isLoading}
                            getRowId={(row) => row._id || row.id || ""}
                            height={400}
                            enableGlobalSearch
                            globalSearchPlaceholder="Search forms..."
                        />
                    </Box>
                )}
            </PageContent>

            <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
                <DialogTitle>Delete Form</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to delete the form &quot;
                        {selectedForm?.title}&quot;? This cannot be undone.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button size="small" onClick={() => setDeleteDialogOpen(false)}>
                        Cancel
                    </Button>
                    <Button size="small" onClick={confirmDelete} color="error" variant="contained" disabled={deleteMutation.isPending}>
                        {deleteMutation.isPending ? "Deleting..." : "Delete"}
                    </Button>
                </DialogActions>
            </Dialog>

            {snack.open && (
                <Alert
                    severity={snack.severity}
                    onClose={() => setSnack((s) => ({ ...s, open: false }))}
                    sx={{
                        position: "fixed",
                        bottom: 24,
                        right: 24,
                        zIndex: 9999,
                    }}
                >
                    {snack.message}
                </Alert>
            )}
        </div>
    );
}
