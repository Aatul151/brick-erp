export function isSiteAdmin(req) {
  return req.user?.roles?.some((r) => r.roleName === 'Site Admin');
}

/** null = no tenant filter (Site Admin listing all). */
export function tenantFilter(req) {
  if (isSiteAdmin(req)) return null;
  return req.user.tenantId;
}

/**
 * Tenant id for looking up a form by name (unique per tenant).
 * Site Admin must pass ?tenantId= when multiple tenants exist.
 */
export function resolveLookupTenantId(req) {
  if (isSiteAdmin(req)) {
    const q = req.query.tenantId;
    return q != null && q !== '' ? parseInt(q, 10) : null;
  }
  return req.user.tenantId;
}

export function resolveWriteTenantId(req) {
  if (isSiteAdmin(req)) {
    const tid = req.body.tenantId != null ? parseInt(req.body.tenantId, 10) : null;
    if (!tid || Number.isNaN(tid)) {
      const err = new Error('tenantId is required');
      err.statusCode = 400;
      throw err;
    }
    return tid;
  }
  if (!req.user.tenantId) {
    const err = new Error('User must belong to a tenant to manage forms');
    err.statusCode = 403;
    throw err;
  }
  return req.user.tenantId;
}
