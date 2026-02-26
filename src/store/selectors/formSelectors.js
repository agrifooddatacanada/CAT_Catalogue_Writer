import { createSelector } from "@reduxjs/toolkit";

export const selectSchemaName = (state) => state.fieldSchema.schemaName;
export const selectFields = (state) => state.fieldSchema.fields;
export const selectFormatPatterns = (state) => state.fieldSchema.formatPatterns;
export const selectDepFormatPatterns = (state) =>
  state.fieldSchema.depFormatPatterns;

// Direct selectors (use these in components with useSelector)
export const selectFormState = (state) => {
  return state.formValues.formState;
};

// Plain selector - matches selectFormState exactly, no createSelector needed
export const selectAllFormValues = selectFormState;

// Already has data
export const selectHasFormData = createSelector(
  [selectAllFormValues],
  (formValues) => Object.keys(formValues).length > 0,
);

export const selectFieldValue = (path) =>
  createSelector([selectFormState], (formState) => formState[path]);

// Convenience selectors for common patterns in your dynamic forms
export const selectFormValueByPrefix = (prefix) =>
  createSelector([selectAllFormValues], (values) => {
    const filtered = {};
    Object.entries(values).forEach(([key, value]) => {
      if (key.startsWith(prefix)) {
        filtered[key] = value;
      }
    });
    return filtered;
  });

export const selectFilledFieldsCount = createSelector(
  [selectAllFormValues],
  (values) =>
    Object.keys(values).filter(
      (key) => values[key] != null && values[key] !== "",
    ).length,
);

export const selectFieldByPath = (path) =>
  createSelector([selectFields], (fields) => {
    if (!Array.isArray(fields)) return null;

    function findField(fieldsArray, targetPath) {
      for (const field of fieldsArray) {
        if (field?.path === targetPath) {
          return field;
        }

        // Recurse into children
        if (field?.children?.length) {
          const found = findField(field.children, targetPath);
          if (found) return found;
        }
      }
      return null;
    }

    return findField(fields, path);
  });

export const selectInstanceCountsState = (state) => state.instanceCounts;
export const selectAllInstanceCounts = (state) =>
  state.instanceCounts.instanceCounts;

export const selectInstanceCount = (path) =>
  createSelector([selectAllInstanceCounts], (counts) => {
    return counts[path] || 0;
  });

export const selectHasInstances = (path) =>
  createSelector([selectInstanceCount(path)], (count) => count > 0);

export const selectInstanceCountByPrefix = (prefix) =>
  createSelector([selectAllInstanceCounts], (counts) => {
    const filtered = {};
    Object.entries(counts).forEach(([key, count]) => {
      if (key.startsWith(prefix)) {
        filtered[key] = count;
      }
    });
    return filtered;
  });

// NEW: Schema-driven regex pattern lookup (base + dependent)
export const selectFormatPatternByFieldPath = (path) =>
  createSelector(
    [selectFormatPatterns, selectDepFormatPatterns],
    (formatPatterns, depFormatPatterns) => {
      // 1. Check base patterns first
      if (formatPatterns && formatPatterns[path]) {
        return formatPatterns[path];
      }

      // 2. Check dependent patterns (hierarchical children)
      if (depFormatPatterns) {
        for (const [parentPath, patterns] of Object.entries(
          depFormatPatterns,
        )) {
          if (path.startsWith(parentPath) && patterns[path]) {
            return patterns[path];
          }
        }
      }

      return null; // No pattern defined
    },
  );
