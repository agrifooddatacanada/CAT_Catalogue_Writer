import { createSelector } from "@reduxjs/toolkit";
import { getFieldByPath } from "../../utils/fieldTreeUtils";

export const selectSchemaName = (state) => state.fieldSchema.schemaName;
export const selectFields = (state) => state.fieldSchema.fields;
export const selectFieldsByPath = (state) => state.fieldSchema.fieldsByPath;
export const selectFormatPatterns = (state) => state.fieldSchema.formatPatterns;
export const selectDepFormatPatterns = (state) =>
  state.fieldSchema.depFormatPatterns;
export const selectPages = (state) => state.fieldSchema.pages;
export const selectLoadedSchemaMeta = (state) =>
  state.fieldSchema.loadedSchemaMeta;

// Direct selectors
export const selectFormState = (state) => state.formValues.formState;
export const selectInitialFormState = (state) =>
  state.formValues.initialFormState;
export const selectAllFormValues = selectFormState;

const IGNORED_CHANGE_KEYS = new Set([
  "d",
  "catalogue_id",
  "@context",
  "@type",
  "@schema_id",
  "@schema_version",
  "modified",
  "isVersionOf",
  "dcterms.modified",
  "dcterms.isVersionOf",
  "dcterms.adms:versionNotes",
  "dcterms___$dot$___modified",
  "dcterms___$dot$___isVersionOf",
  "dcterms___$dot$___adms:versionNotes",
]);

function normalizeFormSnapshot(values) {
  if (!values || typeof values !== "object") return "{}";
  const entries = [];
  for (const key of Object.keys(values).sort()) {
    if (IGNORED_CHANGE_KEYS.has(key)) continue;
    const val = values[key];
    if (val === undefined || val === null || val === "") continue;
    if (Array.isArray(val) && val.length === 0) continue;
    entries.push([key, val]);
  }
  return JSON.stringify(entries);
}

export const selectHasFormChanges = createSelector(
  [selectFormState, selectInitialFormState],
  (formState, initialFormState) =>
    normalizeFormSnapshot(formState) !== normalizeFormSnapshot(initialFormState),
);

export const selectHasFormData = createSelector(
  [selectAllFormValues],
  (formValues) => Object.keys(formValues).length > 0,
);

// Direct O(1) lookup selector (no Reselect factory overhead on every render)
export const selectFieldValue = (path) => (state) =>
  state.formValues.formState[path];

// Memoized factory for components needing prefix-filtered slices
export const makeSelectFormValueByPrefix = (prefix) =>
  createSelector([selectAllFormValues], (values) => {
    const filtered = {};
    if (!prefix || !values) return filtered;
    for (const key in values) {
      if (Object.prototype.hasOwnProperty.call(values, key) && key.startsWith(prefix)) {
        filtered[key] = values[key];
      }
    }
    return filtered;
  });

export const selectFormValueByPrefix = makeSelectFormValueByPrefix;

export const selectCheckboxValues = (path) =>
  createSelector(
    [makeSelectFormValueByPrefix(path), selectInstanceCount(path)],
    (fieldValues, instanceCount) => {
      const values = [];
      for (let i = 0; i < instanceCount; i++) {
        const key = `${path}[${i}]`;
        const val = fieldValues[key];
        if (val && val.trim()) values.push(val);
      }
      return values;
    },
  );

export const selectFilledFieldsCount = createSelector(
  [selectAllFormValues],
  (values) =>
    Object.keys(values).filter(
      (key) => values[key] != null && values[key] !== "",
    ).length,
);

// O(1) lookup using pre-indexed fieldsByPath map with recursive fallback
export const selectFieldByPath = (path) => (state) => {
  if (!path) return null;
  const byPath = state.fieldSchema.fieldsByPath;
  if (byPath && Object.prototype.hasOwnProperty.call(byPath, path)) {
    return byPath[path];
  }
  return getFieldByPath(state.fieldSchema.fields, path);
};

export const selectInstanceCountsState = (state) => state.instanceCounts;
export const selectAllInstanceCounts = (state) =>
  state.instanceCounts.instanceCounts;

// Direct O(1) lookup selector
export const selectInstanceCount = (path) => (state) =>
  state.instanceCounts.instanceCounts[path] || 0;

export const selectHasInstances = (path) => (state) =>
  (state.instanceCounts.instanceCounts[path] || 0) > 0;

export const makeSelectInstanceCountByPrefix = (prefix) =>
  createSelector([selectAllInstanceCounts], (counts) => {
    const filtered = {};
    if (!prefix || !counts) return filtered;
    for (const key in counts) {
      if (Object.prototype.hasOwnProperty.call(counts, key) && key.startsWith(prefix)) {
        filtered[key] = counts[key];
      }
    }
    return filtered;
  });

export const selectInstanceCountByPrefix = makeSelectInstanceCountByPrefix;

export const selectFormatPatternByFieldPath = (path) =>
  createSelector(
    [selectFormatPatterns, selectDepFormatPatterns],
    (formatPatterns, depFormatPatterns) => {
      if (formatPatterns && formatPatterns[path]) {
        return formatPatterns[path];
      }

      if (depFormatPatterns) {
        for (const [parentPath, patterns] of Object.entries(depFormatPatterns)) {
          if (path.startsWith(parentPath) && patterns && patterns[path]) {
            return patterns[path];
          }
        }
      }

      return null;
    },
  );
