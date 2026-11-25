import { createSelector } from "@reduxjs/toolkit";
import {
  selectFormState,
  selectFields,
  selectFieldsByPath,
  selectPages,
  selectFormatPatterns,
  selectDepFormatPatterns,
} from "./formSelectors";
import { removeIndices } from "../../utils/removeIndices";
import { getValidationError } from "../../utils/validationUtils";
import { getFieldByPath } from "../../utils/fieldTreeUtils";

function hasAnyValueUnderPrefix(formState, prefix) {
  if (!formState) return false;
  return Object.keys(formState).some(
    (key) =>
      key === prefix ||
      key.startsWith(prefix + ".") ||
      key.startsWith(prefix + "["),
  );
}

function isNonEmptyLeafValue(val) {
  if (val === null || val === undefined) return false;
  if (typeof val === "boolean") return true;
  if (typeof val === "string") return val.trim() !== "";
  if (Array.isArray(val)) {
    return (
      val.length > 0 &&
      val.some((v) => v !== null && v !== undefined && String(v).trim() !== "")
    );
  }
  if (typeof val === "object") return Object.keys(val).length > 0;
  return true;
}

function validateFieldTree(
  fieldNode,
  valuePrefix,
  formState,
  formatPatterns,
  depFormatPatterns,
) {
  if (!fieldNode) return true;

  const { required, multiple, children } = fieldNode;
  const isLeaf = !children || children.length === 0;

  if (isLeaf) {
    if (multiple) {
      const instancePrefix = `${valuePrefix}[`;
      const keys = Object.keys(formState || {}).filter((k) =>
        k.startsWith(instancePrefix),
      );
      const nonEmptyKeys = keys.filter((k) => isNonEmptyLeafValue(formState[k]));
      if (!required && nonEmptyKeys.length === 0) return true;
      if (required && nonEmptyKeys.length === 0) return false;

      for (const k of nonEmptyKeys) {
        const error = getValidationError({
          field: fieldNode,
          fieldPath: k,
          valuePath: k,
          value: formState[k],
          readOnly: false,
          formatPatterns: formatPatterns || {},
          depFormatPatterns: depFormatPatterns || {},
          allFormValues: formState,
        });
        if (error) return false;
      }
      return true;
    }

    const value = formState?.[valuePrefix] ?? "";
    if (!required && !isNonEmptyLeafValue(value)) return true;

    const error = getValidationError({
      field: fieldNode,
      fieldPath: valuePrefix,
      valuePath: valuePrefix,
      value,
      readOnly: false,
      formatPatterns: formatPatterns || {},
      depFormatPatterns: depFormatPatterns || {},
      allFormValues: formState,
    });
    return !error;
  }

  const isMultiple = multiple || (children && children.length > 0);
  if (isMultiple) {
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
    const hasAny = hasAnyValueUnderPrefix(formState, valuePrefix);
    if (!required && !hasAny) return true;
    if (required && !hasAny) return false;

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
      selectFieldsByPath,
      selectFormatPatterns,
      selectDepFormatPatterns,
    ],
    (formState, fields, fieldsByPath, formatPatterns, depFormatPatterns) => {
      if (!nextValuePath) return false;

      const basePath = removeIndices(nextValuePath);
      const baseField =
        (fieldsByPath && fieldsByPath[basePath]) || getFieldByPath(fields, basePath);
      if (!baseField || !Array.isArray(baseField.children)) return false;

      const allChildrenOptional = baseField.children.every(
        (child) => !child.required,
      );

      if (allChildrenOptional) {
        const popupPrefix = nextValuePath + ".";
        const hasAnyData = Object.keys(formState || {}).some(
          (key) =>
            key.startsWith(popupPrefix) && isNonEmptyLeafValue(formState[key]),
        );
        if (!hasAnyData) return false;
      }

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

function hasAnyNonEmptyValue(formState) {
  if (!formState || typeof formState !== "object") return false;
  return Object.values(formState).some(isNonEmptyLeafValue);
}

function getFieldStatus(field, formState, formatPatterns, depFormatPatterns) {
  const isMultiple =
    field.multiple || (field.children && field.children.length > 0);
  let valid = true;
  let hasData = false;

  if (isMultiple) {
    const instancePrefix = `${field.path}[`;
    const instances = Object.keys(formState || {}).filter((k) =>
      k.startsWith(instancePrefix),
    );
    hasData = instances.some((k) => isNonEmptyLeafValue(formState[k]));

    if (field.required && !hasData) {
      valid = false;
    } else if (field.children && field.children.length > 0) {
      const indices = new Set(
        instances.map((i) => i.slice(instancePrefix.length).split("]")[0]),
      );
      for (const index of indices) {
        const instPrefix = `${field.path}[${index}]`;
        for (const child of field.children) {
          if (
            !validateFieldTree(
              child,
              `${instPrefix}.${child.name}`,
              formState,
              formatPatterns,
              depFormatPatterns,
            )
          ) {
            valid = false;
            break;
          }
        }
        if (!valid) break;
      }
    } else {
      valid = validateFieldTree(
        field,
        field.path,
        formState,
        formatPatterns,
        depFormatPatterns,
      );
    }
  } else {
    hasData = isNonEmptyLeafValue(formState?.[field.path]);
    valid = validateFieldTree(
      field,
      field.path,
      formState,
      formatPatterns,
      depFormatPatterns,
    );
  }

  const reason = valid
    ? null
    : field.required && !hasData
      ? "missing"
      : "invalid";

  return { valid, hasData, reason };
}

// Root selector - safe against null/undefined
export const selectIsRootFormValid = createSelector(
  [
    selectFormState,
    selectFields,
    selectFormatPatterns,
    selectDepFormatPatterns,
  ],
  (formState, fields, formatPatterns, depFormatPatterns) => {
    if (!Array.isArray(fields) || fields.length === 0) return false;
    if (!hasAnyNonEmptyValue(formState)) return false;

    for (const field of fields) {
      const { valid } = getFieldStatus(
        field,
        formState,
        formatPatterns,
        depFormatPatterns,
      );
      if (!valid) return false;
    }
    return true;
  },
);

/**
 * Computes a structured validation summary across all root pages/fields so
 * FormSidebar can display per-section progress indicators and DynamicForm
 * can show users exactly which fields block submission.
 */
export const selectValidationSummary = createSelector(
  [
    selectFormState,
    selectFields,
    selectPages,
    selectFormatPatterns,
    selectDepFormatPatterns,
  ],
  (formState, fields, pages, formatPatterns, depFormatPatterns) => {
    const issues = [];
    const pageStats = {};

    if (!Array.isArray(fields) || fields.length === 0) {
      return {
        isEmptyForm: true,
        isValid: false,
        issues,
        pageStats,
      };
    }

    const isEmptyForm = !hasAnyNonEmptyValue(formState);
    const hasSchemaPages = Array.isArray(pages) && pages.length > 0;

    // Map each top-level field path -> base page index & label
    const fieldToPageMap = {};
    if (hasSchemaPages) {
      pages.forEach((page, pageIndex) => {
        if (page?.isChildPage) return;
        pageStats[pageIndex] = {
          totalFields: 0,
          filledFields: 0,
          requiredTotal: 0,
          requiredFilled: 0,
          issueCount: 0,
          label: page.sidebarLabel || page.label || "",
        };

        const registerField = (f) => {
          if (!f?.path) return;
          fieldToPageMap[f.path] = {
            pageIndex,
            pageLabel: page.sidebarLabel || page.label || "",
          };
        };

        (page.items || []).forEach((item) => {
          if (item.type === "field" && item.field) {
            registerField(item.field);
          } else if (item.type === "section" && Array.isArray(item.fields)) {
            item.fields.forEach(registerField);
          }
        });
      });
    }

    for (const field of fields) {
      if (!field?.path) continue;
      const { valid, hasData, reason } = getFieldStatus(
        field,
        formState,
        formatPatterns,
        depFormatPatterns,
      );
      const pageInfo = fieldToPageMap[field.path];

      if (pageInfo && pageStats[pageInfo.pageIndex]) {
        const stats = pageStats[pageInfo.pageIndex];
        stats.totalFields += 1;
        if (hasData) stats.filledFields += 1;
        if (field.required) {
          stats.requiredTotal += 1;
          if (hasData && valid) stats.requiredFilled += 1;
        }
        if (!valid) {
          stats.issueCount += 1;
        }
      }

      if (!valid) {
        issues.push({
          fieldPath: field.path,
          fieldLabel: field.label || field.name,
          reason,
          pageIndex: pageInfo ? pageInfo.pageIndex : null,
          pageLabel: pageInfo ? pageInfo.pageLabel : null,
        });
      }
    }

    return {
      isEmptyForm,
      isValid: !isEmptyForm && issues.length === 0,
      issues,
      pageStats,
    };
  },
);
