import { Typography, Box, Button } from '@mui/material';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import EmailIcon from '@mui/icons-material/Email';
import NumbersIcon from '@mui/icons-material/Numbers';
import ListIcon from '@mui/icons-material/List';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import RadioButtonCheckedIcon from '@mui/icons-material/RadioButtonChecked';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import ArticleIcon from '@mui/icons-material/Article';
import ToggleOnIcon from '@mui/icons-material/ToggleOn';
import PaletteIcon from '@mui/icons-material/Palette';
import DynamicFormIcon from '@mui/icons-material/DynamicForm';
import ApiIcon from '@mui/icons-material/Api';

export const regularFieldTypes = [
  { type: 'text', label: 'Text Field', icon: <TextFieldsIcon /> },
  { type: 'email', label: 'Email', icon: <EmailIcon /> },
  { type: 'number', label: 'Number', icon: <NumbersIcon /> },
  { type: 'select', label: 'Select', icon: <ListIcon /> },
  { type: 'checkbox', label: 'Checkbox', icon: <CheckBoxIcon /> },
  { type: 'radio', label: 'Radio', icon: <RadioButtonCheckedIcon /> },
  { type: 'datepicker', label: 'Date & Time Picker', icon: <CalendarTodayIcon /> },
  { type: 'file', label: 'File Upload', icon: <AttachFileIcon /> },
  { type: 'ckeditor', label: 'Rich Text', icon: <ArticleIcon /> },
  { type: 'toggle', label: 'Toggle Button', icon: <ToggleOnIcon /> },
  { type: 'color', label: 'Color Picker', icon: <PaletteIcon /> }
];

export const referenceFieldTypes = [
  { type: 'formReference', label: 'Form Reference', icon: <DynamicFormIcon /> },
  { type: 'apiReference', label: 'API Reference', icon: <ApiIcon /> }
];

export function FieldTypePanel({ fieldTypes, onAddField, disabled = false, showDisabledMessage = true }) {
  return (
    <Box sx={{ opacity: disabled ? 0.6 : 1 }}>
      {disabled && showDisabledMessage && (
        <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
          Expand a section to add fields
        </Typography>
      )}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
        {fieldTypes.map((fieldType) => (
          <Button
            key={fieldType.type}
            variant="outlined"
            startIcon={fieldType.icon}
            onClick={() => onAddField(fieldType.type)}
            disabled={disabled}
            size="small"
            sx={{
              justifyContent: 'flex-start',
              textTransform: 'none',
              py: 0.75,
              fontSize: '0.8125rem'
            }}
            fullWidth
          >
            {fieldType.label}
          </Button>
        ))}
      </Box>
    </Box>
  );
}
