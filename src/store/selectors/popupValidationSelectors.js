import { createSelector } from "@reduxjs/toolkit";
import {
  selectFormState,
  selectFields,
  selectFormatPatterns,
  selectDepFormatPatterns,
} from "./formSelectors";
import { removeIndices } from "../../utils/removeIndices";
import { getValidationError } from "../../utils/validationUtils";

function findField(fieldsArray, targetPath) {
  if (!Array.isArray(fieldsArray)) return null;
  for (const field of fieldsArray) {
    if (field?.path === targetPath) return field;
    if (field?.children?.length) {
      const found = findField(field.children, targetPath);
      if (found) return found;
    }
  }
  return null;
}

function hasAnyValueUnderPrefix(formState, prefix) {
  if (!formState) return false;
  return Object.keys(formState).some(
    (key) =>
      key === prefix ||
      key.startsWith(prefix + ".") ||
      key.startsWith(prefix + "["),
  );
}

function validateFieldTree(
  fieldNode,
  valuePrefix,
  formState,
  formatPatterns,
  depFormatPatterns,
) {
  if (!fieldNode) return true; // safety

  const { required, multiple, children } = fieldNode;
  const isLeaf = !children || children.length === 0;

  if (isLeaf) {
    const value = formState?.[valuePrefix] ?? "";
    if (!required && (value === "" || value == null)) return true;

    const error = getValidationError({
      field: fieldNode,
      fieldPath: valuePrefix,
      value,
      readOnly: false,
      formatPatterns: formatPatterns || {},
      depFormatPatterns: depFormatPatterns || {},
    });
    return !error;
  }

  if (multiple) {
    const instancePrefix = `${valuePrefix}[`;
    const keys = Object.keys(formState || {}).filter((k) =>
      k.startsWith(instancePrefix),
    );
    const hasInstance = keys.length > 0;

    if (!required && !hasInstance) return true;
    if (required && !hasInstance) return false;

    const indices = new Set(
      keys.map((k) => k.slice(instancePrefix.length).split("]")[0]),
    );
    for (const index of indices) {
      const instPrefix = `${valuePrefix}[${index}]`;
      for (const child of children || []) {
        const ok = validateFieldTree(
          child,
          `${instPrefix}.${child.name}`,
          formState,
          formatPatterns,
          depFormatPatterns,
        );
        if (!ok) return false;
      }
    }
    return true;
  } else {
    // STRICTER: required groups must validate ALL children even if optional
    const hasAny = hasAnyValueUnderPrefix(formState, valuePrefix);
    if (!required && !hasAny) return true;
    if (required && !hasAny) return false;

    // ALWAYS validate children if data exists or required
    for (const child of children || []) {
      const ok = validateFieldTree(
        child,
        `${valuePrefix}.${child.name}`,
        formState,
        formatPatterns,
        depFormatPatterns,
      );
      if (!ok) return false;
    }
    return true;
  }
}

export const makeSelectIsPopupValid = (nextValuePath) =>
  createSelector(
    [
      selectFormState,
      selectFields,
      selectFormatPatterns,
      selectDepFormatPatterns,
    ],
    (formState, fields, formatPatterns, depFormatPatterns) => {
      if (!nextValuePath) return false;

      const basePath = removeIndices(nextValuePath);
      const baseField = findField(fields, basePath);
      if (!baseField || !Array.isArray(baseField.children)) return false;

      // Check if ALL children are optional
      const allChildrenOptional = baseField.children.every(
        (child) => !child.required,
      );

      if (allChildrenOptional) {
        // SPECIAL CASE: require at least one NON-EMPTY field
        const popupPrefix = nextValuePath + ".";
        const hasAnyData = Object.keys(formState || {}).some(
          (key) =>
            key.startsWith(popupPrefix) &&
            formState[key] !== null &&
            formState[key] !== undefined &&
            String(formState[key]).trim() !== "",
        );
        return hasAnyData;
      }

      // NORMAL CASE: validate each child normally
      for (const child of baseField.children) {
        const childPrefix = `${nextValuePath}.${child.name}`;
        const ok = validateFieldTree(
          child,
          childPrefix,
          formState,
          formatPatterns,
          depFormatPatterns,
        );
        if (!ok) return false;
      }

      return true;
    },
  );

// Root selector - safe against null/undefined
export const selectIsRootFormValid = createSelector(
  [
    selectFormState,
    selectFields,
    selectFormatPatterns,
    selectDepFormatPatterns,
  ],
  (formState, fields, formatPatterns, depFormatPatterns) => {
    // NULL GUARDS
    if (!Array.isArray(fields)) return false;

    // Only required top-level fields
    const requiredFields = fields.filter((f) => f?.required);
    if (requiredFields.length === 0) return true;

    for (const field of requiredFields) {
      if (field.multiple) {
        const instancePrefix = `${field.path}[`;
        const instances = Object.keys(formState || {}).filter((k) =>
          k.startsWith(instancePrefix),
        );
        if (instances.length === 0) return false;

        const indices = new Set(
          instances.map((i) => i.slice(instancePrefix.length).split("]")[0]),
        );
        for (const index of indices) {
          const instPrefix = `${field.path}[${index}]`;
          for (const child of field.children || []) {
            const ok = validateFieldTree(
              child,
              `${instPrefix}.${child.name}`,
              formState,
              formatPatterns,
              depFormatPatterns,
            );
            if (!ok) return false;
          }
        }
      } else {
        const ok = validateFieldTree(
          field,
          field.path,
          formState,
          formatPatterns,
          depFormatPatterns,
        );
        if (!ok) return false;
      }
    }
    return true;
  },
);
