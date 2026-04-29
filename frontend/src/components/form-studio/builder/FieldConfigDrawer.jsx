import {
    Box,
    Typography,
    TextField,
    FormControlLabel,
    Switch,
    Button,
    Divider,
    Chip,
    Stack,
    Radio,
    RadioGroup,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { useState, useEffect } from "react";
import { AppDrawer } from "../../common/AppDrawer";
import { SearchableSelect } from "./SearchableSelect";
import { formsApi } from "../../../utils/api/coreapi";
import { apiReferenceService } from "../../../utils/form-studio/apiReferenceService";

export function FieldConfigDrawer({
    open,
    onClose,
    field,
    fieldIndex: _fieldIndex,
    onSave,
    onDelete: _onDelete,
    onValidateName,
}) {
    const [formData, setFormData] = useState({});
    const [newOptionLabel, setNewOptionLabel] = useState("");
    const [newOptionValue, setNewOptionValue] = useState("");
    const [nameError, setNameError] = useState("");
    const [availableForms, setAvailableForms] = useState([]);
    const [selectedFormSchema, setSelectedFormSchema] = useState(null);
    const [loadingForms, setLoadingForms] = useState(false);
    const [loadingFormSchema, setLoadingFormSchema] = useState(false);
    const [availableEndpoints] = useState(
        apiReferenceService.getAvailableEndpoints(),
    );

    useEffect(() => {
        if (field) {
            setFormData({ ...field });
            if (field.type === "formReference") {
                loadAvailableForms();
                if (field.referenceFormName)
                    loadFormSchema(field.referenceFormName);
            }
        } else {
            setAvailableForms([]);
            setSelectedFormSchema(null);
        }
    }, [field]);

    const loadAvailableForms = async () => {
        setLoadingForms(true);
        try {
            const forms = await formsApi.getAllWithMaster();
            setAvailableForms(forms);
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingForms(false);
        }
    };

    const loadFormSchema = async (formName) => {
        setLoadingFormSchema(true);
        try {
            const schema = await formsApi.getByName(formName);
            setSelectedFormSchema(schema);
        } catch (e) {
            console.error(e);
            setSelectedFormSchema(null);
        } finally {
            setLoadingFormSchema(false);
        }
    };

    const handleFormSelect = async (formName) => {
        handleChange("referenceFormName", formName);
        handleChange("referenceFieldName", "");
        await loadFormSchema(formName);
    };

    const handleApiEndpointChange = (endpoint) => {
        handleChange("apiEndpoint", endpoint);
        const referenceModel = availableEndpoints.find(
            (e) => e.value === endpoint,
        )?.referenceModel;
        handleChange("referenceModel", referenceModel);
        handleChange("apiLabelField", "");
        handleChange("apiValueField", "_id");
    };

    const handleChange = (key, value) => {
        setFormData((prev) => ({ ...prev, [key]: value }));
    };

    const handleAddOption = () => {
        if (newOptionLabel.trim() && newOptionValue.trim()) {
            const newOption = {
                label: newOptionLabel.trim(),
                value: newOptionValue.trim(),
            };
            const current = formData.options || [];
            const normalized = current.map((opt) =>
                typeof opt === "string" ? { label: opt, value: opt } : opt,
            );
            handleChange("options", [...normalized, newOption]);
            setNewOptionLabel("");
            setNewOptionValue("");
        }
    };

    const handleRemoveOption = (index) => {
        if (formData.options) {
            handleChange(
                "options",
                formData.options.filter((_, i) => i !== index),
            );
        }
    };

    const normalizeOptions = (options) => {
        if (!options) return [];
        return options.map((opt) =>
            typeof opt === "string" ? { label: opt, value: opt } : opt,
        );
    };

    const handleSave = () => {
        if (nameError) return;
        if (
            formData.type === "formReference" &&
            (!formData.referenceFormName || !formData.referenceFieldName)
        ) {
            return;
        }
        if (
            formData.type === "apiReference" &&
            (!formData.apiEndpoint || !formData.apiLabelField)
        ) {
            return;
        }
        if (field && formData.type && formData.label && formData.name) {
            onSave(formData);
            onClose();
        }
    };

    const needsOptions =
        formData.type === "select" || formData.type === "radio";
    const isFormReference = formData.type === "formReference";
    const isApiReference = formData.type === "apiReference";
    const supportsMultiple =
        formData.type === "select" ||
        formData.type === "formReference" ||
        formData.type === "apiReference" ||
        formData.type === "file";

    const getAvailableFields = () => {
        if (!selectedFormSchema) return [];
        return (
            selectedFormSchema.sections?.flatMap((s) => s.fields) ||
            selectedFormSchema.fields ||
            []
        );
    };

    const formOptions = availableForms.map((f) => ({
        label: `${f.title} (${f.name})`,
        value: f.name,
    }));
    const fieldOptions = getAvailableFields().map((f) => ({
        label: `${f.label} (${f.name})`,
        value: f.name,
    }));
    const endpointOptions = availableEndpoints.map((e) => ({
        label: `${e.label} (${e.value})`,
        value: e.value,
    }));

    return (
        <AppDrawer
            open={open}
            onClose={onClose}
            title="Field Configuration"
            anchor="right"
            width={400}
        >
            {field ? (
                <>
                    <TextField
                        label="Field Label"
                        fullWidth
                        size="small"
                        value={formData.label || ""}
                        onChange={(e) => handleChange("label", e.target.value)}
                        margin="normal"
                        required
                    />
                    <TextField
                        label="Field Name"
                        fullWidth
                        size="small"
                        value={formData.name || ""}
                        onChange={(e) => {
                            const value = e.target.value;
                            handleChange("name", value);
                            if (onValidateName && value) {
                                setNameError(
                                    onValidateName(value)
                                        ? ""
                                        : "Field name must be unique across all sections",
                                );
                            } else {
                                setNameError("");
                            }
                        }}
                        margin="normal"
                        required
                        error={!!nameError}
                        helperText={
                            nameError ||
                            "Used as the field identifier (e.g. 'user_name')"
                        }
                    />
                    <TextField
                        label="Placeholder"
                        fullWidth
                        size="small"
                        value={formData.placeholder || ""}
                        onChange={(e) =>
                            handleChange("placeholder", e.target.value)
                        }
                        margin="normal"
                    />
                    <FormControlLabel
                        control={
                            <Switch
                                checked={formData.required || false}
                                onChange={(e) =>
                                    handleChange("required", e.target.checked)
                                }
                            />
                        }
                        label="Required Field"
                        sx={{ mt: 2, mb: 2 }}
                    />
                    <FormControlLabel
                        control={
                            <Switch
                                checked={formData.allowFilter || false}
                                onChange={(e) =>
                                    handleChange(
                                        "allowFilter",
                                        e.target.checked,
                                    )
                                }
                            />
                        }
                        label="Allow Filter"
                    />
                    {supportsMultiple && (
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={formData.allowMultiple || false}
                                    onChange={(e) =>
                                        handleChange(
                                            "allowMultiple",
                                            e.target.checked,
                                        )
                                    }
                                />
                            }
                            label="Allow Multiple Selection"
                            sx={{ mt: 1 }}
                        />
                    )}

                    {isFormReference && (
                        <Box sx={{ mt: 2 }}>
                            <Typography variant="subtitle2" gutterBottom>
                                Form Reference Configuration
                            </Typography>
                            <SearchableSelect
                                label="Select Form"
                                value={formData.referenceFormName || ""}
                                onChange={handleFormSelect}
                                options={formOptions}
                                disabled={loadingForms}
                                loading={loadingForms}
                                loadingText="Loading forms..."
                                emptyText="No forms available"
                                placeholder="Search forms..."
                                margin="normal"
                            />
                            {formData.referenceFormName && (
                                <SearchableSelect
                                    label="Select Label Field"
                                    value={formData.referenceFieldName || ""}
                                    onChange={(value) =>
                                        handleChange(
                                            "referenceFieldName",
                                            value,
                                        )
                                    }
                                    options={fieldOptions}
                                    disabled={
                                        loadingFormSchema || !selectedFormSchema
                                    }
                                    loading={loadingFormSchema}
                                    loadingText="Loading form fields..."
                                    emptyText="No fields available"
                                    placeholder="Search fields..."
                                    margin="normal"
                                />
                            )}
                        </Box>
                    )}

                    {isApiReference && (
                        <Box sx={{ mt: 2 }}>
                            <Typography variant="subtitle2" gutterBottom>
                                API Reference Configuration
                            </Typography>
                            <SearchableSelect
                                label="Select API Endpoint"
                                value={formData.apiEndpoint || ""}
                                onChange={handleApiEndpointChange}
                                options={endpointOptions}
                                emptyText="No endpoints available"
                                placeholder="Search endpoints..."
                                margin="normal"
                            />
                            {formData.apiEndpoint && (
                                <>
                                    <TextField
                                        label="Label Field"
                                        fullWidth
                                        size="small"
                                        value={formData.apiLabelField || ""}
                                        onChange={(e) =>
                                            handleChange(
                                                "apiLabelField",
                                                e.target.value,
                                            )
                                        }
                                        margin="normal"
                                        placeholder="e.g., name, title"
                                        helperText="Field name from API response to display as label"
                                    />
                                    <TextField
                                        label="Value Field"
                                        fullWidth
                                        size="small"
                                        value={formData.apiValueField || "_id"}
                                        onChange={(e) =>
                                            handleChange(
                                                "apiValueField",
                                                e.target.value,
                                            )
                                        }
                                        margin="normal"
                                        placeholder="_id"
                                        helperText="Field name from API response to use as value (default: _id)"
                                    />
                                </>
                            )}
                        </Box>
                    )}

                    {needsOptions && (
                        <Box sx={{ mt: 2 }}>
                            <Typography variant="subtitle2" gutterBottom>
                                Options
                            </Typography>
                            <Stack spacing={1.5} sx={{ mb: 2 }}>
                                <TextField
                                    size="small"
                                    placeholder="Label"
                                    value={newOptionLabel}
                                    onChange={(e) =>
                                        setNewOptionLabel(e.target.value)
                                    }
                                    fullWidth
                                />
                                <TextField
                                    size="small"
                                    placeholder="Value"
                                    value={newOptionValue}
                                    onChange={(e) =>
                                        setNewOptionValue(e.target.value)
                                    }
                                    onKeyPress={(e) => {
                                        if (e.key === "Enter")
                                            handleAddOption();
                                    }}
                                    fullWidth
                                />
                                <Button
                                    variant="outlined"
                                    size="small"
                                    onClick={handleAddOption}
                                    startIcon={<AddIcon />}
                                    disabled={
                                        !newOptionLabel.trim() ||
                                        !newOptionValue.trim()
                                    }
                                >
                                    Add Option
                                </Button>
                            </Stack>
                            <Stack
                                direction="row"
                                spacing={1}
                                flexWrap="wrap"
                                gap={1}
                            >
                                {normalizeOptions(formData.options).map(
                                    (option, index) => (
                                        <Chip
                                            key={index}
                                            label={`${option.label}: ${option.value}`}
                                            onDelete={() =>
                                                handleRemoveOption(index)
                                            }
                                            color="primary"
                                            variant="outlined"
                                        />
                                    ),
                                )}
                            </Stack>
                        </Box>
                    )}

                    {formData.type === "number" && (
                        <Box sx={{ mt: 2 }}>
                            <TextField
                                label="Min Value"
                                type="number"
                                fullWidth
                                size="small"
                                value={formData.validation?.min ?? ""}
                                onChange={(e) =>
                                    handleChange("validation", {
                                        ...formData.validation,
                                        min: e.target.value
                                            ? Number(e.target.value)
                                            : undefined,
                                    })
                                }
                                margin="normal"
                            />
                            <TextField
                                label="Max Value"
                                type="number"
                                fullWidth
                                size="small"
                                value={formData.validation?.max ?? ""}
                                onChange={(e) =>
                                    handleChange("validation", {
                                        ...formData.validation,
                                        max: e.target.value
                                            ? Number(e.target.value)
                                            : undefined,
                                    })
                                }
                                margin="normal"
                            />
                        </Box>
                    )}

                    {formData.type === "datepicker" && (
                        <Box sx={{ mt: 2 }}>
                            <Typography variant="subtitle2" gutterBottom>
                                Date Picker Configuration
                            </Typography>
                            <RadioGroup
                                value={
                                    formData.datePickerMode ??
                                    (formData.displayTime ? "datetime" : "date")
                                }
                                onChange={(e) =>
                                    handleChange(
                                        "datePickerMode",
                                        e.target.value,
                                    )
                                }
                                sx={{ mt: 1 }}
                            >
                                <FormControlLabel
                                    value="date"
                                    control={<Radio size="small" />}
                                    label="Only date"
                                />
                                <FormControlLabel
                                    value="datetime"
                                    control={<Radio size="small" />}
                                    label="Date with time"
                                />
                                <FormControlLabel
                                    value="time"
                                    control={<Radio size="small" />}
                                    label="Only time"
                                />
                            </RadioGroup>
                        </Box>
                    )}

                    {formData.type === "file" && (
                        <Box sx={{ mt: 2 }}>
                            <Typography variant="subtitle2" gutterBottom>
                                File Upload Configuration
                            </Typography>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={
                                            formData.allowMultiple || false
                                        }
                                        onChange={(e) =>
                                            handleChange(
                                                "allowMultiple",
                                                e.target.checked,
                                            )
                                        }
                                    />
                                }
                                label="Allow Multiple Files"
                                sx={{ mb: 2 }}
                            />
                            <TextField
                                label="Max File Size (MB)"
                                type="number"
                                fullWidth
                                size="small"
                                value={
                                    formData.validation?.maxFileSize
                                        ? (
                                              formData.validation.maxFileSize /
                                              (1024 * 1024)
                                          ).toFixed(2)
                                        : ""
                                }
                                onChange={(e) => {
                                    const mbValue = e.target.value
                                        ? parseFloat(e.target.value)
                                        : undefined;
                                    handleChange("validation", {
                                        ...formData.validation,
                                        maxFileSize: mbValue
                                            ? Math.round(mbValue * 1024 * 1024)
                                            : undefined,
                                    });
                                }}
                                margin="normal"
                                inputProps={{ min: 0, step: 0.1 }}
                                helperText="Maximum file size in megabytes (MB) per file"
                            />
                            <TextField
                                label="Allowed File Types"
                                fullWidth
                                size="small"
                                value={
                                    formData.validation?.allowedFileTypes?.join(
                                        ", ",
                                    ) || ""
                                }
                                onChange={(e) => {
                                    const types = e.target.value
                                        .split(",")
                                        .map((t) => t.trim())
                                        .filter(Boolean)
                                        .map((t) => t.replace(/^\./, ""));
                                    handleChange("validation", {
                                        ...formData.validation,
                                        allowedFileTypes:
                                            types.length > 0
                                                ? types
                                                : undefined,
                                    });
                                }}
                                margin="normal"
                                placeholder="pdf, jpg, png, doc, docx"
                                helperText="Comma-separated file extensions (e.g., pdf, jpg, png, doc, docx). Leave empty to allow all file types."
                            />
                        </Box>
                    )}

                    <Divider sx={{ my: 3 }} />
                    <Stack direction="row" spacing={2}>
                        <Button
                            variant="contained"
                            size="small"
                            onClick={handleSave}
                            sx={{ flex: 1 }}
                            disabled={
                                !formData.label ||
                                !formData.name ||
                                (formData.type === "formReference" &&
                                    (!formData.referenceFormName ||
                                        !formData.referenceFieldName)) ||
                                (formData.type === "apiReference" &&
                                    (!formData.apiEndpoint ||
                                        !formData.apiLabelField))
                            }
                        >
                            Save
                        </Button>
                    </Stack>
                </>
            ) : (
                <Typography color="text.secondary">
                    No field selected
                </Typography>
            )}
        </AppDrawer>
    );
}
