import { unescapeKey } from "./pathEncoding.js";

export function normalizeNestedFields(data, fields) {
  if (data === null || typeof data !== "object") {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => normalizeNestedFields(item, fields));
  }

  // Clone to avoid mutating original
  const result = { ...data };

  // For each field definition in fields
  if (Array.isArray(fields)) {
    for (const field of fields) {
      const escapedName = field.name; // e.g. "contributor___$dot$___family___$dot$___name"
      const unescapedName = unescapeKey(escapedName); // e.g. "contributor.family.name"

      // 1. If this is a dot-containing field, check if the data has it nested
      if (unescapedName.includes(".")) {
        const segments = unescapedName.split(".");
        const nestedValue = getValueAtPath(result, segments);
        if (nestedValue !== undefined) {
          result[unescapedName] = nestedValue;
          deleteValueAtPath(result, segments);
        }
      }

      // 2. If this field is multiple, make sure its value is an array
      if (field.multiple) {
        const val = result[unescapedName];
        if (val !== undefined && val !== null && !Array.isArray(val)) {
          result[unescapedName] = [val];
        }
      }

      // 3. Recursively normalize children if present
      const currentVal = result[unescapedName];
      if (currentVal !== undefined && field.children && field.children.length > 0) {
        result[unescapedName] = normalizeNestedFields(currentVal, field.children);
      }
    }
  }

  return result;
}

function resolveActualSegments(target, segments) {
  if (segments.length === 0) {
    return { value: target, path: [] };
  }

  const first = segments[0];
  const rest = segments.slice(1);

  if (target !== null && typeof target === "object") {
    // Try original segment first
    if (first in target) {
      const res = resolveActualSegments(target[first], rest);
      if (res !== null) {
        return { value: res.value, path: [first, ...res.path] };
      }
    }
    // Try fallback segment
    if (first === "contributor" && "contribitor" in target) {
      const res = resolveActualSegments(target["contribitor"], rest);
      if (res !== null) {
        return { value: res.value, path: ["contribitor", ...res.path] };
      }
    }
  }
  return null;
}

function getValueAtPath(target, segments) {
  const resolved = resolveActualSegments(target, segments);
  return resolved ? resolved.value : undefined;
}

function deleteValueAtPath(target, segments) {
  const resolved = resolveActualSegments(target, segments);
  if (!resolved) return;

  const actualPath = resolved.path;

  function deleteActual(curr, path) {
    if (path.length === 0) return;
    if (path.length === 1) {
      delete curr[path[0]];
      return;
    }
    const nextKey = path[0];
    deleteActual(curr[nextKey], path.slice(1));
    if (curr[nextKey] !== null && typeof curr[nextKey] === "object" && Object.keys(curr[nextKey]).length === 0) {
      delete curr[nextKey];
    }
  }

  deleteActual(target, actualPath);
}

