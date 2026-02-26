export function enrichFieldsWithPaths(fields, parentPath = "") {
  return fields.map((field) => {
    const fullPath = parentPath ? `${parentPath}.${field.name}` : field.name;

    // Create new field object with path
    const enrichedField = {
      ...field,
      path: fullPath,
    };

    // Recurse into children
    if (field.children && Array.isArray(field.children)) {
      enrichedField.children = enrichFieldsWithPaths(field.children, fullPath);
    }

    return enrichedField;
  });
}
