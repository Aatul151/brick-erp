import { useState, useEffect } from "react";
import { Paper, Typography, Box, IconButton, Chip, Accordion, AccordionSummary, AccordionDetails, alpha, useTheme, Tooltip, Snackbar, Alert } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import DoubleArrowOutlinedIcon from "@mui/icons-material/DoubleArrowOutlined";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useFormBuilderStore } from "../../../store/formBuilderStore";

function SortableFieldItem({ field, sectionId, fieldIndex, isSelected, onSelect, onDelete }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: `field-${sectionId}-${fieldIndex}`,
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    const getFieldIcon = (type) => {
        const map = {
            text: "📝",
            email: "✉️",
            number: "🔢",
            select: "📋",
            checkbox: "☑️",
            radio: "🔘",
            datepicker: "📅",
            file: "📎",
            ckeditor: "📄",
            toggle: "🔄",
            formReference: "🔗",
            apiReference: "🌐",
        };
        return map[type] || "📝";
    };

    return (
        <Box
            ref={setNodeRef}
            style={style}
            sx={{
                mb: 1.5,
                p: 1.5,
                border: isSelected ? 2 : 1,
                borderColor: isSelected ? "primary.main" : "divider",
                borderRadius: 1,
                backgroundColor: isSelected ? "action.selected" : "background.paper",
                cursor: "pointer",
                "&:hover": { backgroundColor: "action.hover" },
            }}
        >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <IconButton size="small" {...attributes} {...listeners} sx={{ cursor: "grab", "&:active": { cursor: "grabbing" } }}>
                    <DragIndicatorIcon />
                </IconButton>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {field.label}
                </Typography>
                <Chip label={getFieldIcon(field.type)} size="small" sx={{ mr: "auto" }} />
                <Chip label={field.type} size="small" color="primary" variant="outlined" />
                {field.required && <Chip label="Required" size="small" color="error" />}
                <IconButton size="small" onClick={onSelect}>
                    <EditIcon />
                </IconButton>
                <IconButton size="small" onClick={onDelete} color="error">
                    <DeleteIcon />
                </IconButton>
            </Box>
            {(field.type === "select" || field.type === "radio") && field.options?.length > 0 && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                    {field.label}:{" "}
                    {field.options
                        .map((opt) => {
                            const o = typeof opt === "string" ? { label: opt, value: opt } : opt;
                            return `${o.label} (${o.value})`;
                        })
                        .join(", ")}
                </Typography>
            )}
            {field.type === "formReference" && field.referenceFormName && field.referenceFieldName && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                    References: {field.referenceFormName} → {field.referenceFieldName}
                </Typography>
            )}
            {field.type === "apiReference" && field.apiEndpoint && field.apiLabelField && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                    API: {field.apiEndpoint} → {field.apiLabelField} ({field.apiValueField || "id"})
                </Typography>
            )}
        </Box>
    );
}

export function FormCanvas({ sections, onFieldSelect, onFieldDelete, onFieldReorder, selectedField, selectedSectionId, onSectionSelect, onSectionEdit, onSectionDelete, onExpandedSectionsChange }) {
    const theme = useTheme();
    const { updateSection, removeSection } = useFormBuilderStore();
    const [expandedSections, setExpandedSections] = useState(new Set());
    const [pendingSectionSelect, setPendingSectionSelect] = useState(null);
    const [snack, setSnack] = useState({
        open: false,
        message: "",
        severity: "error",
    });

    const showAlert = (severity, message) => setSnack({ open: true, message, severity });

    const handleAccordionChange = (sectionId) => {
        setExpandedSections((prev) => {
            const next = new Set(prev);
            if (next.has(sectionId)) next.delete(sectionId);
            else next.add(sectionId);
            return next;
        });
        onSectionSelect(sectionId);
    };

    useEffect(() => {
        onExpandedSectionsChange?.(expandedSections.size > 0);
    }, [expandedSections.size, onExpandedSectionsChange]);

    useEffect(() => {
        if (pendingSectionSelect) {
            onSectionSelect(pendingSectionSelect);
            setPendingSectionSelect(null);
        }
    }, [pendingSectionSelect, onSectionSelect]);

    useEffect(() => {
        if (sections.length > 0) {
            const newSections = sections.filter((s) => !expandedSections.has(s.id));
            if (newSections.length > 0) {
                const lastNew = newSections[newSections.length - 1];
                setExpandedSections((prev) => new Set(prev).add(lastNew.id));
                setPendingSectionSelect(lastNew.id);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- sync when section ids change
    }, [sections.map((s) => s.id).join(",")]);

    const handleSectionDelete = (sectionId) => {
        if (sections.length <= 1) {
            showAlert("error", "At least one section is required. Cannot delete the last section.");
            return;
        }
        if (onSectionDelete) onSectionDelete(sectionId);
        else removeSection(sectionId);
    };

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        }),
    );

    const handleDragEnd = (event) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const activeMatch = String(active.id).match(/field-(.+)-(\d+)/);
            const overMatch = String(over.id).match(/field-(.+)-(\d+)/);
            if (activeMatch && overMatch) {
                const activeSectionId = activeMatch[1];
                const activeFieldIndex = parseInt(activeMatch[2], 10);
                const overSectionId = overMatch[1];
                const overFieldIndex = parseInt(overMatch[2], 10);
                if (activeSectionId === overSectionId) {
                    onFieldReorder(activeSectionId, activeFieldIndex, overFieldIndex);
                }
            }
        }
    };

    return (
        <>
            <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack((s) => ({ ...s, open: false }))} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
                <Alert severity={snack.severity} onClose={() => setSnack((s) => ({ ...s, open: false }))}>
                    {snack.message}
                </Alert>
            </Snackbar>
            <Paper sx={{ p: 1.5, height: "100%", overflow: "auto" }}>
                {sections.length === 0 ? (
                    <Box
                        sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            minHeight: 400,
                            border: "2px dashed",
                            borderColor: "divider",
                        }}
                    >
                        <Typography variant="body1" color="text.secondary">
                            Creating default section...
                        </Typography>
                    </Box>
                ) : (
                    <Box
                        sx={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 1.5,
                        }}
                    >
                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                            {sections.map((section) => {
                                const fieldIds = section.fields.map((_, index) => `field-${section.id}-${index}`);
                                const isSectionSelected = selectedSectionId === section.id;
                                const isExpanded = expandedSections.has(section.id);

                                return (
                                    <Accordion
                                        key={section.id}
                                        expanded={isExpanded}
                                        onChange={() => handleAccordionChange(section.id)}
                                        sx={{
                                            mb: 1.5,
                                            border: isSectionSelected ? 2 : 1,
                                            borderColor: isSectionSelected ? "primary.main" : "divider",
                                        }}
                                    >
                                        <AccordionSummary
                                            expandIcon={<ExpandMoreIcon />}
                                            sx={{
                                                backgroundColor: isSectionSelected ? alpha(theme.palette.primary.main, 0.08) : "transparent",
                                                "&:hover": {
                                                    backgroundColor: alpha(theme.palette.primary.main, 0.12),
                                                },
                                            }}
                                        >
                                            <Box
                                                sx={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 1.5,
                                                    width: "100%",
                                                    pr: 2,
                                                }}
                                            >
                                                <DoubleArrowOutlinedIcon fontSize="small" color="primary" />
                                                <Typography
                                                    variant="subtitle2"
                                                    sx={{
                                                        fontWeight: 600,
                                                        flexGrow: 1,
                                                    }}
                                                >
                                                    {section.title}
                                                </Typography>
                                                {section.description && (
                                                    <Typography variant="caption" color="text.secondary">
                                                        {section.description}
                                                    </Typography>
                                                )}
                                                <Chip label={`${section.fields.length} field${section.fields.length !== 1 ? "s" : ""}`} size="small" variant="outlined" />
                                                <IconButton
                                                    component="div"
                                                    size="small"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (onSectionEdit) onSectionEdit(section.id);
                                                        else {
                                                            const newTitle = window.prompt("Enter section title:", section.title);
                                                            if (newTitle)
                                                                updateSection(section.id, {
                                                                    title: newTitle,
                                                                });
                                                        }
                                                    }}
                                                >
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                                <Tooltip title={sections.length <= 1 ? "At least one section is required" : "Delete section"} placement="bottom" arrow>
                                                    <IconButton
                                                        component="div"
                                                        size="small"
                                                        color="error"
                                                        disabled={sections.length <= 1}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleSectionDelete(section.id);
                                                        }}
                                                    >
                                                        <DeleteIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            </Box>
                                        </AccordionSummary>
                                        <AccordionDetails>
                                            {section.fields.length === 0 ? (
                                                <Typography
                                                    variant="body2"
                                                    color="text.secondary"
                                                    sx={{
                                                        textAlign: "center",
                                                        py: 2,
                                                    }}
                                                >
                                                    No fields in this section. Add fields from the left panel.
                                                </Typography>
                                            ) : (
                                                <SortableContext items={fieldIds} strategy={verticalListSortingStrategy}>
                                                    {section.fields.map((field, fieldIndex) => (
                                                        <SortableFieldItem
                                                            key={`field-${section.id}-${fieldIndex}`}
                                                            field={field}
                                                            sectionId={section.id}
                                                            fieldIndex={fieldIndex}
                                                            isSelected={selectedField === field}
                                                            onSelect={() => onFieldSelect(field, section.id, fieldIndex)}
                                                            onDelete={() => onFieldDelete(section.id, fieldIndex)}
                                                        />
                                                    ))}
                                                </SortableContext>
                                            )}
                                        </AccordionDetails>
                                    </Accordion>
                                );
                            })}
                        </DndContext>
                    </Box>
                )}
            </Paper>
        </>
    );
}
