import dayjs from 'dayjs';

/** Migrate legacy form (fields array) to sections format. */
export function migrateFormToSections(form) {
  if (!form) return [];

  if (form.sections?.length > 0) {
    return form.sections.map((section) => ({
      id: section.id || `section_${Date.now()}_${Math.random()}`,
      title: section.title || 'Untitled Section',
      description: section.description,
      fields: section.fields || []
    }));
  }

  if (form.fields?.length > 0) {
    return [
      {
        id: `section_${Date.now()}`,
        title: 'Default Section',
        fields: form.fields
      }
    ];
  }

  return [];
}

/** Normalize API form schema for the builder/renderer. */
export function transformFormSchema(form) {
  if (!form) return null;
  const transformedForm = { ...form };
  if (transformedForm.sections?.length > 0) {
    transformedForm.sections = transformedForm.sections.map((section) => ({
      ...section,
      id: section.id || `section_${Date.now()}_${Math.random()}`,
      title: section.title || 'Untitled Section'
    }));
  }
  return transformedForm;
}

export function formatDateTime(value, options = {}) {
  const { format, datePickerMode = 'date', emptyValue = '—' } = options;
  if (value === null || value === undefined || value === '') return emptyValue;
  try {
    const date = dayjs(value);
    if (!date.isValid()) return emptyValue;
    if (format) return date.format(format);
    switch (datePickerMode) {
      case 'datetime':
        return date.format('DD MMM YYYY hh:mm A');
      case 'time':
        return date.format('hh:mm A');
      case 'date':
      default:
        return date.format('DD/MM/YYYY');
    }
  } catch {
    return emptyValue;
  }
}
