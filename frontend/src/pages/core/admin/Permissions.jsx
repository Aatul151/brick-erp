import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Checkbox,
  alpha,
  useTheme,
  Skeleton
} from '@mui/material';
import SecurityIcon from '@mui/icons-material/Security';
import { roleApi, permissionApi, moduleApi } from '../../../utils/api/coreapi';
import { RESOURCE, ACTION } from '../../../utils/resources';
import { useAuth } from '../../../contexts/AuthContext';
import { PageHeader } from '../../../components/common/PageHeader';
import { PageContent } from '../../../components/common/PageContent';
import { AppDataTable } from '../../../components/common/AppDataTable';
import Button from '../../../components/ui/Button';

const ACTIONS = ['menu', 'read', 'create', 'update', 'delete'];

const formatModuleName = (name) => name?.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) || '';

const formatActionLabel = (action) => {
  const map = { menu: 'Menu', create: 'Create', read: 'Read', update: 'Update', delete: 'Delete' };
  return map[action] || action;
};

export default function Permissions() {
  const queryClient = useQueryClient();
  const theme = useTheme();
  const { hasPermission } = useAuth();
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [selectedPermissionIds, setSelectedPermissionIds] = useState(new Set());
  const [pendingCreate, setPendingCreate] = useState(new Set());
  const [headerCreatingAction, setHeaderCreatingAction] = useState(null);

  const { data: rolesData, isLoading: rolesLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: roleApi.getAll
  });

  const { data: permissionsData, isLoading: permissionsLoading } = useQuery({
    queryKey: ['permissions'],
    queryFn: permissionApi.getAll
  });

  const { data: modulesData } = useQuery({
    queryKey: ['modules'],
    queryFn: () => moduleApi.getAll()
  });

  const { data: roleData, isLoading: roleLoading } = useQuery({
    queryKey: ['role', selectedRoleId],
    queryFn: () => roleApi.getOne(selectedRoleId),
    enabled: !!selectedRoleId
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, data }) => roleApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries(['role', variables.id]);
      queryClient.invalidateQueries(['roles']);
      queryClient.invalidateQueries(['permissions']);
    }
  });

  const createPermissionMutation = useMutation({
    mutationFn: permissionApi.create,
    onSuccess: () => queryClient.invalidateQueries(['permissions'])
  });

  const roles = rolesData || [];
  const allPermissions = permissionsData?.permissions || [];
  const role = roleData;

  const permissionMap = useMemo(() => {
    const map = new Map();
    allPermissions.forEach((p) => map.set(`${p.resourceName}_${p.action}`, p));
    return map;
  }, [allPermissions]);

  const moduleNameMap = useMemo(() => {
    const map = new Map();
    (modulesData || []).forEach((m) => map.set(m.slug, m.name));
    return map;
  }, [modulesData]);

  const modules = useMemo(() => {
    const fromApi = (modulesData || []).map((m) => m.slug);
    const fromPerms = [...new Set(allPermissions.map((p) => p.resourceName))];
    return [...new Set([...fromApi, ...fromPerms])].sort();
  }, [modulesData, allPermissions]);

  const rows = useMemo(() => {
    return modules.map((module) => {
      const row = {
        id: module,
        module: moduleNameMap.get(module) || formatModuleName(module),
        moduleKey: module
      };
      ACTIONS.forEach((action) => {
        const perm = permissionMap.get(`${module}_${action}`);
        row[action] = perm?.id ?? null;
      });
      return row;
    });
  }, [modules, permissionMap, moduleNameMap]);

  useEffect(() => {
    if (role?.permissions) {
      const ids = new Set(role.permissions.map((p) => p.permissionId));
      setSelectedPermissionIds(ids);
    } else if (selectedRoleId && !roleLoading) {
      setSelectedPermissionIds(new Set());
    }
  }, [role?.permissions, selectedRoleId, roleLoading]);

  const handleRoleChange = (e) => {
    setSelectedRoleId(e.target.value || '');
  };

  // Toggle existing permission for the role
  const handleCheckboxChange = (permissionId, checked) => {
    setSelectedPermissionIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(permissionId);
      else next.delete(permissionId);
      return next;
    });
  };

  // Select/deselect all for that action column
  const handleHeaderCheck = async (action, checked) => {
    if (checked) {
      setHeaderCreatingAction(action);
      const toCreate = rows.filter((r) => r[action] == null).map((r) => ({ moduleKey: r.moduleKey, action }));
      const existingIds = rows.filter((r) => r[action] != null).map((r) => r[action]);
      const newIds = [...existingIds];
      try {
        for (const { moduleKey } of toCreate) {
          const perm = await createPermissionMutation.mutateAsync({
            resourceName: moduleKey,
            action,
            description: `${formatActionLabel(action)} ${formatModuleName(moduleKey)}`
          });
          newIds.push(perm.id);
          queryClient.setQueryData(['permissions'], (old) => {
            if (!old) return old;
            const perms = [...(old.permissions || []), { ...perm, roleCount: 0 }];
            const grouped = perms.reduce((acc, p) => {
              if (!acc[p.resourceName]) acc[p.resourceName] = [];
              acc[p.resourceName].push(p);
              return acc;
            }, {});
            return { permissions: perms, grouped };
          });
        }
        setSelectedPermissionIds((prev) => {
          const next = new Set(prev);
          newIds.forEach((id) => next.add(id));
          return next;
        });
      } catch (err) {
        console.error('Failed to create permissions:', err);
      } finally {
        setHeaderCreatingAction(null);
      }
    } else {
      const permIds = rows.filter((r) => r[action] != null).map((r) => r[action]);
      setSelectedPermissionIds((prev) => {
        const next = new Set(prev);
        permIds.forEach((id) => next.delete(id));
        return next;
      });
    }
  };

  // Create permission and assign to the role
  const handleCheckboxChangeForNew = async (moduleKey, action) => {
    const key = `${moduleKey}_${action}`;
    setPendingCreate((prev) => new Set([...prev, key]));
    try {
      const perm = await createPermissionMutation.mutateAsync({
        resourceName: moduleKey,
        action,
        description: `${formatActionLabel(action)} ${formatModuleName(moduleKey)}`
      });
      setSelectedPermissionIds((prev) => new Set([...prev, perm.id]));
      queryClient.setQueryData(['permissions'], (old) => {
        if (!old) return old;
        const perms = [...(old.permissions || []), { ...perm, roleCount: 0 }];
        const grouped = perms.reduce((acc, p) => {
          if (!acc[p.resourceName]) acc[p.resourceName] = [];
          acc[p.resourceName].push(p);
          return acc;
        }, {});
        return { permissions: perms, grouped };
      });
    } catch (err) {
      console.error('Failed to create permission:', err);
    } finally {
      setPendingCreate((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  const handleSave = async () => {
    if (!selectedRoleId) return;
    const permissionIds = Array.from(selectedPermissionIds).map(Number);
    await updateRoleMutation.mutateAsync({
      id: selectedRoleId,
      data: { permissionIds }
    });
  };

  const hasChanges = useMemo(() => {
    if (!role?.permissions) return selectedPermissionIds.size > 0;
    const currentIds = new Set(role.permissions.map((p) => p.permissionId));
    if (currentIds.size !== selectedPermissionIds.size) return true;
    for (const id of selectedPermissionIds) {
      if (!currentIds.has(id)) return true;
    }
    return false;
  }, [role?.permissions, selectedPermissionIds]);

  const isLoading = rolesLoading || permissionsLoading;

  const columns = useMemo(
    () => [
      {
        field: 'module',
        headerName: 'Module',
        flex: 1,
        minWidth: 140,
        sortable: false,
        filterable: false
      },
      ...ACTIONS.map((action) => {
        const totalModules = rows.length;
        const selectedCount = rows.filter((r) => {
          const permId = r[action];
          const key = `${r.moduleKey}_${action}`;
          return permId != null ? selectedPermissionIds.has(permId) : pendingCreate.has(key);
        }).length;
        const allChecked = totalModules > 0 && selectedCount === totalModules;
        const someChecked = selectedCount > 0 && selectedCount < totalModules;
        const canUpdate = hasPermission(RESOURCE.ROLES, ACTION.UPDATE);

        return {
          field: action,
          headerName: formatActionLabel(action),
          width: 100,
          align: 'center',
          headerAlign: 'center',
          sortable: false,
          filterable: false,
          disableColumnMenu: true,
          headerClassName: 'permissions-action-header',
          renderHeader: () => (
            <Box
              sx={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 0.5
              }}
            >
              <Typography component="span" variant="caption" fontWeight={600} sx={{ lineHeight: 1 }}>
                {formatActionLabel(action)}
              </Typography>
              <Checkbox
                checked={allChecked}
                indeterminate={someChecked}
                disabled={headerCreatingAction === action || !canUpdate}
                onChange={(e) => {
                  e.stopPropagation();
                  if (canUpdate) handleHeaderCheck(action, e.target.checked);
                }}
                onClick={(e) => e.stopPropagation()}
                size="small"
                color="primary"
                sx={{ p: 0, m: 0 }}
                title={`Select ${formatActionLabel(action)} for all modules`}
              />
            </Box>
          ),
          renderCell: (params) => {
            const permId = params.row[action];
            const moduleKey = params.row.moduleKey;
            const permExists = permId != null;
            const key = `${moduleKey}_${action}`;
            const isCreating = pendingCreate.has(key);
            const isChecked = permExists ? selectedPermissionIds.has(permId) : isCreating;
            const canUpdate = hasPermission(RESOURCE.ROLES, ACTION.UPDATE);
            const canCreatePerm = hasPermission(RESOURCE.PERMISSIONS, ACTION.CREATE);

            return (
              <Box
                sx={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {permExists ? (
                  <Checkbox
                    checked={isChecked}
                    disabled={!canUpdate}
                    onChange={(e) => {
                      e.stopPropagation();
                      if (canUpdate) handleCheckboxChange(permId, e.target.checked);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    size="small"
                    color="primary"
                    sx={{ p: 0, m: 0 }}
                  />
                ) : (
                  <Checkbox
                    checked={isCreating}
                    disabled={isCreating || !canUpdate || !canCreatePerm}
                    onChange={(e) => {
                      e.stopPropagation();
                      if (canUpdate && canCreatePerm) handleCheckboxChangeForNew(moduleKey, action);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    size="small"
                    color="primary"
                    title={!canCreatePerm ? 'No permission to create' : !canUpdate ? 'No permission to assign' : 'Permission does not exist. Check to create and assign to this role.'}
                    sx={{ p: 0, m: 0 }}
                  />
                )}
              </Box>
            );
          }
        };
      })
    ],
    [rows, selectedPermissionIds, pendingCreate, headerCreatingAction, hasPermission]
  );

  return (
    <div className="px-4 sm:px-0 flex flex-col gap-4 min-h-0 flex-1">
      <PageHeader
        title="Role Permissions"
        subtitle="Assign permissions to roles by module"
        icon={<SecurityIcon fontSize="small" color="primary" />}
      />
      <PageContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
            <Box sx={{ minWidth: 200, maxWidth: 320 }}>
              <FormControl fullWidth size="small">
                <InputLabel id="role-select-label">Select Role</InputLabel>
                <Select
                  labelId="role-select-label"
                  label="Select Role"
                  value={selectedRoleId}
                  onChange={handleRoleChange}
                  sx={{ bgcolor: 'background.paper' }}
                >
                  <MenuItem value="">
                    <em>Select a role...</em>
                  </MenuItem>
                  {roles.map((r) => (
                    <MenuItem key={r.id} value={r.id}>
                      {r.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            {selectedRoleId && hasChanges && hasPermission(RESOURCE.ROLES, ACTION.UPDATE) && (
              <Button
                onClick={handleSave}
                disabled={updateRoleMutation.isPending}
              >
                {updateRoleMutation.isPending ? 'Saving...' : 'Save Permissions'}
              </Button>
            )}
          </Box>

          {!selectedRoleId ? (
            <Box
              sx={{
                p: 4,
                textAlign: 'center',
                borderRadius: 2,
                border: `2px dashed ${theme.palette.divider}`,
                bgcolor: alpha(theme.palette.primary.main, 0.02)
              }}
            >
              <Typography color="text.secondary">
                Select a role above to view and manage its permissions
              </Typography>
            </Box>
          ) : isLoading || roleLoading ? (
            <Skeleton variant="rounded" height={400} />
          ) : (
            <>
              <AppDataTable
                rows={rows}
                columns={columns}
                getRowId={(row) => row.id}
                loading={false}
                height={500}
                enableGlobalSearch={true}
                globalSearchPlaceholder="Search modules..."
                sx={{
                  '& .MuiDataGrid-cell[data-field="menu"], & .MuiDataGrid-cell[data-field="create"], & .MuiDataGrid-cell[data-field="read"], & .MuiDataGrid-cell[data-field="update"], & .MuiDataGrid-cell[data-field="delete"]': {
                    justifyContent: 'center'
                  },
                  '& .MuiDataGrid-columnHeader.permissions-action-header': {
                    justifyContent: 'center',
                    '& .MuiDataGrid-columnHeaderTitleContainer': {
                      justifyContent: 'center',
                      width: '100%'
                    }
                  }
                }}
              />
            </>
          )}
        </Box>
      </PageContent>
    </div>
  );
}
