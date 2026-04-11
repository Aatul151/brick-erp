import { db } from '../../../models/db.js';
import { formDefinitions } from '../models/formStudioSchema.js';
import { eq, and } from 'drizzle-orm';
import { isSiteAdmin } from './tenantScope.js';

const selectShape = {
  id: formDefinitions.id,
  tenantId: formDefinitions.tenantId,
  name: formDefinitions.name,
  title: formDefinitions.title,
  collectionName: formDefinitions.collectionName,
  sections: formDefinitions.sections,
  settings: formDefinitions.settings,
  createdBy: formDefinitions.createdBy,
  createdAt: formDefinitions.createdAt,
  updatedAt: formDefinitions.updatedAt
};

async function selectById(id) {
  const [row] = await db
    .select(selectShape)
    .from(formDefinitions)
    .where(eq(formDefinitions.id, id))
    .limit(1);
  return row || null;
}

/**
 * Resolve form definition by system name for the current user.
 * Site Admin without tenantId: allowed only when exactly one form matches the name globally.
 */
export async function findFormDefinitionByName(req, formName) {
  const decoded = decodeURIComponent(formName || '').trim();
  if (!decoded) return null;

  if (isSiteAdmin(req)) {
    const tidRaw = req.query.tenantId ?? req.body?.tenantId;
    if (tidRaw != null && tidRaw !== '') {
      const tid = parseInt(tidRaw, 10);
      if (Number.isNaN(tid)) return null;
      const [row] = await db
        .select(selectShape)
        .from(formDefinitions)
        .where(and(eq(formDefinitions.name, decoded), eq(formDefinitions.tenantId, tid)))
        .limit(1);
      return row || null;
    }

    const matches = await db
      .select({ id: formDefinitions.id })
      .from(formDefinitions)
      .where(eq(formDefinitions.name, decoded));

    if (matches.length === 0) return null;
    if (matches.length > 1) return null;
    return selectById(matches[0].id);
  }

  if (!req.user.tenantId) return null;

  const [row] = await db
    .select(selectShape)
    .from(formDefinitions)
    .where(and(eq(formDefinitions.name, decoded), eq(formDefinitions.tenantId, req.user.tenantId)))
    .limit(1);

  return row || null;
}
