import React, { useEffect, useMemo, useRef } from "react";
import { useTranslation } from "../../../utils/OpenAIRE/TranslationContext";
import { Button, Box, Typography } from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import { useDispatch, useSelector } from "react-redux";
import FieldChecker from "./FieldChecker";
import { removeIndices } from "../../../utils/removeIndices";
import { incrementInstanceCount } from "../../../store/slices/instanceCountsSlice";
import {
  selectFieldByPath,
  selectFormState,
  selectPages,
  selectFormatPatterns,
  selectDepFormatPatterns,
} from "../../../store/selectors/formSelectors";
import theme from "../../../theme";
import {
  removeFieldValue,
  setFieldValue,
} from "../../../store/slices/formValueSlice";
import { makeSelectIsPopupValid } from "../../../store/selectors/popupValidationSelectors";
import { getValidationError } from "../../../utils/validationUtils";
import { selectMode } from "../../../store/slices/modeSlice";

const getFieldByPath = (fieldsArray, targetPath) => {
  if (!Array.isArray(fieldsArray)) return null;
  for (const f of fieldsArray) {
    if (f?.path === targetPath) {
      return f;
    }
    if (f?.children?.length) {
      const found = getFieldByPath(f.children, targetPath);
      if (found) return found;
    }
  }
  return null;
};

const filterMandatoryFields = (fields) => {
  if (!Array.isArray(fields)) return [];
  return fields
    .filter((field) => field.required)
    .map((field) => ({
      ...field,
      children: field.children ? filterMandatoryFields(field.children) : [],
    }));
};

const filterRecommendedFields = (fields) => {
  if (!Array.isArray(fields)) return [];
  return fields
    .filter((field) => field.required || field.recommended)
    .map((field) => ({
      ...field,
      children: field.children ? filterRecommendedFields(field.children) : [],
    }));
};

const NestedChildFormContent = ({
  nextValuePath,
  isOpen = true,
  onClose,
  isEdit = false,
  pageIndex,
  isGenerated = false,
}) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();

  const fieldPath = removeIndices(nextValuePath);
  const field = useSelector(selectFieldByPath(fieldPath));
  const fieldValues = useSelector(selectFormState);
  const pages = useSelector(selectPages);

  const { viewMode = "mandatory" } = useSelector((state) => state.formUi || {});

  const isPopupValid = useSelector(
    useMemo(() => makeSelectIsPopupValid(nextValuePath), [nextValuePath]),
  );

  const formatPatterns = useSelector(selectFormatPatterns);
  const depFormatPatterns = useSelector(selectDepFormatPatterns);
  const mode = useSelector(selectMode);
  const readOnly = mode === "view";

  const isFormatValid = useMemo(() => {
    if (!fieldValues || !field) return true;
    const keys = Object.keys(fieldValues).filter((k) =>
      k.startsWith(nextValuePath),
    );
    for (const key of keys) {
      const value = fieldValues[key];
      if (value === undefined || value === null || value === "") continue;

      const fPath = removeIndices(key);
      const fieldDef = getFieldByPath([field], fPath);

      if (fieldDef) {
        const error = getValidationError({
          field: fieldDef,
          fieldPath: fPath,
          value: fieldDef.multiple
            ? Array.isArray(value)
              ? value
              : [value]
            : value,
          readOnly,
          formatPatterns,
          depFormatPatterns,
        });
        if (error) return false;
      }
    }
    return true;
  }, [
    fieldValues,
    nextValuePath,
    field,
    readOnly,
    formatPatterns,
    depFormatPatterns,
  ]);

  const canSave = isPopupValid && isFormatValid;

  const latestFieldValuesRef = useRef(fieldValues);
  const isSavedRef = useRef(false);

  useEffect(() => {
    latestFieldValuesRef.current = fieldValues;
  }, [fieldValues]);

  useEffect(() => {
    // Snapshot on mount
    const initialFieldValues = { ...latestFieldValuesRef.current };
    isSavedRef.current = false;

    // Cleanup on unmount
    return () => {
      if (isSavedRef.current) return;

      const currentValues = latestFieldValuesRef.current;
      if (!currentValues) return;

      // Find all keys that were present when the form was opened and belong to this child
      const initialKeysForPath = Object.keys(initialFieldValues).filter((key) =>
        key.startsWith(nextValuePath),
      );

      // Find all keys that are currently present and belong to this child
      const currentKeysForPath = Object.keys(currentValues).filter((key) =>
        key.startsWith(nextValuePath),
      );

      // Remove any newly added keys that didn't exist initially
      currentKeysForPath.forEach((key) => {
        if (!Object.prototype.hasOwnProperty.call(initialFieldValues, key)) {
          dispatch(removeFieldValue(key));
        }
      });

      // Restore the values of keys that existed initially
      initialKeysForPath.forEach((key) => {
        if (currentValues[key] !== initialFieldValues[key]) {
          dispatch(
            setFieldValue({ path: key, value: initialFieldValues[key] }),
          );
        }
      });
    };
  }, [nextValuePath, dispatch]);

  const handleSave = () => {
    if (!canSave) return;

    isSavedRef.current = true;

    const prefixPath = nextValuePath.substring(
      0,
      nextValuePath.lastIndexOf("["),
    );

    if (!isEdit) {
      dispatch(incrementInstanceCount(prefixPath));
    }

    onClose?.();
  };

  if (!field) return null;

  const filterFieldsByViewMode = (fieldList) => {
    if (!Array.isArray(fieldList)) return [];

    switch (viewMode) {
      case "mandatory":
        return filterMandatoryFields(fieldList);
      case "recommended":
        return filterRecommendedFields(fieldList);
      case "complete":
      default:
        return fieldList;
    }
  };

  const isSchemaBacked =
    !isGenerated && pageIndex !== undefined && pages?.[pageIndex];
  const page = isSchemaBacked ? pages[pageIndex] : null;

  const renderContent = () => {
    if (isSchemaBacked && page && page.items) {
      const activeItems = page.items;
      const displayedItems = activeItems
        .map((item) => {
          if (item.type === "field") {
            const filtered = filterFieldsByViewMode([item.field]);
            return filtered.length > 0
              ? { type: "field", field: filtered[0] }
              : null;
          }

          if (item.type === "section") {
            const filteredFields = filterFieldsByViewMode(item.fields || []);
            return filteredFields.length > 0
              ? { ...item, fields: filteredFields }
              : null;
          }

          return null;
        })
        .filter(Boolean);

      return (
        <Box>
          {displayedItems.map((item, index) => {
            if (item.type === "section") {
              return (
                <Box
                  key={item.id}
                  sx={{
                    mt: 4,
                    mb: 2,
                    p: 3,
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 2,
                    backgroundColor: "background.paper",
                    boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.05)",
                  }}
                >
                  <Typography variant="h6" sx={{ mb: 0.5 }}>
                    {item.label}
                  </Typography>

                  {item.description && (
                    <Typography
                      variant="body2"
                      sx={{ mt: 0.5, mb: 0, color: "text.secondary" }}
                    >
                      {item.description}
                    </Typography>
                  )}

                  {item.fields.map((f, fieldIndex) => {
                    const childPath = `${nextValuePath}.${f.name}`;
                    return (
                      <FieldChecker
                        key={`${item.id}-${f.name}-${fieldIndex}`}
                        valuePath={childPath}
                        depth={1}
                      />
                    );
                  })}
                </Box>
              );
            }

            if (item.type === "field") {
              const childPath = `${nextValuePath}.${item.field.name}`;
              return (
                <FieldChecker
                  key={`field-${item.field.name}-${index}`}
                  valuePath={childPath}
                  depth={1}
                />
              );
            }

            return null;
          })}
        </Box>
      );
    }

    // Generated page (fallback)
    const displayedFields = filterFieldsByViewMode(field.children || []);
    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
        {displayedFields.map((child) => {
          const childPath = `${nextValuePath}.${child.name}`;
          return (
            <FieldChecker key={childPath} valuePath={childPath} depth={1} />
          );
        })}
      </Box>
    );
  };

  return (
    <Box>
      {renderContent()}

      <Box
        sx={{
          display: "flex",
          justifyContent: "flex-start",
          gap: 2,
          mt: 3,
        }}
      >
        {onClose && (
          <Button color="error" onClick={onClose}>
            {t("popup.cancel")}
          </Button>
        )}

        <Button
          variant="contained"
          onClick={handleSave}
          disabled={!canSave}
          sx={{
            backgroundColor: theme.primaryColor,
            "&:hover": {
              backgroundColor: theme.primaryColor,
            },
          }}
          startIcon={<SaveIcon />}
        >
          {t("popup.save")}
        </Button>
      </Box>
    </Box>
  );
};

export default NestedChildFormContent;
