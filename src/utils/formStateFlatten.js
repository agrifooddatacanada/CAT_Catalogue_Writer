import { escapeKey, unescapeKey } from "./pathEncoding";

/**
 * Flattens a nested record object into single-level dot/bracket notation keys
 * matching Redux formValueSlice.
 */
export function flattenFormData(obj, parentKey = "", result = {}) {
  if (Array.isArray(obj)) {
    if (obj.length === 0) {
      result[parentKey] = obj;
    } else {
      obj.forEach((item, index) => {
        const newKey = `${parentKey}[${index}]`;
        if (item !== null && typeof item === "object") {
          flattenFormData(item, newKey, result);
        } else {
          result[newKey] = item;
        }
      });
    }
    return result;
  }

  if (obj === null || typeof obj !== "object") {
    return result;
  }

  for (const key in obj) {
    if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;

    const value = obj[key];
    const escapedKey = escapeKey(key);
    const newKey = parentKey ? `${parentKey}.${escapedKey}` : escapedKey;

    if (value !== null && typeof value === "object") {
      flattenFormData(value, newKey, result);
    } else {
      result[newKey] = value;
    }
  }
  return result;
}

export function deepClone(value) {
  if (value === null || typeof value !== "object") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(deepClone);
  }
  const cloned = {};
  for (const key in value) {
    if (Object.prototype.hasOwnProperty.call(value, key)) {
      cloned[key] = deepClone(value[key]);
    }
  }
  return cloned;
}

function ensureIndex(arr, index) {
  while (arr.length <= index) {
    arr.push(null);
  }
}

export function parseFlatPath(path) {
  if (!path) return [];
  return path
    .split(/\.|\[/)
    .filter(Boolean)
    .map((segment) => {
      const cleaned = segment.replace(/]$/, "");
      return /^\d+$/.test(cleaned)
        ? parseInt(cleaned, 10)
        : unescapeKey(cleaned);
    });
}

/**
 * Reconstructs a nested JSON object/array tree from flat dot/bracket notation keys.
 */
export function unflattenFormData(flatObject) {
  const result = {};
  if (!flatObject || typeof flatObject !== "object") return result;

  for (const [key, value] of Object.entries(flatObject)) {
    const path = parseFlatPath(key);
    let current = result;
    for (let i = 0; i < path.length; i++) {
      const segment = path[i];
      const isLast = i === path.length - 1;
      const nextSegment = path[i + 1];
      if (isLast) {
        current[segment] = deepClone(value);
      } else {
        const isNextArrayIndex = typeof nextSegment === "number";
        if (typeof segment === "number") {
          if (!Array.isArray(current)) {
            current = [];
          }
          ensureIndex(current, segment);
          if (current[segment] == null) {
            current[segment] = isNextArrayIndex ? [] : {};
          }
          current = current[segment];
        } else {
          if (current[segment] == null) {
            current[segment] = isNextArrayIndex ? [] : {};
          }
          current = current[segment];
        }
      }
    }
  }
  return result;
}
