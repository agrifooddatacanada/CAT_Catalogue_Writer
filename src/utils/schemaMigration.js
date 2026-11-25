import { escapeKey, unescapeKey } from "./pathEncoding";
import { normalizeNestedFields } from "./normalizeJson";
import { buildInstanceCountsFromValues } from "./instanceCounts";

const ENVELOPE_KEYS = new Set([
  "@context",
  "@type",
  "@schema_id",
  "@schema_version",
  "d",
  "catalogue_id",
]);

const SYSTEM_DCTERMS_KEYS = new Set([
  "modified",
  "isVersionOf",
  "adms:versionNotes",
]);

/**
 * Flattens a nested record object into dot/bracket notation keys matching Redux formValueSlice.
 */
export function flattenRecord(obj, parentKey = "", result = {}) {
  if (Array.isArray(obj)) {
    if (obj.length === 0) {
      result[parentKey] = obj;
    } else {
      obj.forEach((item, index) => {
        const newKey = `${parentKey}[${index}]`;
        if (item !== null && typeof item === "object") {
          flattenRecord(item, newKey, result);
        } else {
          result[newKey] = item;
        }
      });
    }
    return result;
  }

  for (const key in obj) {
    if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
    const value = obj[key];
    const escapedKey = escapeKey(key);
    const newKey = parentKey ? `${parentKey}.${escapedKey}` : escapedKey;

    if (value !== null && typeof value === "object") {
      flattenRecord(value, newKey, result);
    } else {
      result[newKey] = value;
    }
  }
  return result;
}

function isNonEmptyValue(val) {
  if (val === undefined || val === null) return false;
  if (typeof val === "string") return val.trim().length > 0;
  if (Array.isArray(val)) return val.some(isNonEmptyValue);
  if (typeof val === "object") return Object.values(val).some(isNonEmptyValue);
  return true;
}

function collectUnmappedLeaves(value, keyPath, out) {
  if (!isNonEmptyValue(value)) return;
  if (Array.isArray(value)) {
    value.forEach((item, idx) => {
      collectUnmappedLeaves(item, `${keyPath}[${idx}]`, out);
    });
    return;
  }
  if (value !== null && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      collectUnmappedLeaves(v, keyPath ? `${keyPath}.${k}` : k, out);
    }
    return;
  }
  out.push({ key: keyPath, value: String(value) });
}

function filterRecordToTargetFields(data, fields, prefix, unmappedOut) {
  if (data === null || data === undefined || typeof data !== "object") {
    return data;
  }

  const fieldMap = new Map();
  if (Array.isArray(fields)) {
    for (const field of fields) {
      if (!field || !field.name) continue;
      const unescaped = unescapeKey(field.name);
      fieldMap.set(unescaped, field);
      fieldMap.set(field.name, field);
    }
  }

  const mapped = {};

  for (const [rawKey, rawVal] of Object.entries(data)) {
    if (!prefix && ENVELOPE_KEYS.has(rawKey)) {
      continue;
    }

    const field = fieldMap.get(rawKey);
    const displayPath = prefix ? `${prefix}.${rawKey}` : rawKey;

    if (!field) {
      // Ignore system-managed dcterms metadata when dcterms itself is not a form field
      if (!prefix && rawKey === "dcterms" && rawVal && typeof rawVal === "object" && !Array.isArray(rawVal)) {
        for (const [subKey, subVal] of Object.entries(rawVal)) {
          if (SYSTEM_DCTERMS_KEYS.has(subKey)) continue;
          // Check if the target schema uses flattened dot-key `dcterms.<subKey>` (already handled by normalizeNestedFields)
          if (fieldMap.has(`dcterms.${subKey}`)) {
            mapped[`dcterms.${subKey}`] = subVal;
            continue;
          }
          collectUnmappedLeaves(subVal, `dcterms.${subKey}`, unmappedOut);
        }
        continue;
      }

      collectUnmappedLeaves(rawVal, displayPath, unmappedOut);
      continue;
    }

    const canonicalKey = unescapeKey(field.name);

    if (field.children && field.children.length > 0) {
      if (Array.isArray(rawVal)) {
        const mappedArr = rawVal
          .map((item, idx) => {
            if (item !== null && typeof item === "object" && !Array.isArray(item)) {
              return filterRecordToTargetFields(
                item,
                field.children,
                `${displayPath}[${idx}]`,
                unmappedOut
              );
            }
            collectUnmappedLeaves(item, `${displayPath}[${idx}]`, unmappedOut);
            return null;
          })
          .filter((item) => item !== null && Object.keys(item).length > 0);
        if (mappedArr.length > 0) {
          mapped[canonicalKey] = mappedArr;
        }
      } else if (rawVal !== null && typeof rawVal === "object") {
        const childMapped = filterRecordToTargetFields(
          rawVal,
          field.children,
          displayPath,
          unmappedOut
        );
        if (childMapped && Object.keys(childMapped).length > 0) {
          mapped[canonicalKey] = childMapped;
        }
      } else {
        collectUnmappedLeaves(rawVal, displayPath, unmappedOut);
      }
    } else {
      // Leaf field (single or multiple primitives)
      if (field.multiple) {
        const arr = Array.isArray(rawVal) ? rawVal : rawVal !== undefined && rawVal !== null ? [rawVal] : [];
        const primitives = [];
        arr.forEach((item, idx) => {
          if (item !== null && typeof item === "object") {
            collectUnmappedLeaves(item, `${displayPath}[${idx}]`, unmappedOut);
          } else if (item !== undefined && item !== null) {
            primitives.push(item);
          }
        });
        if (primitives.length > 0) {
          mapped[canonicalKey] = primitives;
        }
      } else if (rawVal !== null && typeof rawVal === "object") {
        // Structure changed from object/array to scalar — cannot map directly
        collectUnmappedLeaves(rawVal, displayPath, unmappedOut);
      } else if (rawVal !== undefined && rawVal !== null) {
        mapped[canonicalKey] = rawVal;
      }
    }
  }

  return mapped;
}

function hasMappedValueForField(fieldPath, formValues) {
  if (!fieldPath) return false;
  if (isNonEmptyValue(formValues[fieldPath])) return true;
  const dotPrefix = `${fieldPath}.`;
  const bracketPrefix = `${fieldPath}[`;
  return Object.entries(formValues).some(
    ([k, v]) => (k.startsWith(dotPrefix) || k.startsWith(bracketPrefix)) && isNonEmptyValue(v)
  );
}

function findMissingRequiredFields(fields, formValues, out = []) {
  if (!Array.isArray(fields)) return out;
  for (const field of fields) {
    if (!field) continue;
    const isRequired =
      field.required === true ||
      field.mandatory === true ||
      field.conformance === "M";

    if (isRequired && !hasMappedValueForField(field.path || field.name, formValues)) {
      const label =
        (typeof field.label === "string" && field.label.trim()) ||
        (field.label && typeof field.label === "object"
          ? field.label.eng || field.label.en || Object.values(field.label)[0]
          : null) ||
        unescapeKey(field.name || field.path || "");
      out.push({
        path: field.path || field.name,
        label: String(label),
      });
    }
  }
  return out;
}

/**
 * Migrates an older catalogue record JSON into a newer target schema's field definitions.
 * - Pre-fills all matching fields cleanly (normalized + flattened).
 * - Strips obsolete/renamed keys so they do not pollute the upgraded output JSON.
 * - Reports `unmappedFields` (old values for reference) and `missingRequiredFields`
 *   (required fields in the new schema that the user must fill manually).
 */
export function migrateRecordToSchema(oldRecord, targetFields) {
  if (!oldRecord || typeof oldRecord !== "object") {
    return {
      formValues: {},
      instanceCounts: {},
      unmappedFields: [],
      missingRequiredFields: findMissingRequiredFields(targetFields, {}),
      mappedCount: 0,
    };
  }

  const normalized = normalizeNestedFields(oldRecord, targetFields);
  const unmappedFields = [];
  const filtered = filterRecordToTargetFields(normalized, targetFields, "", unmappedFields);
  const formValues = flattenRecord(filtered);
  const instanceCounts = buildInstanceCountsFromValues(formValues);
  const missingRequiredFields = findMissingRequiredFields(targetFields, formValues);

  const mappedCount = Object.values(formValues).filter(isNonEmptyValue).length;

  return {
    formValues,
    instanceCounts,
    unmappedFields,
    missingRequiredFields,
    mappedCount,
  };
}
