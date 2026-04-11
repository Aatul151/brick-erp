import { Drawer as MuiDrawer, Box, IconButton, Typography, Toolbar, useTheme } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

export function AppDrawer({
  open,
  onClose,
  title,
  children,
  width = 400,
  anchor = 'right'
}) {
  const theme = useTheme();

  return (
    <MuiDrawer
      anchor={anchor}
      open={open}
      onClose={onClose}
      sx={{
        zIndex: (t) => t.zIndex.drawer + 2
      }}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: width },
          boxSizing: 'border-box',
          borderRadius: 0,
          height: anchor === 'right' || anchor === 'left' ? '100%' : 'auto'
        }
      }}
    >
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Toolbar
          sx={{
            minHeight: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 2,
            borderBottom: `1px solid ${theme.palette.divider}`
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {title}
          </Typography>
          <IconButton onClick={onClose} size="small" sx={{ color: 'text.secondary' }}>
            <CloseIcon />
          </IconButton>
        </Toolbar>
        <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>{children}</Box>
      </Box>
    </MuiDrawer>
  );
}
