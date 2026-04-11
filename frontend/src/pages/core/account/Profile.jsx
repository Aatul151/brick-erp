import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Typography,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  alpha,
  TextField,
  Alert,
  Divider,
  Stack,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import LockIcon from '@mui/icons-material/Lock';
import EditIcon from '@mui/icons-material/Edit';
import { authApi } from '../../../utils/api/coreapi';
import { useAuth } from '../../../contexts/AuthContext';
import { formatDate } from '../../../utils/dateFormat';
import { PageHeader } from '../../../components/common/PageHeader';
import { PageContent } from '../../../components/common/PageContent';
import { StatusLabel } from '../../../components/common/StatusLabel';
import Button from '../../../components/ui/Button';

const TABS = [
  { id: 'account', label: 'Account', icon: PersonIcon },
  { id: 'password', label: 'Password', icon: LockIcon },
];

function InfoRow({ label, value }) {
  return (
    <Box sx={{ py: 1.5, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500, minWidth: 120 }}>
        {label}
      </Typography>
      <Box component="span" sx={{ flex: 1, color: 'text.primary', fontSize: '0.875rem' }}>
        {value}
      </Box>
    </Box>
  );
}

export default function Profile() {
  const { user, updateUser } = useAuth();

  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('account');
  const [accountForm, setAccountForm] = useState({
    fullName: user?.fullName || '',
    email: user?.email || '',
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const updateMutation = useMutation({
    mutationFn: authApi.updateProfile,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries(['profile']);
      if (variables.fullName != null || variables.email != null) {
        const updates = {};
        if (variables.fullName != null) updates.fullName = variables.fullName;
        if (variables.email != null) updates.email = variables.email;
        updateUser?.(updates);
      }
      setSuccess('Profile updated successfully');
      setError('');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setIsEditing(false);
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (err) => {
      setError(err.message || 'Something went wrong');
      setSuccess('');
      setTimeout(() => setError(''), 5000);
    },
  });

  const handleAccountSubmit = (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (accountForm.fullName === user?.fullName && accountForm.email === user?.email) {
      setIsEditing(false);
      return;
    }
    updateMutation.mutate({ fullName: accountForm.fullName, email: accountForm.email });
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!passwordForm.currentPassword) {
      setError('Current password is required');
      return;
    }
    if (!passwordForm.newPassword) {
      setError('New password is required');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    updateMutation.mutate({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword,
    });
  };

  const handleCancelEdit = () => {
    setAccountForm({ fullName: user?.fullName || '', email: user?.email || '' });
    setIsEditing(false);
    setError('');
  };

  return (
    <div className="px-4 sm:px-0 flex flex-col gap-4 min-h-0 flex-1">
      <PageHeader
        title="Profile Settings"
        subtitle="Manage your account and security"
        icon={<PersonIcon fontSize="small" color="primary" />}
      />
      <PageContent
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          gap: 2,
          p: 0,
          overflow: 'hidden',
          backgroundColor: 'transparent',
          border: 'none',
          boxShadow: 'none',
          '&:hover': { boxShadow: 'none' },
        }}
      >
        {/* Left: Tab navigation */}
        <Box
          sx={{
            width: { xs: '100%', md: 240 },
            flexShrink: 0,
            alignSelf: 'flex-start',
            backgroundColor: 'background.paper',
            borderRadius: 2,
            border: (theme) => `1px solid ${theme.palette.divider}`,
            boxShadow: (theme) =>
              theme.palette.mode === 'light'
                ? '0 2px 8px rgba(0,0,0,0.06)'
                : '0 2px 8px rgba(0,0,0,0.25)',
            overflow: 'hidden',
          }}
        >
          <List dense disablePadding sx={{ py: 0.5 }}>
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const selected = activeTab === tab.id;
              return (
                <ListItemButton
                  key={tab.id}
                  selected={selected}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setError('');
                    setSuccess('');
                  }}
                  sx={{
                    py: 1.5,
                    px: 2,
                    mx: 0.5,
                    borderRadius: 1,
                    '&.Mui-selected': {
                      backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.12),
                      borderLeft: '3px solid',
                      borderLeftColor: 'primary.main',
                      '&:hover': {
                        backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.16),
                      },
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 40, color: selected ? 'primary.main' : 'text.secondary' }}>
                    <Icon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={tab.label}
                    primaryTypographyProps={{
                      fontSize: '0.9375rem',
                      fontWeight: selected ? 600 : 400,
                    }}
                  />
                </ListItemButton>
              );
            })}
          </List>
        </Box>

        {/* Right: Content */}
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            minHeight: 280,
            p: { xs: 2, sm: 3 },
            overflow: 'auto',
            backgroundColor: 'background.paper',
            borderRadius: 2,
            border: (theme) => `1px solid ${theme.palette.divider}`,
            boxShadow: (theme) =>
              theme.palette.mode === 'light'
                ? '0 2px 8px rgba(0,0,0,0.06)'
                : '0 2px 8px rgba(0,0,0,0.25)',
          }}
        >
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
              {success}
            </Alert>
          )}

          {/* Account tab */}
          {activeTab === 'account' && (
            <Box>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
                <Typography variant="h6" fontWeight={600}>
                  Account Information
                </Typography>
                {!isEditing && (
                  <Button
                    variant="secondary"
                    size="sm"
                    startIcon={<EditIcon sx={{ fontSize: 18 }} />}
                    onClick={() => setIsEditing(true)}
                  >
                    Edit
                  </Button>
                )}
              </Stack>

              {isEditing ? (
                <form onSubmit={handleAccountSubmit}>
                  <Stack spacing={2} sx={{ maxWidth: 420 }}>
                    <TextField
                      label="Full Name"
                      value={accountForm.fullName}
                      onChange={(e) => setAccountForm({ ...accountForm, fullName: e.target.value })}
                      required
                      fullWidth
                      size="small"
                    />
                    <TextField
                      label="Email Address"
                      type="email"
                      value={accountForm.email}
                      onChange={(e) => setAccountForm({ ...accountForm, email: e.target.value })}
                      required
                      fullWidth
                      size="small"
                    />
                    <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                      <Button type="submit" disabled={updateMutation.isPending}>
                        {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                      </Button>
                      <Button variant="secondary" type="button" onClick={handleCancelEdit} disabled={updateMutation.isPending}>
                        Cancel
                      </Button>
                    </Stack>
                  </Stack>
                </form>
              ) : (
                <Stack spacing={0} divider={<Divider />}>
                  <InfoRow label="User ID" value={user?.id} />
                  <InfoRow label="Full Name" value={user?.fullName} />
                  <InfoRow label="Email" value={user?.email} />
                  <InfoRow label="Roles" value={user?.roles?.map((r) => r.roleName).join(', ')} />
                  <InfoRow label="Tenant" value={user?.tenantId || 'System'} />
                  <InfoRow label="Status" value={<StatusLabel value={user?.status} variant="status" />} />
                  <InfoRow label="Member Since" value={formatDate(user?.createdAt)} />
                </Stack>
              )}
            </Box>
          )}

          {/* Password tab */}
          {activeTab === 'password' && (
            <Box>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>
                Change Password
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Update your password to keep your account secure.
              </Typography>
              <form onSubmit={handlePasswordSubmit}>
                <Stack spacing={2} sx={{ maxWidth: 420 }}>
                  <TextField
                    label="Current Password"
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    placeholder="Enter your current password"
                    required
                    fullWidth
                    size="small"
                  />
                  <TextField
                    label="New Password"
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    placeholder="Min 6 characters"
                    required
                    fullWidth
                    size="small"
                    helperText="Password must be at least 6 characters"
                  />
                  <TextField
                    label="Confirm New Password"
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    placeholder="Re-enter your new password"
                    required
                    fullWidth
                    size="small"
                  />
                  <Box sx={{ pt: 1 }}>
                    <Button type="submit" disabled={updateMutation.isPending}>
                      {updateMutation.isPending ? 'Updating...' : 'Update Password'}
                    </Button>
                  </Box>
                </Stack>
              </form>
            </Box>
          )}
        </Box>
      </PageContent>
    </div>
  );
}
