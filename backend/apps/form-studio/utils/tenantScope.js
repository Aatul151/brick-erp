export function isSiteAdmin(req) {
  return req.user?.roles?.some((r) => r.roleName === 'Site Admin');
}

export function resolveWriteTenantId(req) {
  if (!req.user.tenantId) {
    const err = new Error('User must belong to a tenant to manage forms');
    err.statusCode = 403;
    throw err;
  }
  return req.user.tenantId;
}
