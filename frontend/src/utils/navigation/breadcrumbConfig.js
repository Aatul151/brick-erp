/**
 * Route to breadcrumb label mapping.
 * Keys are paths (exact match). Last segment is current page (non-clickable).
 */
export const ROUTE_LABELS = {
  '/dashboard': 'Dashboard',
  '/tenants': 'Tenants',
  '/users': 'Users',
  '/roles': 'Roles',
  '/permissions': 'Permissions',
  '/modules': 'Modules',
  '/audit-logs': 'Audit Logs',
  '/settings': 'Settings',
  '/profile': 'Profile',
  '/form-studio': 'Form Studio',
};

export function getBreadcrumbFromRoute(path) {
  const label = ROUTE_LABELS[path];
  if (label) {
    return path === '/dashboard' ? [{ label: 'Dashboard', path: '/dashboard', isLast: true }] : [
      { label: 'Dashboard', path: '/dashboard', isLast: false },
      { label, path, isLast: true }
    ];
  }
  if (path.startsWith('/form-studio/entries/')) {
    const name = path.split('/')[3] ? decodeURIComponent(path.split('/')[3]) : '';
    return [
      { label: 'Dashboard', path: '/dashboard', isLast: false },
      { label: 'Form Studio', path: '/form-studio', isLast: false },
      { label: name ? `Entries: ${name}` : 'Entries', path, isLast: true }
    ];
  }
  if (path.startsWith('/form-studio/build')) {
    return [
      { label: 'Dashboard', path: '/dashboard', isLast: false },
      { label: 'Form Studio', path: '/form-studio', isLast: false },
      { label: 'Form Builder', path, isLast: true }
    ];
  }
  return [{ label: 'Dashboard', path: '/dashboard', isLast: true }];
}
