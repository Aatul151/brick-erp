import { Typography, TextField, Button, Stack } from '@mui/material';
import { useState, useEffect } from 'react';
import { AppDrawer } from '../../common/AppDrawer';

export function SectionConfigDrawer({ open, onClose, section, onSave }) {
  const [formData, setFormData] = useState({});

  useEffect(() => {
    if (section) setFormData({ ...section });
  }, [section]);

  const handleChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    if (formData.title) {
      onSave(formData);
      onClose();
    }
  };

  return (
    <AppDrawer open={open} onClose={onClose} title="Section Configuration" anchor="right" width={400}>
      {section ? (
        <>
          <TextField
            label="Section Title"
            fullWidth
            size="small"
            value={formData.title || ''}
            onChange={(e) => handleChange('title', e.target.value)}
            margin="normal"
            required
          />
          <TextField
            label="Description (Optional)"
            fullWidth
            size="small"
            multiline
            rows={3}
            value={formData.description || ''}
            onChange={(e) => handleChange('description', e.target.value)}
            margin="normal"
          />
          <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
            <Button variant="outlined" size="small" onClick={onClose} sx={{ flex: 1 }}>
              Cancel
            </Button>
            <Button variant="contained" size="small" onClick={handleSave} sx={{ flex: 1 }} disabled={!formData.title}>
              Save
            </Button>
          </Stack>
        </>
      ) : (
        <Typography color="text.secondary">No section selected</Typography>
      )}
    </AppDrawer>
  );
}
