import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Box, Grid, TextField, Button, Typography, Alert, Paper, Tabs, Tab, FormControlLabel, Switch, RadioGroup, Radio, FormControl } from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import ClearIcon from "@mui/icons-material/Clear";
import BuildIcon from "@mui/icons-material/Build";
import PreviewIcon from "@mui/icons-material/Preview";
import AddIcon from "@mui/icons-material/Add";
import SettingsIcon from "@mui/icons-material/Settings";
import { FieldTypePanel, regularFieldTypes, referenceFieldTypes } from "../../../components/form-studio/builder/FieldTypePanel";
import { FormCanvas } from "../../../components/form-studio/builder/FormCanvas";
import { FieldConfigDrawer } from "../../../components/form-studio/builder/FieldConfigDrawer";
import { SectionConfigDrawer } from "../../../components/form-studio/builder/SectionConfigDrawer";
import { FormContainer } from "../../../components/form-studio/renders/FormContainer";
import { useFormBuilderStore } from "../../../store/formBuilderStore";
import { useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "../../../components/common/PageHeader";
import { PageContent } from "../../../components/common/PageContent";
import { useAuth } from "../../../contexts/AuthContext";

export default function FormBuilderPage() {
    const { isSiteAdmin } = useAuth();
    const siteAdmin = isSiteAdmin();

    const navigate = useNavigate();
    const { formName } = useParams();

    const {
        sections,
        selectedField,
        selectedFieldPath,
        currentForm,
        addSection,
        addField,
        updateField,
        removeField,
        removeSection,
        reorderFields,
        selectField,
        clearForm,
        saveForm,
        setCurrentForm,
        loadFormByName,
    } = useFormBuilderStore();

    const [formDetails, setFormDetails] = useState({
        title: "",
        name: "",
        collectionName: "",
        formType: "custom",
    });
    const [configDrawerOpen, setConfigDrawerOpen] = useState(false);
    const [sectionConfigDrawerOpen, setSectionConfigDrawerOpen] = useState(false);
    const [selectedSectionId, setSelectedSectionId] = useState(null);
    const [editingSectionId, setEditingSectionId] = useState(null);
    const [saveError, setSaveError] = useState(null);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [activeTab, setActiveTab] = useState(0);
    const [hasExpandedSection, setHasExpandedSection] = useState(false);
    const [formSettings, setFormSettings] = useState({
        formIcon: "",
        isPublic: false,
        isSingleRecordForm: false,
        allowManageFromEntryPage: false,
        fieldsPerRow: 1,
        sectionDisplayMode: "panel",
    });

    const queryClient = useQueryClient();

    const showAlertRef = useRef((severity, msg) => console[severity === "error" ? "error" : "log"](msg));

    useEffect(() => {
        if (sections.length > 0 && !selectedSectionId) {
            setSelectedSectionId(sections[0].id);
        }
    }, [sections, selectedSectionId]);

    useEffect(() => {
        if (selectedFieldPath) setSelectedSectionId(selectedFieldPath.sectionId);
    }, [selectedFieldPath]);

    useEffect(() => {
        if (currentForm) {
            setFormDetails({
                title: currentForm.title,
                name: currentForm.name,
                collectionName: currentForm.collectionName || "",
                formType: currentForm.formType || "custom",
            });
            setFormSettings(
                currentForm.settings || {
                    formIcon: "",
                    isPublic: false,
                    isSingleRecordForm: false,
                    allowManageFromEntryPage: false,
                    fieldsPerRow: 1,
                    sectionDisplayMode: "panel",
                },
            );
        }
    }, [currentForm]);

    useEffect(() => {
        console.log("formName", formName);
        if (formName) {
            let decoded = formName;
            try {
                decoded = decodeURIComponent(formName);
            } catch {
                decoded = formName;
            }
            loadFormByName(decoded).catch((err) => {
                showAlertRef.current("error", err?.message || "Failed to load form");
            });
        } else {
            clearForm();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- load when route name changes
    }, [formName]);

    useEffect(() => {
        return () => clearForm();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleFormTitleChange = (title) => {
        const generatedName = title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "_")
            .replace(/^_+|_+$/g, "");
        setFormDetails((prev) => ({
            ...prev,
            title,
            name: generatedName || "new_form",
        }));
    };

    const [prevSectionsLength, setPrevSectionsLength] = useState(sections.length);
    const currentFormType = currentForm?.formType || formDetails.formType;
    const isAdminManagedForm = currentFormType === "system" || currentFormType === "master_form";
    const canManageFormDefinition = !isAdminManagedForm || siteAdmin;

    const handleAddSection = () => {
        if (!canManageFormDefinition) return;
        const n = sections.length + 1;
        addSection({ title: `Section ${n}` });
    };

    useEffect(() => {
        if (sections.length > prevSectionsLength && sections.length > 0) {
            const last = sections[sections.length - 1];
            setSelectedSectionId(last.id);
        }
        setPrevSectionsLength(sections.length);
    }, [sections.length, prevSectionsLength, sections]);

    const isFieldNameUnique = (fieldName, excludeSectionId, excludeFieldIndex) => {
        const normalized = fieldName.toLowerCase().trim();
        return sections.every((section) => {
            if (excludeSectionId && section.id === excludeSectionId) {
                return section.fields.every((field, index) => {
                    if (excludeFieldIndex !== undefined && index === excludeFieldIndex) return true;
                    return field.name.toLowerCase().trim() !== normalized;
                });
            }
            return section.fields.every((field) => field.name.toLowerCase().trim() !== normalized);
        });
    };

    const handleAddField = (type) => {
        if (!canManageFormDefinition) return;
        let targetSectionId = selectedSectionId || sections[0]?.id;
        if (!targetSectionId) {
            addSection({ title: "Section 1" });
            return;
        }

        const allFields = sections.flatMap((s) => s.fields);
        let fieldName = `field_${allFields.length + 1}`;
        let counter = 1;
        while (!isFieldNameUnique(fieldName)) {
            fieldName = `field_${allFields.length + counter}`;
            counter += 1;
        }

        const newField = {
            type,
            label: `New ${type}`,
            name: fieldName,
            required: false,
        };
        if (type === "select" || type === "radio") {
            newField.options = ["Option 1", "Option 2"];
        }
        addField(targetSectionId, newField);
    };

    const handleFieldSelect = (field, sectionId, fieldIndex) => {
        if (!canManageFormDefinition) return;
        selectField(field, sectionId, fieldIndex);
        setSelectedSectionId(sectionId);
        setConfigDrawerOpen(true);
    };

    const handleFieldConfigSave = (field) => {
        if (!canManageFormDefinition) return;
        if (selectedFieldPath) {
            if (!isFieldNameUnique(field.name, selectedFieldPath.sectionId, selectedFieldPath.fieldIndex)) {
                setSaveError(`Field name "${field.name}" already exists.`);
                return;
            }
            updateField(selectedFieldPath.sectionId, selectedFieldPath.fieldIndex, field);
            selectField(null);
            setConfigDrawerOpen(false);
        }
    };

    const handleSectionEdit = (sectionId) => {
        if (!canManageFormDefinition) return;
        setEditingSectionId(sectionId);
        setSectionConfigDrawerOpen(true);
    };

    const handleFieldDelete = (sectionId, fieldIndex) => {
        if (!canManageFormDefinition) return;
        removeField(sectionId, fieldIndex);
        if (selectedFieldPath?.sectionId === sectionId && selectedFieldPath?.fieldIndex === fieldIndex) {
            setConfigDrawerOpen(false);
            selectField(null);
        }
    };

    const handleSave = async () => {
        if (!canManageFormDefinition) {
            setSaveError("Only Site Admin can manage system/master forms");
            return;
        }
        setSaveError(null);
        setSaveSuccess(false);
        if (!formDetails.name.trim()) {
            setSaveError("Form name is required");
            return;
        }
        if (!/^[a-z0-9_]+$/.test(formDetails.name)) {
            setSaveError("Form name must contain only lowercase letters, numbers, and underscores");
            return;
        }
        const totalFields = sections.reduce((sum, s) => sum + s.fields.length, 0);
        if (totalFields === 0) {
            setSaveError("Please add at least one field to the form");
            return;
        }
        try {
            setCurrentForm({
                ...currentForm,
                title: formDetails.title,
                name: formDetails.name?.toLowerCase()?.trim(),
                formType: formDetails.formType || "custom",
                collectionName: formDetails.collectionName?.trim() || undefined,
                sections,
                settings: formSettings,
            });
            await saveForm();
            setSaveSuccess(true);
            queryClient.invalidateQueries({ queryKey: ["forms"] });
            setTimeout(() => {
                setSaveSuccess(false);
                navigate("/form-studio");
            }, 800);
        } catch (error) {
            setSaveError(error?.message || "Failed to save form");
        }
    };

    const handleCancel = () => {
        clearForm();
        setCurrentForm(null);
        navigate("/form-studio");
    };

    if (!canManageFormDefinition || (!currentForm && formName)) {
        return (
            <Box sx={{ p: 2 }}>
                <Alert severity="error" sx={{ mb: 2 }}>
                    This form is not allow to access to you
                </Alert>
                <Button variant="outlined" onClick={() => navigate("/form-studio")}>
                    Back to Form Studio
                </Button>
            </Box>
        );
    }

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
                title="Form Builder"
                icon={<BuildIcon />}
                actions={
                    <>
                        <Button variant="outlined" size="small" startIcon={<ClearIcon />} onClick={handleCancel}>
                            Cancel
                        </Button>
                        <Button variant="contained" size="small" startIcon={<SaveIcon />} onClick={handleSave} disabled={!canManageFormDefinition}>
                            Save
                        </Button>
                    </>
                }
                sx={{ mb: 0.5, borderRadius: "10px", padding: 1.5 }}
            />

            <PageContent
                sx={{
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                    p: 1.5,
                }}
            >
                <>
                    {saveError && (
                        <Alert severity="error" sx={{ mb: 1.5 }} onClose={() => setSaveError(null)}>
                            {saveError}
                        </Alert>
                    )}
                    {saveSuccess && (
                        <Alert severity="success" sx={{ mb: 1.5 }} onClose={() => setSaveSuccess(false)}>
                            Form saved successfully!
                        </Alert>
                    )}

                    <Paper sx={{ p: 1.5, mb: 1.5, flexShrink: 0 }}>
                        <Typography
                            variant="caption"
                            sx={{
                                mb: 1,
                                display: "block",
                                fontWeight: 600,
                                color: "text.secondary",
                            }}
                        >
                            Form Basic Details
                        </Typography>
                        <Grid container spacing={1.5}>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    label="Form Title"
                                    fullWidth
                                    size="small"
                                    value={formDetails.title}
                                    onChange={(e) => handleFormTitleChange(e.target.value)}
                                    required
                                    disabled={!canManageFormDefinition}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    label="Form Name"
                                    fullWidth
                                    size="small"
                                    value={formDetails.name}
                                    onChange={(e) => {
                                        const v = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "");
                                        setFormDetails((prev) => ({
                                            ...prev,
                                            name: v,
                                        }));
                                    }}
                                    helperText="Unique identifier (lowercase)"
                                    required
                                    disabled={!canManageFormDefinition}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    select
                                    label="Form Type"
                                    fullWidth
                                    size="small"
                                    value={formDetails.formType}
                                    onChange={(e) =>
                                        setFormDetails((prev) => ({
                                            ...prev,
                                            formType: e.target.value,
                                        }))
                                    }
                                    SelectProps={{ native: true }}
                                    disabled={!siteAdmin}
                                    helperText={siteAdmin ? "System/master forms are manageable by Site Admin only" : "Managed by Site Admin"}
                                >
                                    <option value="custom">Custom</option>
                                    <option value="system">System</option>
                                    <option value="master_form">Master Form</option>
                                </TextField>
                            </Grid>
                        </Grid>
                    </Paper>

                    <Box
                        sx={{
                            flexGrow: 1,
                            display: "flex",
                            flexDirection: "column",
                            minWidth: 0,
                            overflow: "hidden",
                            mt: 0,
                        }}
                    >
                        <Paper sx={{ flexShrink: 0 }}>
                            <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ minHeight: 40 }}>
                                <Tab icon={<BuildIcon />} iconPosition="start" label="Form Canvas" />
                                <Tab icon={<SettingsIcon />} iconPosition="start" label="Settings" />
                                <Tab icon={<PreviewIcon />} iconPosition="start" label="Preview" />
                            </Tabs>
                        </Paper>

                        <Box
                            sx={{
                                flexGrow: 1,
                                overflow: "hidden",
                                mt: 1.5,
                                display: "flex",
                                flexDirection: "column",
                                minHeight: 0,
                            }}
                        >
                            {activeTab === 0 && (
                                <Box
                                    sx={{
                                        display: "flex",
                                        gap: 1.5,
                                        flexGrow: 1,
                                        minHeight: 0,
                                        overflow: "hidden",
                                        height: "100%",
                                    }}
                                >
                                    <Paper
                                        sx={{
                                            width: 240,
                                            flexShrink: 0,
                                            p: 1.5,
                                            display: "flex",
                                            flexDirection: "column",
                                            overflow: "hidden",
                                            height: "100%",
                                        }}
                                    >
                                        <Button
                                            variant="outlined"
                                            fullWidth
                                            size="small"
                                            startIcon={<AddIcon />}
                                            onClick={handleAddSection}
                                            disabled={!canManageFormDefinition}
                                            sx={{ mb: 1.5, flexShrink: 0 }}
                                        >
                                            Add Section
                                        </Button>
                                        <Box
                                            sx={{
                                                flexGrow: 1,
                                                overflow: "auto",
                                                pt: 1.5,
                                                borderTop: 1,
                                                borderColor: "divider",
                                            }}
                                        >
                                            <Typography
                                                variant="caption"
                                                sx={{
                                                    mb: 1,
                                                    display: "block",
                                                    fontWeight: 600,
                                                    color: "text.secondary",
                                                }}
                                            >
                                                Field Types
                                            </Typography>
                                            <FieldTypePanel
                                                fieldTypes={regularFieldTypes}
                                                onAddField={handleAddField}
                                                disabled={sections.length === 0 || !hasExpandedSection || !canManageFormDefinition}
                                            />
                                        </Box>
                                    </Paper>
                                    <Box
                                        sx={{
                                            flexGrow: 1,
                                            minWidth: 0,
                                            overflow: "auto",
                                            height: "100%",
                                        }}
                                    >
                                        <FormCanvas
                                            sections={sections}
                                            onFieldSelect={handleFieldSelect}
                                            onFieldDelete={handleFieldDelete}
                                            onFieldReorder={canManageFormDefinition ? reorderFields : () => {}}
                                            selectedField={selectedField}
                                            selectedSectionId={selectedSectionId}
                                            onSectionSelect={canManageFormDefinition ? setSelectedSectionId : () => {}}
                                            onSectionEdit={handleSectionEdit}
                                            onSectionDelete={(id) => {
                                                if (!canManageFormDefinition) return;
                                                removeSection(id);
                                            }}
                                            onExpandedSectionsChange={setHasExpandedSection}
                                        />
                                    </Box>
                                    <Paper
                                        sx={{
                                            width: 200,
                                            flexShrink: 0,
                                            p: 1.5,
                                            borderLeft: 1,
                                            borderColor: "divider",
                                        }}
                                    >
                                        <Typography
                                            variant="caption"
                                            sx={{
                                                mb: 1,
                                                display: "block",
                                                fontWeight: 600,
                                                color: "text.secondary",
                                            }}
                                        >
                                            Reference Types
                                        </Typography>
                                        <FieldTypePanel
                                            fieldTypes={referenceFieldTypes}
                                            onAddField={handleAddField}
                                            disabled={sections.length === 0 || !hasExpandedSection || !canManageFormDefinition}
                                        />
                                    </Paper>
                                </Box>
                            )}

                            {activeTab === 1 && (
                                <Paper
                                    sx={{
                                        p: 2,
                                        overflow: "auto",
                                        maxHeight: "100%",
                                    }}
                                >
                                    <Typography
                                        variant="caption"
                                        sx={{
                                            mb: 2,
                                            display: "block",
                                            fontWeight: 600,
                                            color: "text.secondary",
                                        }}
                                    >
                                        Form Settings
                                    </Typography>
                                    <Grid container spacing={2}>
                                        <Grid item xs={12} sm={6} md={4}>
                                            <TextField
                                                label="Form Icon (MUI icon name)"
                                                fullWidth
                                                size="small"
                                                value={formSettings.formIcon || ""}
                                                onChange={(e) =>
                                                    setFormSettings((prev) => ({
                                                        ...prev,
                                                        formIcon: e.target.value,
                                                    }))
                                                }
                                                disabled={!canManageFormDefinition}
                                                helperText="Optional icon key for navigation"
                                            />
                                        </Grid>
                                        <Grid item xs={12} sm={6} md={4}>
                                            <TextField
                                                select
                                                label="Fields Per Row"
                                                value={formSettings.fieldsPerRow || 1}
                                                onChange={(e) =>
                                                    setFormSettings((prev) => ({
                                                        ...prev,
                                                        fieldsPerRow: parseInt(e.target.value, 10),
                                                    }))
                                                }
                                                fullWidth
                                                size="small"
                                                SelectProps={{ native: true }}
                                                disabled={!canManageFormDefinition}
                                            >
                                                <option value={1}>1 Field</option>
                                                <option value={2}>2 Fields</option>
                                                <option value={3}>3 Fields</option>
                                            </TextField>
                                        </Grid>
                                        <Grid item xs={12} sm={6} md={4}>
                                            <FormControl component="fieldset" fullWidth>
                                                <RadioGroup
                                                    row
                                                    value={formSettings.sectionDisplayMode || "panel"}
                                                    onChange={(e) =>
                                                        setFormSettings((prev) => ({
                                                            ...prev,
                                                            sectionDisplayMode: e.target.value,
                                                        }))
                                                    }
                                                    disabled={!canManageFormDefinition}
                                                >
                                                    <FormControlLabel value="panel" control={<Radio size="small" />} label="Panel" />
                                                    <FormControlLabel value="stepper" control={<Radio size="small" />} label="Stepper" />
                                                </RadioGroup>
                                                <Typography
                                                    variant="caption"
                                                    color="text.secondary"
                                                    sx={{
                                                        display: "block",
                                                        mt: 0.5,
                                                    }}
                                                >
                                                    Sections as accordion panels or stepper
                                                </Typography>
                                            </FormControl>
                                        </Grid>
                                        <Grid item xs={12}>
                                            <FormControlLabel
                                                control={
                                                    <Switch
                                                        checked={formSettings.isPublic || false}
                                                        onChange={(e) =>
                                                            setFormSettings((prev) => ({
                                                                ...prev,
                                                                isPublic: e.target.checked,
                                                            }))
                                                        }
                                                        disabled={!canManageFormDefinition}
                                                    />
                                                }
                                                label="Public Form"
                                            />
                                        </Grid>
                                        <Grid item xs={12}>
                                            <FormControlLabel
                                                control={
                                                    <Switch
                                                        checked={formSettings.isSingleRecordForm || false}
                                                        onChange={(e) =>
                                                            setFormSettings((prev) => ({
                                                                ...prev,
                                                                isSingleRecordForm: e.target.checked,
                                                            }))
                                                        }
                                                        disabled={!canManageFormDefinition}
                                                    />
                                                }
                                                label="Single Record Form"
                                            />
                                        </Grid>
                                        <Grid item xs={12}>
                                            <FormControlLabel
                                                control={
                                                    <Switch
                                                        checked={formSettings.allowManageFromEntryPage || false}
                                                        onChange={(e) =>
                                                            setFormSettings((prev) => ({
                                                                ...prev,
                                                                allowManageFromEntryPage: e.target.checked,
                                                            }))
                                                        }
                                                        disabled={!canManageFormDefinition}
                                                    />
                                                }
                                                label="Allow Manage From Entry Page"
                                            />
                                        </Grid>
                                    </Grid>
                                </Paper>
                            )}

                            {activeTab === 2 && (
                                <Paper
                                    sx={{
                                        p: 1.5,
                                        overflow: "auto",
                                        maxHeight: "100%",
                                    }}
                                >
                                    {sections.some((s) => s.fields.length > 0) ? (
                                        <FormContainer
                                            formSchema={{
                                                title: formDetails.title,
                                                name: formDetails.name,
                                                sections,
                                            }}
                                            variant="plain"
                                            onSubmit={() => Promise.resolve()}
                                            isLoading={false}
                                            onSuccess={() => Promise.resolve()}
                                            mode="view"
                                        />
                                    ) : (
                                        <Typography color="text.secondary" sx={{ textAlign: "center", py: 4 }}>
                                            No fields yet. Add fields to preview.
                                        </Typography>
                                    )}
                                </Paper>
                            )}
                        </Box>
                    </Box>
                </>
            </PageContent>

            <>
                <FieldConfigDrawer
                    open={configDrawerOpen}
                    onClose={() => {
                        setConfigDrawerOpen(false);
                        selectField(null);
                    }}
                    field={selectedField}
                    fieldIndex={selectedFieldPath?.fieldIndex ?? null}
                    onSave={handleFieldConfigSave}
                    onValidateName={(name) => {
                        if (selectedFieldPath) {
                            return isFieldNameUnique(name, selectedFieldPath.sectionId, selectedFieldPath.fieldIndex);
                        }
                        return isFieldNameUnique(name);
                    }}
                />

                <SectionConfigDrawer
                    open={sectionConfigDrawerOpen}
                    onClose={() => {
                        setSectionConfigDrawerOpen(false);
                        setEditingSectionId(null);
                    }}
                    section={editingSectionId ? sections.find((s) => s.id === editingSectionId) || null : null}
                    onSave={(updates) => {
                        if (editingSectionId) {
                            if (!canManageFormDefinition) return;
                            useFormBuilderStore.getState().updateSection(editingSectionId, updates);
                            setSectionConfigDrawerOpen(false);
                            setEditingSectionId(null);
                        }
                    }}
                />
            </>
        </Box>
    );
}
