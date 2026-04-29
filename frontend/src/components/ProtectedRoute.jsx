import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Box, CircularProgress, Typography, Paper, alpha } from '@mui/material';
import BlockIcon from '@mui/icons-material/Block';
import ExtensionOffIcon from '@mui/icons-material/ExtensionOff';
import { useAuth } from '../contexts/AuthContext';
import { moduleApi } from '../utils/api/coreapi';
import { PageContent } from './common/PageContent';
import Button from './ui/Button';

export default function ProtectedRoute({ children, roles = [], permission }) {
  const { user, loading, hasPermission } = useAuth();
  const navigate = useNavigate();

  const { data: modules, isLoading: modulesLoading } = useQuery({
    queryKey: ['modules', 'all'],
    queryFn: () => moduleApi.getAll(),
    enabled: !!permission?.resource
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  if (loading || (permission?.resource && modulesLoading)) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress color="primary" size={48} />
      </Box>
    );
  }

  if (!user) {
    return null;
  }

  let hasAccess = true;
  let deniedReason = null;
  if (permission) {
    if (user?.permissions?.length) {
      hasAccess = hasPermission(permission.resource, permission.action);
    } else if (roles.length > 0) {
      hasAccess = roles.some(role => user.roles?.some(r => r.roleName === role));
    }
    if (hasAccess && modules?.length) {
      const module = modules.find((m) => m.slug === permission.resource);
      if (module && !module.isActive) {
        hasAccess = false;
        deniedReason = 'module_inactive';
      }
    }
  } else if (roles.length > 0) {
    hasAccess = roles.some(role => user.roles?.some(r => r.roleName === role));
  }

  if (!hasAccess) {
    const isModuleInactive = deniedReason === 'module_inactive';
    const Icon = isModuleInactive ? ExtensionOffIcon : BlockIcon;
    const title = isModuleInactive ? 'Module Inactive' : 'Access Denied';
    const description = isModuleInactive
      ? 'You have permission for this page, but this module is currently inactive. Contact your administrator to enable it.'
      : "You don't have permission to access this page. Contact your administrator if you believe this is an error.";

    return (
      <Box
        sx={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'background.default',
          zIndex: 1000
        }}
      >
        <Paper
          elevation={0}
          sx={{
            p: 5,
            textAlign: 'center',
            border: (theme) => `1px solid ${theme.palette.divider}`,
            borderRadius: 2,
            maxWidth: 480,
            width: '90%'
          }}
        >
            <Box
              sx={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 2,
                backgroundColor: (theme) =>
                  alpha(isModuleInactive ? theme.palette.warning.main : theme.palette.error.main, 0.12),
                color: isModuleInactive ? 'warning.main' : 'error.main'
              }}
            >
              <Icon sx={{ fontSize: 40 }} />
            </Box>
            <Typography variant="h5" fontWeight={600} sx={{ mb: 1.5 }}>
              {title}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3, lineHeight: 1.6 }}>
              {description}
            </Typography>
            <Button variant="secondary" onClick={() => navigate('/dashboard')}>
              Go to Dashboard
            </Button>
          </Paper>
      </Box>
    );
  }

  return children;
}
