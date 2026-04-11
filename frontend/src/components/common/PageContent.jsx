import { Box } from '@mui/material';

/**
 * PageContent - A reusable content container component for pages
 *
 * @param {React.ReactNode} children - The content to display
 * @param {object} [sx] - Optional MUI sx prop for additional styling
 */
export function PageContent({ children, sx }) {
  return (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        backgroundColor: 'background.paper',
        padding: { xs: 2, sm: 3 },
        borderRadius: '8px',
        border: (theme) => `1px solid ${theme.palette.divider}`,
        boxShadow: (theme) =>
          theme.palette.mode === 'light'
            ? '0 2px 8px rgba(0,0,0,0.06)'
            : '0 2px 8px rgba(0,0,0,0.25)',
        transition: 'all 0.2s ease-in-out',
        overflow: 'auto',
        overflowX: 'auto',
        overflowY: 'auto',
        '&:hover': {
          boxShadow: (theme) =>
            theme.palette.mode === 'light'
              ? '0 4px 12px rgba(0,0,0,0.08)'
              : '0 4px 12px rgba(0,0,0,0.3)',
        },
        ...sx,
      }}
    >
      {children}
    </Box>
  );
}
