/** Client-side option filter for searchable selects. */
export function filterOptions(options, searchTerm) {
  if (!searchTerm?.trim()) return options;
  const q = searchTerm.toLowerCase().trim();
  return options.filter((opt) => {
    const label = typeof opt === 'string' ? opt : opt.label || '';
    const value = typeof opt === 'string' ? opt : opt.value || '';
    return String(label).toLowerCase().includes(q) || String(value).toLowerCase().includes(q);
  });
}
