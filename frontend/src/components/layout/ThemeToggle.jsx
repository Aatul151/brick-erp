import { useState } from 'react';
import { Box, IconButton, Tooltip, useTheme, alpha } from '@mui/material';
import ColorLensIcon from '@mui/icons-material/ColorLens';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import { useThemeSettings } from '../../contexts/ThemeContext';
import { ThemeSettingsMenu } from './ThemeSettingsMenu';

export function ThemeToggle() {
  const theme = useTheme();
  const { isTenantUser, mode, toggleMode } = useThemeSettings();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
        <Tooltip title={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} placement="bottom" arrow>
          <IconButton
            onClick={toggleMode}
            size="small"
            sx={{
              color: mode === 'dark' ? 'primary.main' : 'text.secondary',
              '&:hover': { backgroundColor: alpha(theme.palette.action.hover, 0.1) },
            }}
          >
            {mode === 'dark' ? (
              <LightModeIcon fontSize="small" />
            ) : (
              <DarkModeIcon fontSize="small" />
            )}
          </IconButton>
        </Tooltip>
        {!isTenantUser && (
          <Tooltip title="Theme colors" placement="bottom" arrow>
            <IconButton
              onClick={() => setDrawerOpen(true)}
              size="small"
              sx={{
                color: 'text.secondary',
                '&:hover': { backgroundColor: alpha(theme.palette.action.hover, 0.1) },
              }}
            >
              <ColorLensIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>
      {!isTenantUser && (
        <ThemeSettingsMenu open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      )}
    </>
  );
}
