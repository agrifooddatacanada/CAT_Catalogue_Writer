import React, { useMemo } from "react";
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Chip,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { useSelector, useDispatch } from "react-redux";
import { useTranslation } from "../../../utils/OpenAIRE/TranslationContext";
import theme from "../../../theme";
import {
  selectFieldByPath,
  selectFormState,
  selectFormValueByPrefix,
  selectPages,
} from "../../../store/selectors/formSelectors";
import { removeFieldValue } from "../../../store/slices/formValueSlice";
import { removeIndices } from "../../../utils/removeIndices";
import { selectMode } from "../../../store/slices/modeSlice";
import {
  selectActivePage,
  setActivePage,
} from "../../../store/slices/activePageSlice";
import { setCurrentPage } from "../../../store/slices/formUiSlice";
import { setChildFormNavigation } from "../../../store/slices/childFormNavigationSlice";
import { upsertChildPageMeta } from "../../../store/slices/fieldSchemaSlice";

const FormInputChildren = ({ valuePath, parentPageIndex }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();

  const mode = useSelector(selectMode);
  const readOnly = mode === "view";

  const pages = useSelector(selectPages);
  const activePageIndex = useSelector(selectActivePage);
  const resolvedParentPageIndex = parentPageIndex !== undefined ? parentPageIndex : activePageIndex;

  const formState = useSelector(selectFormState);
  const fieldPath = removeIndices(valuePath);
  const field = useSelector(selectFieldByPath(fieldPath));
  const fieldValues = useSelector(selectFormValueByPrefix(valuePath));

  const { name, label } = field;

  const childFieldNames = (field.children || [])
    .map((child) => child.name)
    .sort();

  const linkedChildPageIndex =
    childFieldNames.length > 0
      ? pages.findIndex((page) => {
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
        })
      : -1;

  React.useEffect(() => {
    if (linkedChildPageIndex >= 0) {
      dispatch(
        upsertChildPageMeta({
          childPageIndex: linkedChildPageIndex,
          parentFieldPath: fieldPath,
          parentPageIndex: resolvedParentPageIndex,
          label: label || name,
        }),
      );
    }
  }, [linkedChildPageIndex, fieldPath, resolvedParentPageIndex, label, name, dispatch]);

  const hasValues = useMemo(() => {
    return Object.keys(fieldValues || {}).some((key) => {
      const value = fieldValues[key];
      return value !== undefined && value !== null && value !== "";
    });
  }, [fieldValues]);

  const flattenedData = useMemo(() => {
    const result = {};
    Object.entries(fieldValues || {}).forEach(([fullKey, value]) => {
      if (!fullKey.startsWith(valuePath)) return;
      const relativePath = fullKey.substring(valuePath.length + 1); // remove "title."
      if (!relativePath) return;
      result[relativePath] = value;
    });
    return result;
  }, [fieldValues, valuePath]);

  const findFieldByRelativePath = (parentField, relativePath) => {
    if (!parentField?.children?.length) return null;

    for (const child of parentField.children) {
      if (child.name === relativePath) return child;

      if (relativePath.startsWith(`${child.name}.`)) {
        const nestedPath = relativePath.slice(child.name.length + 1);
        const found = findFieldByRelativePath(child, nestedPath);
        if (found) return found;
      }
    }

    return null;
  };

  const getLabelFromPath = (subKey) => {
    const path = removeIndices(subKey);
    const matchedField = findFieldByRelativePath(field, path);

    const labelObj = matchedField?.label || matchedField?.name || path;

    return typeof labelObj === "string"
      ? labelObj
      : typeof labelObj === "object" && labelObj?.title
        ? labelObj.title
        : String(labelObj) || "Unknown";
  };

  //   const getLabelFromPath = (subKey) => {
  //     const path = removeIndices(subKey);
  //     const traversalPath = path.replace(/\./g, ".children.");

  //     let current = field;
  //     const parts = traversalPath.split(".");

  //     for (let i = 0; i < parts.length; i += 2) {
  //       const childName = parts[i];
  //       current = current.children?.find((c) => c.name === childName);
  //       if (!current) break;
  //     }

  //     const labelObj = current?.label || current?.name || path.split(".").pop();

  //     return typeof labelObj === "string"
  //       ? labelObj
  //       : typeof labelObj === "object" && labelObj?.title
  //         ? labelObj.title
  //         : String(labelObj) || "Unknown";
  //   };

  const getNestingDepth = (subKey) => {
    return (subKey.match(/\./g) || []).length;
  };

  const handleOpenChildPage = () => {
    dispatch(
      setChildFormNavigation({
        push: true,
        nextValuePath: valuePath,
        parentPageIndex: resolvedParentPageIndex,
        childPageIndex: linkedChildPageIndex >= 0 ? linkedChildPageIndex : null,
        isEdit: hasValues,
        fallbackLabel: label || name,
        fallbackFieldPath: fieldPath,
        useGeneratedPage: linkedChildPageIndex < 0,
      }),
    );

    if (linkedChildPageIndex >= 0) {
      dispatch(setActivePage(linkedChildPageIndex));
    }

    dispatch(setCurrentPage(1));
  };

  const handleDelete = () => {
    if (!window.confirm(`Delete ${label || name}?`)) return;

    Object.keys(formState)
      .filter((key) => key.startsWith(`${valuePath}.`))
      .forEach((key) => {
        dispatch(removeFieldValue(key));
      });
  };

  return (
    <Box sx={{ my: 0, width: "100%" }}>
      {hasValues && (
        <Card
          elevation={2}
          sx={{
            mt: 1,
            minWidth: { xs: "240px", md: "320px" },
            maxWidth: { xs: "240px", md: "320px" },
          }}
        >
          <CardContent sx={{ display: "flex", flexDirection: "column", pb: 0 }}>
            {/* <Typography variant="h6" gutterBottom>
              {label || name}
            </Typography> */}

            {(() => {
              const grouped = {};
              Object.entries(flattenedData).forEach(([subKey, value]) => {
                if (value === null || value === undefined || value === "") return;

                const pathWithoutIndex = subKey.replace(/\[\d+\]/g, "");
                const matchedField = findFieldByRelativePath(field, removeIndices(subKey));
                
                const isMultiplePrimitive = matchedField?.multiple && !(matchedField?.children?.length > 0);

                if (isMultiplePrimitive) {
                  if (!grouped[pathWithoutIndex]) {
                    grouped[pathWithoutIndex] = {
                      isPrimitiveArray: true,
                      label: getLabelFromPath(subKey),
                      depth: getNestingDepth(subKey),
                      values: [],
                      subKey: pathWithoutIndex
                    };
                  }
                  grouped[pathWithoutIndex].values.push(value);
                } else {
                  grouped[subKey] = {
                    isPrimitiveArray: false,
                    label: getLabelFromPath(subKey),
                    depth: getNestingDepth(subKey),
                    value,
                    subKey
                  };
                }
              });

              return Object.values(grouped).map((item) => (
                <Box key={item.subKey} sx={{ mt: item.depth > 0 ? 0.5 : 2.5 }}>
                  <Typography variant="subtitle2" sx={{ pl: item.depth * 2 }}>
                    {item.label}:
                  </Typography>
                  {item.isPrimitiveArray ? (
                    <Box sx={{ mt: 0.5, pl: item.depth * 2, display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                      {item.values.map((val, idx) => (
                        <Chip key={`${val}-${idx}`} label={val} size="small" />
                      ))}
                    </Box>
                  ) : (
                    <Typography
                      variant="body2"
                      sx={{
                        overflowWrap: "anywhere",
                        wordWrap: "break-word",
                        pl: item.depth * 2,
                      }}
                      color="text.secondary"
                    >
                      {item.value || "—"}
                    </Typography>
                  )}
                </Box>
              ));
            })()}
          </CardContent>

          {!readOnly && (
            <CardActions sx={{ pt: 0, justifyContent: "flex-end", mx: 1 }}>
              <Button onClick={handleOpenChildPage}>Edit</Button>
              <Button color="error" onClick={handleDelete}>
                Delete
              </Button>
            </CardActions>
          )}
        </Card>
      )}

      {!readOnly && !hasValues && (
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          sx={{
            color: theme.primaryColor,
            borderColor: theme.primaryColor,
            "&:hover": {
              borderColor: theme.primaryColor,
              backgroundColor: theme.backgroundColor,
            },
            mt: 1,
          }}
          onClick={handleOpenChildPage}
        >
          Add {label || name}
        </Button>
      )}

      {readOnly && !hasValues && (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            pl: 1.5,
            fontStyle: "italic",
            color: theme.descriptionColor,
            pt: 1.5,
            pb: 2,
          }}
        >
          {t("no_data")} {label || name}
        </Box>
      )}
    </Box>
  );
};

export default FormInputChildren;
