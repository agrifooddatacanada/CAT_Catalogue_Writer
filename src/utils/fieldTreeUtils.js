/**
 * Shared tree utilities for schema field definitions and page-to-child linking.
 */

export function buildFieldsByPathMap(fieldsArray, map = {}) {
  if (!Array.isArray(fieldsArray)) return map;
  for (const field of fieldsArray) {
    if (!field) continue;
    if (field.path) {
      map[field.path] = field;
    }
    if (Array.isArray(field.children) && field.children.length > 0) {
      buildFieldsByPathMap(field.children, map);
    }
  }
  return map;
}

export function getFieldByPath(fieldsArray, targetPath) {
  if (!Array.isArray(fieldsArray) || !targetPath) return null;
  for (const field of fieldsArray) {
    if (field?.path === targetPath) return field;
    if (field?.children?.length) {
      const found = getFieldByPath(field.children, targetPath);
      if (found) return found;
    }
  }
  return null;
}

export function findFieldByRelativePath(parentField, relativePath) {
  if (!parentField?.children?.length || !relativePath) return null;

  for (const child of parentField.children) {
    if (child.name === relativePath) return child;

    if (relativePath.startsWith(`${child.name}.`)) {
      const nestedPath = relativePath.slice(child.name.length + 1);
      const found = findFieldByRelativePath(child, nestedPath);
      if (found) return found;
    }
  }

  return null;
}

export function findLinkedChildPageIndex(field, pages) {
  if (!field || !Array.isArray(field.children) || field.children.length === 0) {
    return -1;
  }
  if (!Array.isArray(pages) || pages.length === 0) {
    return -1;
  }

  const childFieldNames = field.children.map((child) => child.name).sort();

  return pages.findIndex((page) => {
    const pageFieldNames = (page.items || [])
      .flatMap((item) => {
        if (item.type === "section") {
          return (item.fields || []).map((f) => f.name);
        }
        if (item.type === "field" && item.field) {
          return [item.field.name];
        }
        return [];
      })
      .sort();

    return (
      pageFieldNames.length === childFieldNames.length &&
      pageFieldNames.every((name, idx) => name === childFieldNames[idx])
    );
  });
}
