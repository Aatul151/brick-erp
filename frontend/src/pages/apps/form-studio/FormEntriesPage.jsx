import { useState, useMemo, useEffect } from "react";
import { Box, Button, Typography, Dialog, DialogTitle, DialogContent, DialogActions, DialogContentText, CircularProgress, Alert, ButtonGroup, Tooltip, useMediaQuery, useTheme } from "@mui/material";
import { GridActionsCellItem } from "@mui/x-data-grid";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import VisibilityIcon from "@mui/icons-material/Visibility";
import RefreshIcon from "@mui/icons-material/Refresh";
import PublicIcon from "@mui/icons-material/Public";
import { formsApi, formEntriesApi } from "../../../utils/api/coreapi";
import { transformFormSchema, formatDateTime } from "../../../utils/form-studio/formUtils";
import { useAuth } from "../../../contexts/AuthContext";
import { PageHeader } from "../../../components/common/PageHeader";
import { PageContent } from "../../../components/common/PageContent";
import { AppDataTable } from "../../../components/common/AppDataTable";
import { FormContainer } from "../../../components/form-studio/renders/FormContainer";
import { FileDisplay } from "../../../components/form-studio/renders/FileDisplay";
import { CKEditorContentDisplay } from "../../../components/form-studio/renders/CKEditorContentDisplay";

export default function FormEntriesPage() {
    const { user, isSiteAdmin } = useAuth();
    const siteAdmin = isSiteAdmin();
    const hasNoTenant = !user?.tenantId && !siteAdmin;

    const navigate = useNavigate();
    const { formName } = useParams();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
    const decodedFormName = formName ? decodeURIComponent(formName) : null;

    const queryClient = useQueryClient();
    const [formDialogOpen, setFormDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedEntry, setSelectedEntry] = useState(null);
    const [formMode, setFormMode] = useState("add");
    const [entryScope, setEntryScope] = useState("tenant");
    const [submitAlert, setSubmitAlert] = useState(null);
    const [paginationModel, setPaginationModel] = useState({
        page: 0,
        pageSize: 10,
    });

    const {
        data: formSchemaRaw,
        isLoading: formDefLoading,
        error: formDefError,
    } = useQuery({
        queryKey: ["formDefinition", decodedFormName],
        queryFn: async () => {
            const form = await formsApi.getByName(decodedFormName);
            return transformFormSchema(form);
        },
        enabled: !!decodedFormName && (!!user?.tenantId || siteAdmin),
        retry: 1,
    });

    const formSchema = formSchemaRaw;
    const isSingleRecordForm = formSchema?.settings?.isSingleRecordForm === true;
    const formType = String(formSchema?.formType || "").toLowerCase();
    const isMasterForm = formType === "master_form";

    const page = paginationModel.page;
    const pageSize = paginationModel.pageSize;

    useEffect(() => {
        if (!formSchema) return;
        if (isSingleRecordForm && pageSize !== 1) {
            setPaginationModel((p) => ({ ...p, pageSize: 1, page: 0 }));
        } else if (!isSingleRecordForm && pageSize === 1) {
            setPaginationModel((p) => ({ ...p, pageSize: 10, page: 0 }));
        }
    }, [isSingleRecordForm, formSchema, pageSize]);

    const { data: entriesData, isLoading: entriesLoading } = useQuery({
        queryKey: ["formEntries", decodedFormName, page, pageSize],
        queryFn: () =>
            formEntriesApi.getAll({
                formName: decodedFormName,
                page: page + 1,
                limit: pageSize,
            }),
        enabled: (!!user?.tenantId || siteAdmin) && !!decodedFormName && !!formSchema && ((isSingleRecordForm && pageSize === 1) || (!isSingleRecordForm && pageSize !== 1)),
        placeholderData: (prev) => prev,
    });

    const entries = entriesData?.data || [];
    const pagination = entriesData?.pagination;
    const singleRecord = isSingleRecordForm && entries.length > 0 ? entries[0] : null;

    const createMutation = useMutation({
        mutationFn: (payload) => formEntriesApi.create(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ["formEntries", decodedFormName],
                exact: false,
            });
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, payload, scope }) => formEntriesApi.update(id, payload, scope),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ["formEntries", decodedFormName],
                exact: false,
            });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: ({ entryId, scope }) => formEntriesApi.delete(entryId, decodedFormName, scope),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ["formEntries", decodedFormName],
                exact: false,
            });
            setDeleteDialogOpen(false);
            setSelectedEntry(null);
        },
    });

    const handleFormSubmit = async (data) => {
        if (!decodedFormName) return;
        setSubmitAlert(null);
        const payload = {
            formName: decodedFormName,
            payload: data,
            scope: entryScope,
        };
        let response;
        if (formMode === "edit" && selectedEntry?.id) {
            response = await updateMutation.mutateAsync({
                id: selectedEntry.id,
                payload,
                scope: entryScope,
            });
        } else {
            response = await createMutation.mutateAsync(payload);
        }

        if (isSingleRecordForm) {
            setSubmitAlert({
                severity: "success",
                message: response?.message || "Entry submitted successfully.",
            });
        }
    };

    const buildColumns = () => {
        if (!formSchema) return [];
        const allFields = formSchema.sections ? formSchema.sections.flatMap((s) => s.fields) : formSchema.fields || [];

        const cols = [];

        allFields.forEach((field) => {
            if (field.type === "file") {
                cols.push({
                    field: field.name,
                    headerName: field.label,
                    flex: 1,
                    minWidth: 200,
                    valueGetter: (_v, row) => row.payload?.[field.name] ?? row[field.name],
                    renderCell: (params) => <FileDisplay fieldValue={params.value} />,
                });
                return;
            }
            if (field.type === "ckeditor") {
                cols.push({
                    field: field.name,
                    headerName: field.label,
                    flex: 1,
                    minWidth: 180,
                    valueGetter: (_v, row) => row.payload?.[field.name] ?? row[field.name],
                    renderCell: (params) => <CKEditorContentDisplay content={params.value || ""} maxLength={80} showViewButton />,
                });
                return;
            }
            cols.push({
                field: field.name,
                headerName: field.label,
                flex: 1,
                minWidth: 120,
                valueGetter: (_v, row) => {
                    const fieldValue = row.payload?.[field.name] ?? row[field.name];
                    if (fieldValue === null || fieldValue === undefined) return "";
                    if (field.type === "datepicker") {
                        const mode = field.datePickerMode || "date";
                        return formatDateTime(fieldValue, {
                            datePickerMode: mode,
                        });
                    }
                    if (typeof fieldValue === "object") return JSON.stringify(fieldValue);
                    return String(fieldValue);
                },
            });
        });

        cols.push(
            {
                field: "scope",
                headerName: "Source",
                width: 110,
                valueGetter: (_v, row) => (row.isMasterRecord ? "Master" : "Tenant"),
            },
            {
                field: "createdAt",
                headerName: "Created At",
                width: 170,
                valueGetter: (_v, row) =>
                    formatDateTime(row.createdAt, {
                        datePickerMode: "datetime",
                    }),
            },
            {
                field: "actions",
                type: "actions",
                headerName: "Actions",
                width: 140,
                getActions: (params) => {
                    const row = params.row;
                    const isMasterRecord = row.isMasterRecord === true;
                    const canManageRow = siteAdmin ? true : !isMasterRecord;

                    const AllAllowActions = [
                        <GridActionsCellItem
                            key="view"
                            icon={<VisibilityIcon />}
                            label="View"
                            onClick={() => {
                                setSelectedEntry(row);
                                setFormMode("view");
                                setFormDialogOpen(true);
                            }}
                        />,
                    ];
                    if (canManageRow) {
                        AllAllowActions.push(
                            <GridActionsCellItem
                                key="edit"
                                icon={<EditIcon />}
                                label="Edit"
                                onClick={() => {
                                    setSelectedEntry(row);
                                    setFormMode("edit");
                                    setEntryScope(row.scope || "tenant");
                                    setFormDialogOpen(true);
                                }}
                            />,
                        );
                        AllAllowActions.push(
                            <GridActionsCellItem
                                key="delete"
                                icon={<DeleteIcon />}
                                label="Delete"
                                onClick={() => {
                                    setSelectedEntry(row);
                                    setDeleteDialogOpen(true);
                                }}
                            />,
                        );
                    }
                    return AllAllowActions;
                },
            },
        );

        return cols;
    };

    useEffect(() => {
        if (!isSingleRecordForm || !formSchema || entriesLoading) return;
        if (singleRecord) {
            setSelectedEntry(singleRecord);
            setFormMode("edit");
            setEntryScope(singleRecord.scope || "tenant");
        } else {
            setSelectedEntry(null);
            setFormMode("add");
            setEntryScope("tenant");
        }
    }, [isSingleRecordForm, formSchema, singleRecord, entriesLoading]);

    if (hasNoTenant) {
        return (
            <Box
                sx={{
                    display: "flex",
                    flexDirection: "column",
                    height: "100%",
                    maxHeight: "100%",
                    overflow: "hidden",
                }}
            >
                <PageHeader
                    title="Form entries"
                    actions={
                        <Button variant="outlined" size="small" onClick={() => navigate("/form-studio")}>
                            Back to Form Studio
                        </Button>
                    }
                    sx={{ mb: 0.5, borderRadius: "10px", padding: 1.5 }}
                />
                <Alert severity="info" sx={{ mx: 1.5, mb: 1 }}>
                    Form Studio is available for tenant users or Site Admin.
                </Alert>
                <PageContent>
                    <Box
                        sx={{
                            py: 6,
                            textAlign: "center",
                            color: "text.secondary",
                        }}
                    >
                        <Typography>Switch to a tenant account or use a Site Admin account.</Typography>
                    </Box>
                </PageContent>
            </Box>
        );
    }

    if (formDefLoading) {
        return (
            <Box
                sx={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    minHeight: 400,
                }}
            >
                <CircularProgress />
            </Box>
        );
    }

    if (formDefError || !formSchema) {
        return (
            <Box sx={{ p: 2 }}>
                <Alert severity="error" sx={{ mb: 2 }}>
                    {formDefError?.message || "This form is not allow to access to you"}
                </Alert>
                <Button variant="outlined" onClick={() => navigate("/form-studio")}>
                    Back to Form Studio
                </Button>
            </Box>
        );
    }

    const columns = buildColumns();
    const isBusy = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

    if (isSingleRecordForm && entriesLoading) {
        return (
            <Box
                sx={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    minHeight: 400,
                }}
            >
                <CircularProgress />
            </Box>
        );
    }

    const actionButtons = (
        <ButtonGroup variant="outlined" size="small">
            {!isSingleRecordForm && (
                <Tooltip title="Refresh">
                    <Button
                        onClick={() =>
                            queryClient.invalidateQueries({
                                queryKey: ["formEntries", decodedFormName],
                                exact: false,
                            })
                        }
                        disabled={entriesLoading}
                    >
                        <RefreshIcon fontSize="small" />
                    </Button>
                </Tooltip>
            )}
            {!isSingleRecordForm && (
                <Tooltip title={isMobile ? "Add" : `Add ${formSchema.title}`}>
                    <Button
                        onClick={() => {
                            setSelectedEntry(null);
                            setFormMode("add");
                            setEntryScope("tenant");
                            setFormDialogOpen(true);
                        }}
                        disabled={isBusy}
                        color="primary"
                        sx={{ fontWeight: 600 }}
                    >
                        <AddIcon fontSize="small" />
                    </Button>
                </Tooltip>
            )}
            {!isSingleRecordForm && siteAdmin && (
                <Tooltip title={isMobile ? "Add Master" : `Add Master ${formSchema.title}`}>
                    <Button
                        onClick={() => {
                            setSelectedEntry(null);
                            setFormMode("add");
                            setEntryScope("master");
                            setFormDialogOpen(true);
                        }}
                        disabled={isBusy}
                        color="secondary"
                        sx={{ fontWeight: 600 }}
                    >
                        <PublicIcon fontSize="small" />
                    </Button>
                </Tooltip>
            )}
        </ButtonGroup>
    );

    return (
        <Box
            sx={{
                display: "flex",
                flexDirection: "column",
                height: "100%",
                maxHeight: "100%",
                overflow: "hidden",
            }}
        >
            <PageHeader title={formSchema.title} actions={actionButtons} sx={{ mb: 0.5, borderRadius: "10px", padding: 1.5 }} />

            <PageContent>
                {isSingleRecordForm && submitAlert?.message && (
                    <Alert severity={submitAlert.severity || "success"} sx={{ mb: 1 }} onClose={() => setSubmitAlert(null)}>
                        {submitAlert.message}
                    </Alert>
                )}
                {!isSingleRecordForm && (
                    <AppDataTable
                        rows={entries}
                        columns={columns}
                        loading={entriesLoading}
                        getRowId={(row) => row.id || ""}
                        serverPagination
                        rowCount={pagination?.total || 0}
                        paginationModel={paginationModel}
                        onPaginationModelChange={setPaginationModel}
                    />
                )}

                <FormContainer
                    variant={isSingleRecordForm ? "plain" : "drawer"}
                    open={isSingleRecordForm ? true : formDialogOpen}
                    formSysName={decodedFormName || undefined}
                    recordId={formMode === "edit" || formMode === "view" ? (selectedEntry?.id ?? "draft") : "draft"}
                    onSubmit={handleFormSubmit}
                    initialValues={(formMode === "edit" || formMode === "view") && selectedEntry?.payload ? { ...selectedEntry.payload } : undefined}
                    title={
                        formMode === "edit"
                            ? `Edit ${entryScope === "master" ? "Master" : "Tenant"} ${formSchema.title}`
                            : formMode === "view"
                              ? `View ${formSchema.title}`
                              : `Add ${entryScope === "master" ? "Master" : "Tenant"} ${formSchema.title}`
                    }
                    mode={formMode}
                    isLoading={createMutation.isPending || updateMutation.isPending}
                    onClose={
                        isSingleRecordForm
                            ? undefined
                            : () => {
                                  if (!isBusy) {
                                      setFormDialogOpen(false);
                                      setSelectedEntry(null);
                                      setFormMode("add");
                                      setEntryScope("tenant");
                                  }
                              }
                    }
                    onCancel={
                        isSingleRecordForm
                            ? undefined
                            : () => {
                                  setFormDialogOpen(false);
                                  setSelectedEntry(null);
                                  setFormMode("add");
                                  setEntryScope("tenant");
                              }
                    }
                    onSuccess={() => {
                        if (!isSingleRecordForm) {
                            setFormDialogOpen(false);
                            setSelectedEntry(null);
                            setFormMode("add");
                            setEntryScope("tenant");
                        }
                        queryClient.invalidateQueries({
                            queryKey: ["formEntries", decodedFormName],
                            exact: false,
                        });
                    }}
                    anchor="right"
                    drawerWidth={600}
                />
            </PageContent>

            <Dialog open={deleteDialogOpen} onClose={() => !isBusy && setDeleteDialogOpen(false)}>
                <DialogTitle>Delete entry</DialogTitle>
                <DialogContent>
                    <DialogContentText>Delete this entry? This cannot be undone.</DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button size="small" onClick={() => setDeleteDialogOpen(false)} disabled={isBusy}>
                        Cancel
                    </Button>
                    <Button
                        size="small"
                        color="error"
                        variant="contained"
                        onClick={() =>
                            selectedEntry?.id &&
                            deleteMutation.mutate({
                                entryId: selectedEntry.id,
                                scope: selectedEntry.scope || "tenant",
                            })
                        }
                        disabled={isBusy}
                    >
                        {deleteMutation.isPending ? "Deleting..." : "Delete"}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
