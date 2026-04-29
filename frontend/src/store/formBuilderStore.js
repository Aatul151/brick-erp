import { create } from "zustand";
import { formsApi } from "../utils/api/coreapi";
import { migrateFormToSections } from "../utils/form-studio/formUtils";

const getAllFields = (sections) => sections.flatMap((s) => s.fields);

export const useFormBuilderStore = create((set, get) => ({
    currentForm: null,
    sections: [],
    selectedField: null,
    selectedSectionId: null,
    selectedFieldPath: null,
    isLoading: false,
    fields: [],

    setCurrentForm: (form) => {
        const sections = migrateFormToSections(form);
        set({
            currentForm: form,
            sections,
            fields: getAllFields(sections),
        });
    },

    addSection: (section) => {
        const sectionNumber = get().sections.length + 1;
        const newSection = {
            id: `section_${Date.now()}`,
            title: section?.title || `Section ${sectionNumber}`,
            description: section?.description,
            fields: section?.fields || [],
        };
        set((state) => ({
            sections: [...state.sections, newSection],
            fields: getAllFields([...state.sections, newSection]),
        }));
    },

    updateSection: (sectionId, updates) => {
        set((state) => {
            const newSections = state.sections.map((s) =>
                s.id === sectionId ? { ...s, ...updates } : s,
            );
            return { sections: newSections, fields: getAllFields(newSections) };
        });
    },

    removeSection: (sectionId) => {
        set((state) => {
            const newSections = state.sections.filter(
                (s) => s.id !== sectionId,
            );
            return {
                sections: newSections,
                fields: getAllFields(newSections),
                selectedField:
                    state.selectedFieldPath?.sectionId === sectionId
                        ? null
                        : state.selectedField,
                selectedFieldPath:
                    state.selectedFieldPath?.sectionId === sectionId
                        ? null
                        : state.selectedFieldPath,
            };
        });
    },

    reorderSections: (startIndex, endIndex) => {
        set((state) => {
            const newSections = [...state.sections];
            const [removed] = newSections.splice(startIndex, 1);
            newSections.splice(endIndex, 0, removed);
            return { sections: newSections, fields: getAllFields(newSections) };
        });
    },

    addField: (sectionId, field) => {
        set((state) => {
            const newSections = state.sections.map((s) =>
                s.id === sectionId ? { ...s, fields: [...s.fields, field] } : s,
            );
            return { sections: newSections, fields: getAllFields(newSections) };
        });
    },

    updateField: (sectionId, fieldIndex, field) => {
        set((state) => {
            const newSections = state.sections.map((s) =>
                s.id === sectionId
                    ? {
                          ...s,
                          fields: s.fields.map((f, i) =>
                              i === fieldIndex ? { ...f, ...field } : f,
                          ),
                      }
                    : s,
            );
            return { sections: newSections, fields: getAllFields(newSections) };
        });
    },

    removeField: (sectionId, fieldIndex) => {
        set((state) => {
            const newSections = state.sections.map((s) =>
                s.id === sectionId
                    ? {
                          ...s,
                          fields: s.fields.filter((_, i) => i !== fieldIndex),
                      }
                    : s,
            );
            const isSelected =
                state.selectedFieldPath?.sectionId === sectionId &&
                state.selectedFieldPath?.fieldIndex === fieldIndex;
            return {
                sections: newSections,
                fields: getAllFields(newSections),
                selectedField: isSelected ? null : state.selectedField,
                selectedFieldPath: isSelected ? null : state.selectedFieldPath,
            };
        });
    },

    reorderFields: (sectionId, startIndex, endIndex) => {
        set((state) => {
            const newSections = state.sections.map((s) => {
                if (s.id !== sectionId) return s;
                const newFields = [...s.fields];
                const [removed] = newFields.splice(startIndex, 1);
                newFields.splice(endIndex, 0, removed);
                return { ...s, fields: newFields };
            });
            return { sections: newSections, fields: getAllFields(newSections) };
        });
    },

    selectField: (field, sectionId, fieldIndex) => {
        set({
            selectedField: field,
            selectedSectionId: sectionId || null,
            selectedFieldPath:
                field && sectionId !== undefined && fieldIndex !== undefined
                    ? { sectionId, fieldIndex }
                    : null,
        });
    },

    clearForm: () => {
        set({
            currentForm: null,
            sections: [],
            fields: [],
            selectedField: null,
            selectedSectionId: null,
            selectedFieldPath: null,
        });
    },

    saveForm: async () => {
        const { currentForm, sections } = get();
        set({ isLoading: true });
        try {
            const apiSections = sections.map((section) => ({
                title: section.title,
                description: section.description,
                fields: section.fields,
                ...(section.id && { id: section.id }),
            }));

            const formData = {
                title: currentForm?.title || "New Form",
                name: currentForm?.name || "new_form",
                formType: currentForm?.formType || "custom",
                collectionName: currentForm?.collectionName || "",
                sections: apiSections,
                settings: currentForm?.settings || {},
            };

            const formId = currentForm?._id || currentForm?.id;
            let saved;
            if (formId) {
                saved = await formsApi.update(formId, formData);
            } else {
                saved = await formsApi.create(formData);
            }
            set({ currentForm: saved, isLoading: false });
        } catch (e) {
            console.error(e);
            set({ isLoading: false });
            throw e;
        }
    },

    loadForm: async (id) => {
        set({ isLoading: true });
        try {
            const form = await formsApi.getById(id);
            const sections = migrateFormToSections(form);
            const formWithId = { ...form, id: form._id || form.id };
            set({
                currentForm: formWithId,
                sections,
                fields: getAllFields(sections),
                isLoading: false,
            });
        } catch (e) {
            set({ isLoading: false });
            throw e;
        }
    },

    loadFormByName: async (name) => {
        set({ isLoading: true });
        try {
            const form = await formsApi.getByName(name);
            const sections = migrateFormToSections(form);
            const formWithId = { ...form, id: form._id || form.id };
            set({
                currentForm: formWithId,
                sections,
                fields: getAllFields(sections),
                isLoading: false,
            });
        } catch (e) {
            set({ isLoading: false });
            throw e;
        }
    },
}));
