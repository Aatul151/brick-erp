/**
 * Map DB row to API shape for the UI. Form Studio only supports custom forms (no DB column).
 */
export function mapFormDefinition(row) {
  if (!row) return null;

  return {
    id: row.id,
    _id: String(row.id),
    tenantId: row.tenantId,
    title: row.title,
    name: row.name,
    formType: 'custom',
    collectionName: row.collectionName,
    sections: row.sections ?? [],
    settings: row.settings ?? {},
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

export function mapFormEntry(row, submittedUser = null) {
  if (!row) return null;
  const submittedBy =
    submittedUser && row.submittedBy
      ? {
          _id: String(submittedUser.id),
          id: submittedUser.id,
          name: submittedUser.fullName,
          email: submittedUser.email
        }
      : row.submittedBy
        ? {
            _id: String(row.submittedBy),
            name: '',
            email: ''
          }
        : undefined;

  return {
    id: row.id,
    _id: String(row.id),
    payload: row.payload ?? {},
    submittedBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}
