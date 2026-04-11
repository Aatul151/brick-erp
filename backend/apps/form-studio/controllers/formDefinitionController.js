import { db } from '../../../models/db.js';
import { formDefinitions } from '../models/formStudioSchema.js';
import { eq, and, desc } from 'drizzle-orm';
import { mapFormDefinition } from '../utils/formMappers.js';
import { tenantFilter, resolveWriteTenantId, isSiteAdmin } from '../utils/tenantScope.js';
import { findFormDefinitionByName } from '../utils/formStudioQueries.js';

export const listFormDefinitions = async (req, res) => {
  try {
    const tf = tenantFilter(req);

    const conditions = [];
    if (tf != null) conditions.push(eq(formDefinitions.tenantId, tf));

    const whereClause = conditions.length ? and(...conditions) : undefined;

    const rows = await db
      .select({
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
      })
      .from(formDefinitions)
      .where(whereClause)
      .orderBy(desc(formDefinitions.updatedAt));

    const data = rows.map((r) => mapFormDefinition(r));
    res.json({ success: true, data });
  } catch (error) {
    console.error('listFormDefinitions', error);
    res.status(500).json({ error: 'Failed to list form definitions' });
  }
};

export const getFormDefinitionById = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    const tf = tenantFilter(req);

    const conditions = [eq(formDefinitions.id, id)];
    if (tf != null) conditions.push(eq(formDefinitions.tenantId, tf));

    const [row] = await db
      .select({
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
      })
      .from(formDefinitions)
      .where(and(...conditions))
      .limit(1);

    if (!row) return res.status(404).json({ error: 'Form not found' });

    res.json({ success: true, data: mapFormDefinition(row) });
  } catch (error) {
    console.error('getFormDefinitionById', error);
    res.status(500).json({ error: 'Failed to load form definition' });
  }
};

export const getFormDefinitionByName = async (req, res) => {
  try {
    const name = req.params.name;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    const row = await findFormDefinitionByName(req, name);
    if (!row) return res.status(404).json({ error: 'Form not found' });

    res.json({ success: true, data: mapFormDefinition(row) });
  } catch (error) {
    console.error('getFormDefinitionByName', error);
    res.status(500).json({ error: 'Failed to load form definition' });
  }
};

export const createFormDefinition = async (req, res) => {
  try {
    const tenantId = resolveWriteTenantId(req);
    const { title, name, collectionName, sections = [], settings = {} } = req.body;

    if (!title || !name) {
      return res.status(400).json({ error: 'title and name are required' });
    }

    const normalizedName = String(name).toLowerCase().trim();

    const [created] = await db
      .insert(formDefinitions)
      .values({
        tenantId,
        name: normalizedName,
        title,
        collectionName: collectionName || null,
        sections,
        settings,
        createdBy: req.user.id,
        updatedBy: req.user.id
      })
      .returning();

    const [row] = await db
      .select({
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
      })
      .from(formDefinitions)
      .where(eq(formDefinitions.id, created.id))
      .limit(1);

    res.status(201).json({ success: true, data: mapFormDefinition(row) });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'A form with this name already exists for this tenant' });
    }
    if (error.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('createFormDefinition', error);
    res.status(500).json({ error: 'Failed to create form definition' });
  }
};

export const updateFormDefinition = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    const tf = tenantFilter(req);
    const conditions = [eq(formDefinitions.id, id)];
    if (tf != null) conditions.push(eq(formDefinitions.tenantId, tf));

    const [existing] = await db
      .select()
      .from(formDefinitions)
      .where(and(...conditions))
      .limit(1);

    if (!existing) return res.status(404).json({ error: 'Form not found' });

    if (!isSiteAdmin(req)) {
      if (existing.tenantId !== req.user.tenantId) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }

    const { title, name, collectionName, sections, settings } = req.body;

    const patch = {
      updatedBy: req.user.id,
      updatedAt: new Date()
    };

    if (title !== undefined) patch.title = title;
    if (name !== undefined) patch.name = String(name).toLowerCase().trim();
    if (collectionName !== undefined) patch.collectionName = collectionName || null;
    if (sections !== undefined) patch.sections = sections;
    if (settings !== undefined) patch.settings = settings;
    if (isSiteAdmin(req) && req.body.tenantId !== undefined && req.body.tenantId !== null) {
      const nt = parseInt(req.body.tenantId, 10);
      if (!Number.isNaN(nt)) patch.tenantId = nt;
    }

    await db.update(formDefinitions).set(patch).where(eq(formDefinitions.id, id));

    const [row] = await db
      .select({
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
      })
      .from(formDefinitions)
      .where(eq(formDefinitions.id, id))
      .limit(1);

    res.json({ success: true, data: mapFormDefinition(row) });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'A form with this name already exists for this tenant' });
    }
    if (error.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('updateFormDefinition', error);
    res.status(500).json({ error: 'Failed to update form definition' });
  }
};

export const deleteFormDefinition = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    const tf = tenantFilter(req);
    const conditions = [eq(formDefinitions.id, id)];
    if (tf != null) conditions.push(eq(formDefinitions.tenantId, tf));

    const deleted = await db.delete(formDefinitions).where(and(...conditions)).returning({ id: formDefinitions.id });

    if (!deleted.length) return res.status(404).json({ error: 'Form not found' });

    res.json({ success: true, data: { id } });
  } catch (error) {
    console.error('deleteFormDefinition', error);
    res.status(500).json({ error: 'Failed to delete form definition' });
  }
};
