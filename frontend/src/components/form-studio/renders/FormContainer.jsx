import { Dialog, DialogTitle, DialogContent, Box, CircularProgress, Alert } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { FormRenderer } from "@aatulwork/customform-renderer";
import { formsApi } from "../../../utils/api/coreapi";
import { transformFormSchema } from "../../../utils/form-studio/formUtils";
import { createFormRendererServices } from "../../../utils/form-studio/formRendererServices";
import { AppDrawer } from "../../common/AppDrawer";

export function FormContainer({
    formId,
    formSysName,
    formSchema: providedFormSchema,
    variant,
    open = true,
    onClose,
    onSubmit,
    initialValues,
    title,
    mode = "add",
    onSuccess,
    onCancel,
    isLoading = false,
    maxWidth = "md",
    fullWidth = true,
    anchor = "right",
    drawerWidth = 600,
    disableEscapeKeyDown = false,
    /** Form entry id — files upload to uploads/{tenant}/{form}/recordId/. New entries use `draft` when omitted. */
    recordId = null,
}) {
    const shouldFetch = !providedFormSchema && (!!formId || !!formSysName);
    const formIdentifier = formId || formSysName;
    const isPlainVariant = variant === "plain";

    const {
        data: fetchedFormSchema,
        isLoading: formLoading,
        error: formError,
    } = useQuery({
        queryKey: ["formDefinition", formIdentifier],
        queryFn: async () => {
            if (formId) return formsApi.getById(formId);
            if (formSysName) return formsApi.getByName(formSysName);
            throw new Error("No form identifier provided");
        },
        enabled: shouldFetch && (isPlainVariant || open),
        retry: 1,
        staleTime: 10 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
    });

    const formSchema = providedFormSchema || transformFormSchema(fetchedFormSchema || null);
    const displayTitle = title || (mode === "edit" ? "Edit" : mode === "view" ? "View" : "Add");

    const handleSuccess = () => {
        onSuccess?.();
        onClose?.();
    };

    const handleCancel = () => {
        onCancel?.();
        onClose?.();
    };

    const isFormLoading = shouldFetch ? formLoading : false;
    const overallLoading = isFormLoading || isLoading;

    const handleClose = (_event, reason) => {
        if (isPlainVariant || !onClose) return;
        if (overallLoading) return;
        if (reason === "backdropClick" && overallLoading) return;
        onClose();
    };

    if (shouldFetch && isFormLoading) {
        const loader = (
            <Box
                sx={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    minHeight: 200,
                }}
            >
                <CircularProgress />
            </Box>
        );
        if (isPlainVariant) return loader;
        if (variant === "dialog") {
            return (
                <Dialog open={open} onClose={handleClose} maxWidth={maxWidth} fullWidth={fullWidth} disableEscapeKeyDown={disableEscapeKeyDown || overallLoading}>
                    <DialogContent>{loader}</DialogContent>
                </Dialog>
            );
        }
        return (
            <AppDrawer open={open} onClose={handleClose} title="Loading..." anchor={anchor} width={drawerWidth}>
                {loader}
            </AppDrawer>
        );
    }

    if (shouldFetch && formError && !formSchema) {
        const errorMessage = formError instanceof Error ? formError.message : formError?.response?.data?.message || "Failed to load form definition";
        if (isPlainVariant) return <Alert severity="error">{errorMessage}</Alert>;
        if (variant === "dialog") {
            return (
                <Dialog open={open} onClose={handleClose} maxWidth={maxWidth} fullWidth={fullWidth} disableEscapeKeyDown={disableEscapeKeyDown || overallLoading}>
                    <DialogTitle>Error</DialogTitle>
                    <DialogContent>
                        <Alert severity="error" sx={{ mt: 1 }}>
                            {errorMessage}
                        </Alert>
                    </DialogContent>
                </Dialog>
            );
        }
        return (
            <AppDrawer open={open} onClose={handleClose} title="Error" anchor={anchor} width={drawerWidth}>
                <Alert severity="error">{errorMessage}</Alert>
            </AppDrawer>
        );
    }

    if (!formSchema) return null;

    const rendererServices = useMemo(() => createFormRendererServices({ recordId }), [recordId]);

    const normalizedFormSchema = {
        ...formSchema,
        title: formSchema.title ?? "",
        name: formSchema.name ?? "",
        module: formSchema.module == null ? undefined : typeof formSchema.module === "string" ? formSchema.module : (formSchema.module?._id ?? formSchema.module?.name ?? undefined),
    };

    const formRendererProps = {
        formSchema: normalizedFormSchema,
        onSubmit: mode === "view" ? undefined : onSubmit,
        initialValues,
        isLoading: overallLoading,
        onSuccess: handleSuccess,
        onCancel: isPlainVariant ? undefined : handleCancel,
        hideTitle: true,
        allowResetOnValuesChange: isPlainVariant,
        mode: mode === "view" ? "view" : "edit",
        services: rendererServices,
    };

    const renderer = (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
            <FormRenderer {...formRendererProps} />
        </LocalizationProvider>
    );

    if (isPlainVariant) return renderer;

    if (variant === "dialog") {
        return (
            <Dialog
                open={open}
                onClose={handleClose}
                maxWidth={maxWidth}
                fullWidth={fullWidth}
                disableEscapeKeyDown={disableEscapeKeyDown || overallLoading}
                PaperProps={{ sx: { maxHeight: "90vh" } }}
            >
                <DialogTitle>{displayTitle}</DialogTitle>
                <DialogContent dividers>{renderer}</DialogContent>
            </Dialog>
        );
    }

    return (
        <AppDrawer open={open} onClose={handleClose} title={displayTitle} anchor={anchor} width={drawerWidth}>
            {renderer}
        </AppDrawer>
    );
}
