import { Breadcrumbs, Link, Typography, Box } from '@mui/material';
import { useLocation } from 'wouter';
import HomeIcon from '@mui/icons-material/Home';
import { getBreadcrumbFromRoute } from '../../utils/navigation/breadcrumbConfig';
import { useBreadcrumb } from '../../contexts/BreadcrumbContext';

export function Breadcrumb({ size = 'default', sx: sxProp } = {}) {
  const [location, setLocation] = useLocation();
  const { customCrumbs } = useBreadcrumb();

  if (location === '/dashboard') return null;

  const crumbs = customCrumbs ?? getBreadcrumbFromRoute(location);

  if (crumbs.length === 0) return null;

  const isSmall = size === 'small';
  const fontSize = isSmall ? '0.75rem' : '0.875rem';
  const iconSize = isSmall ? 14 : 18;

  return (
    <Box
      sx={{
        mb: 2,
        px: { xs: 0, sm: 0.5 },
        ...sxProp,
      }}
    >
      <Breadcrumbs
        separator="/"
        sx={{
          '& .MuiBreadcrumbs-separator': {
            color: 'text.secondary',
            mx: 0.5,
            fontSize,
          },
          '& .MuiBreadcrumbs-li': { fontSize },
        }}
      >
        {crumbs.map((crumb, index) => {
          const isFirst = index === 0;
          const isLast = crumb.isLast;

          if (isLast) {
            return (
              <Typography
                key={crumb.path || index}
                variant="body2"
                color="text.primary"
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  fontWeight: 500,
                  fontSize,
                }}
              >
                {isFirst && crumb.label === 'Dashboard' && (
                  <HomeIcon sx={{ fontSize: iconSize, color: 'primary.main' }} />
                )}
                {crumb.label}
              </Typography>
            );
          }

          return (
            <Link
              key={crumb.path}
              component="button"
              variant="body2"
              underline="hover"
              color="text.secondary"
              onClick={() => setLocation(crumb.path)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                cursor: 'pointer',
                border: 'none',
                background: 'none',
                font: 'inherit',
                p: 0,
                fontSize,
                '&:hover': { color: 'primary.main' },
              }}
            >
              {isFirst && crumb.label === 'Dashboard' && (
                <HomeIcon sx={{ fontSize: iconSize, color: 'primary.main' }} />
              )}
              {crumb.label}
            </Link>
          );
        })}
      </Breadcrumbs>
    </Box>
  );
}
