import React, { useMemo } from "react";
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Grid,
  Chip,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { useTranslation } from "../../../utils/OpenAIRE/TranslationContext";
import theme from "../../../theme";
import {
  selectFormState,
  selectFieldByPath,
  selectInstanceCount,
  selectFormValueByPrefix,
} from "../../../store/selectors/formSelectors";
import {
  setFieldValue,
  removeFieldValue,
} from "../../../store/slices/formValueSlice";
import { decrementInstanceCount } from "../../../store/slices/instanceCountsSlice";
import { useSelector, useDispatch } from "react-redux";
import { removeIndices } from "../../../utils/removeIndices";
// import Popup from "./Popup";
import { selectMode } from "../../../store/slices/modeSlice";
import {
  selectActivePage,
  setActivePage,
} from "../../../store/slices/activePageSlice";
import { setCurrentPage } from "../../../store/slices/formUiSlice";
import { selectPages } from "../../../store/selectors/formSelectors";
import { setChildFormNavigation } from "../../../store/slices/childFormNavigationSlice";
import { upsertChildPageMeta } from "../../../store/slices/fieldSchemaSlice";

const FormInputMultipleChildren = ({ valuePath, depth = 0, isEditMode }) => {
  // const [addDialogOpen, setAddDialogOpen] = useState(false);
  // const [editOpen, setEditOpen] = useState(false); // edit state
  // const [editingIndex, setEditingIndex] = useState(null); // which instance
  // const [addOpen, setAddOpen] = useState(false);
  const { t } = useTranslation();
  const dispatch = useDispatch();

  const mode = useSelector(selectMode);
  const readOnly = mode === "view";
  // console.log("mode:", mode, "| readOnly:", readOnly);

  const pages = useSelector(selectPages);
  const activePageIndex = useSelector(selectActivePage);

  const formState = useSelector(selectFormState);
  const fieldPath = removeIndices(valuePath);
  const field = useSelector(selectFieldByPath(fieldPath));

  const instanceCount = useSelector(selectInstanceCount(valuePath));
  const fieldValues = useSelector(selectFormValueByPrefix(valuePath));

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

  // Group flat values into instances: {0: {...}, 1: {...}, ...}
  const instances = useMemo(() => {
    const grouped = {};
    Object.entries(fieldValues || {}).forEach(([fullKey, value]) => {
      if (!fullKey.startsWith(valuePath)) return;
      // Extract relative path after valuePath
      const relativePath = fullKey.substring(valuePath.length);
      // Parse first [index] OR .property
      const indexMatch = relativePath.match(/^\[(\d+)\]/);
      if (indexMatch) {
        // Array instance: creator[0].affiliation[1].prop → index 1
        const index = parseInt(indexMatch[1], 10);
        const prop =
          relativePath.substring(indexMatch[0].length).slice(1) || "_base";
        if (!grouped[index]) grouped[index] = {};
        grouped[index][prop] = value;
      }
    });
    // Convert to array, sort by Redux index, create visual order (handles gaps/missing instances)
    return Object.entries(grouped)
      .sort(([a], [b]) => parseInt(a, 10) - parseInt(b, 10)) // Redux order
      .map(([reduxIndex, instanceData]) => ({
        visualIndex: parseInt(reduxIndex, 10), // 0, 1, 2, ... for display
        reduxIndex: parseInt(reduxIndex, 10), // Same for Popup path
        data: instanceData,
      }));
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

  const orderedPaths = useMemo(() => {
    const paths = [];
    const traverse = (node, prefix = "") => {
      const currentPath = prefix ? `${prefix}.${node.name}` : node.name;
      paths.push(currentPath);
      if (node.children) {
        node.children.forEach((child) => traverse(child, currentPath));
      }
    };

    if (linkedChildPageIndex >= 0 && pages[linkedChildPageIndex]) {
      const page = pages[linkedChildPageIndex];
      const traverseItem = (item) => {
        if (item.type === "section") {
          (item.fields || []).forEach((f) => traverse(f));
        } else if (item.type === "field" && item.field) {
          traverse(item.field);
        }
      };
      (page.items || []).forEach(traverseItem);
    } else if (field?.children) {
      field.children.forEach((child) => traverse(child));
    }
    return paths;
  }, [field, linkedChildPageIndex, pages]);

  const parseKey = (key) => {
    const parts = key.split(".");
    let currentPath = "";
    return parts.map((part) => {
      const match = part.match(/^([^[]+)(?:\[(\d+)\])?$/);
      const name = match ? match[1] : part;
      const index =
        match && match[2] !== undefined ? parseInt(match[2], 10) : -1;

      currentPath = currentPath ? `${currentPath}.${name}` : name;

      return { name, index, fullPath: currentPath };
    });
  };

  const compareKeys = (keyA, keyB) => {
    const partsA = parseKey(keyA);
    const partsB = parseKey(keyB);

    const minLength = Math.min(partsA.length, partsB.length);
    for (let i = 0; i < minLength; i++) {
      const pA = partsA[i];
      const pB = partsB[i];

      if (pA.name !== pB.name) {
        const orderA = orderedPaths.indexOf(pA.fullPath);
        const orderB = orderedPaths.indexOf(pB.fullPath);
        const oA = orderA === -1 ? Number.MAX_SAFE_INTEGER : orderA;
        const oB = orderB === -1 ? Number.MAX_SAFE_INTEGER : orderB;
        if (oA !== oB) return oA - oB;
        return pA.name.localeCompare(pB.name);
      }

      if (pA.index !== pB.index) {
        return pA.index - pB.index;
      }
    }

    return partsA.length - partsB.length;
  };

  // Show Add button only if not in readOnly mode
  const shouldShowAddButton = !readOnly;

  const { name, label } = field;

  React.useEffect(() => {
    if (linkedChildPageIndex >= 0) {
      dispatch(
        upsertChildPageMeta({
          childPageIndex: linkedChildPageIndex,
          parentFieldPath: fieldPath,
          parentPageIndex: activePageIndex,
          label: label || name,
        }),
      );
    }
  }, [linkedChildPageIndex, fieldPath, activePageIndex, label, name, dispatch]);

  const handleAddAsPage = () => {
    dispatch(
      setChildFormNavigation({
        push: true,
        nextValuePath: `${valuePath}[${instanceCount}]`,
        parentPageIndex: activePageIndex,
        childPageIndex: linkedChildPageIndex,
        isEdit: false,
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

  // Edit handler
  const handleEdit = (instance) => {
    dispatch(
      setChildFormNavigation({
        push: true,
        nextValuePath: `${valuePath}[${instance.reduxIndex}]`,
        parentPageIndex: activePageIndex,
        childPageIndex: linkedChildPageIndex >= 0 ? linkedChildPageIndex : null,
        isEdit: true,
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
  // const handleEdit = (instance) => {
  //   setEditingIndex(instance.reduxIndex); // Use Redux index for popup path
  //   setEditOpen(true);
  // };

  // Delete handler
  const handleDelete = (instance) => {
    const indexToDelete = instance.reduxIndex; // we stored reduxIndex on each instance

    if (
      !window.confirm(
        `Delete ${field.label || field.name} #${instance.visualIndex + 1}?`,
      )
    ) {
      return;
    }

    // 1. Collect all keys for this base path: e.g. "creator[0].affiliation["
    const basePrefix = `${valuePath}[`; // e.g. "creator[0].affiliation["

    const allKeysForThisField = Object.keys(formState).filter((key) =>
      key.startsWith(basePrefix),
    );

    if (allKeysForThisField.length === 0) {
      return;
    }

    // 2. Find all existing indices for this base
    const indices = Array.from(
      new Set(
        allKeysForThisField.map((key) => {
          const afterBase = key.slice(basePrefix.length); // "0].affiliation..."
          const indexStr = afterBase.split("]")[0]; // "0"
          return parseInt(indexStr, 10);
        }),
      ),
    ).sort((a, b) => a - b);

    const maxIndex = indices.length ? indices[indices.length - 1] : -1;
    if (indexToDelete > maxIndex) return;

    // 3. Shift all instances AFTER indexToDelete down by 1
    //    For i = indexToDelete+1 .. maxIndex:
    //      valuePath[i+1].something -> valuePath[i].something
    for (let i = indexToDelete + 1; i <= maxIndex; i += 1) {
      const fromPrefix = `${valuePath}[${i}]`;
      const toPrefix = `${valuePath}[${i - 1}]`;

      allKeysForThisField
        .filter((key) => key.startsWith(fromPrefix))
        .forEach((oldKey) => {
          const suffix = oldKey.slice(fromPrefix.length); // "].affiliation..."
          const newKey = `${toPrefix}${suffix}`; // "creator[0].affiliation[1].x" -> "[0].x"
          const value = formState[oldKey];

          // Move value
          dispatch(setFieldValue({ path: newKey, value }));
          dispatch(removeFieldValue(oldKey));
        });
    }

    // 4. Remove the last instance (now duplicated)
    const lastPrefix = `${valuePath}[${maxIndex}]`;
    allKeysForThisField
      .filter((key) => key.startsWith(lastPrefix))
      .forEach((key) => {
        dispatch(removeFieldValue(key));
      });

    // 5. Decrement instance count for this base path
    dispatch(decrementInstanceCount(valuePath));
  };

  return (
    <Box sx={{ my: 0, width: "100%" }}>
      <Grid
        container
        spacing={2}
        sx={{
          pt: readOnly && instances.length !== 0 ? 1 : 0,
          pb: readOnly && instances.length !== 0 ? 2 : 0,
        }}
      >
        {instances.map((instance) => (
          <Grid key={instance.reduxIndex} sx={{ display: "block" }}>
            <Card
              elevation={2}
              sx={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                minWidth: { xs: "240px", md: "320px" },
                maxWidth: { xs: "240px", md: "320px" },
                justifyContent: "space-between",
              }}
            >
              <CardContent
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  pb: 0,
                }}
              >
                <Typography variant="h6" gutterBottom>
                  {field.label} #{instance.visualIndex + 1}
                </Typography>
                {(() => {
                  const sortedEntries = Object.entries(instance.data).sort(
                    ([keyA], [keyB]) => compareKeys(keyA, keyB)
                  );

                  const nodes = [];
                  let previousParts = [];

                  sortedEntries.forEach(([subKey, value]) => {
                    const parts = parseKey(subKey);

                    let divergenceIndex = 0;
                    while (
                      divergenceIndex < parts.length &&
                      divergenceIndex < previousParts.length &&
                      parts[divergenceIndex].name ===
                        previousParts[divergenceIndex].name &&
                      parts[divergenceIndex].index ===
                        previousParts[divergenceIndex].index
                    ) {
                      divergenceIndex++;
                    }

                    for (let i = divergenceIndex; i < parts.length - 1; i++) {
                      const part = parts[i];
                      const matchedField = findFieldByRelativePath(
                        field,
                        part.fullPath
                      );
                      const labelObj =
                        matchedField?.label || matchedField?.name || part.name;
                      const labelStr =
                        typeof labelObj === "string"
                          ? labelObj
                          : typeof labelObj === "object" && labelObj?.title
                            ? labelObj.title
                            : String(labelObj) || "Unknown";

                      const label =
                        labelStr +
                        (part.index !== -1 ? ` #${part.index + 1}` : "");

                      nodes.push({
                        type: "header",
                        key: part.fullPath + (part.index !== -1 ? `[${part.index}]` : ""),
                        label,
                        depth: i,
                      });
                    }

                    const lastPart = parts[parts.length - 1];
                    const matchedField = findFieldByRelativePath(
                      field,
                      lastPart.fullPath
                    );
                    const labelObj =
                      matchedField?.label || matchedField?.name || lastPart.name;
                    const labelStr =
                      typeof labelObj === "string"
                        ? labelObj
                        : typeof labelObj === "object" && labelObj?.title
                          ? labelObj.title
                          : String(labelObj) || "Unknown";

                    // Check if it's a multiple/array field (like checkboxes)
                    const isMultiplePrimitive = matchedField?.multiple && !(matchedField?.children?.length > 0);

                    if (isMultiplePrimitive && lastPart.index !== -1) {
                      const existingNodeIndex = nodes.findIndex(
                        (n) => n.type === "valueArray" && n.fullPath === lastPart.fullPath
                      );

                      if (existingNodeIndex !== -1) {
                        nodes[existingNodeIndex].values.push(value);
                      } else {
                        nodes.push({
                          type: "valueArray",
                          fullPath: lastPart.fullPath,
                          key: lastPart.fullPath,
                          label: labelStr,
                          values: [value],
                          depth: parts.length - 1,
                        });
                      }
                    } else {
                      const leafLabel =
                        labelStr +
                        (lastPart.index !== -1 ? ` #${lastPart.index + 1}` : "");

                      nodes.push({
                        type: "value",
                        key: subKey,
                        label: leafLabel,
                        value,
                        depth: parts.length - 1,
                      });
                    }

                    previousParts = parts;
                  });

                  return nodes.map((node) => {
                    const depth = node.depth;
                    return (
                      <Box
                        key={node.key}
                        sx={{
                          mt: depth > 0 ? 0.5 : 2.5,
                          flexGrow: 1,
                          pl: depth > 0 ? 1.5 : 0,
                          ml: depth > 0 ? depth * 1.5 : 0,
                          borderLeft:
                            depth > 0
                              ? `2px solid ${theme.palette?.divider || "rgba(0, 0, 0, 0.12)"}`
                              : "none",
                        }}
                      >
                        {node.type === "header" ? (
                          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                            {node.label}
                          </Typography>
                        ) : node.type === "valueArray" ? (
                          <>
                            <Typography variant="subtitle2">
                              {node.label}:
                            </Typography>
                            <Box sx={{ mt: 0.5, display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                              {node.values.map((val, idx) => (
                                <Chip key={`${val}-${idx}`} label={val} size="small" />
                              ))}
                            </Box>
                          </>
                        ) : (
                          <>
                            <Typography variant="subtitle2">
                              {node.label}:
                            </Typography>
                            <Typography
                              variant="body2"
                              sx={{
                                overflowWrap: "anywhere",
                                wordWrap: "break-word",
                              }}
                              color="text.secondary"
                            >
                              {node.value || "—"}
                            </Typography>
                          </>
                        )}
                      </Box>
                    );
                  });
                })()}
              </CardContent>

              {!readOnly && (
                <CardActions sx={{ pt: 0, justifyContent: "flex-end", mx: 1 }}>
                  <Button onClick={() => handleEdit(instance)}>Edit</Button>
                  <Button color="error" onClick={() => handleDelete(instance)}>
                    Delete
                  </Button>
                </CardActions>
              )}
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Add button */}
      {shouldShowAddButton && (
        <Button
          sx={{
            color: theme.primaryColor,
            borderColor: theme.primaryColor,
            "&:hover": {
              borderColor: theme.primaryColor,
              backgroundColor: theme.backgroundColor,
            },
            mt: 1,
          }}
          variant="outlined"
          onClick={handleAddAsPage}
          // onClick={() => {
          //   setAddOpen(true);
          // }}
          startIcon={<AddIcon />}
        >
          {t("forminputmultiple.add")} {label || name}
        </Button>
      )}

      {readOnly && instances.length === 0 && (
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

      {/* Render Popup */}
      {/* <Popup
        nextValuePath={`${valuePath}[${instanceCount}]`}
        open={addOpen}
        onClose={() => setAddOpen(false)}
      /> */}

      {/* EDIT POPUP */}
      {/* {editingIndex !== null && (
        <Popup
          nextValuePath={`${valuePath}[${editingIndex}]`} // Reuse existing index
          open={editOpen}
          onClose={() => {
            setEditOpen(false);
            setEditingIndex(null);
          }}
        />
      )} */}

      {/* Show "no data" message in readOnly mode when empty */}
      {!readOnly ? null : !isEditMode && fieldValues.length === 0 ? (
        <span
          style={{
            display: "inline-block",
            paddingLeft: "14px",
            paddingTop: "16.5px",
            paddingBottom: "16.5px",
            fontStyle: "italic",
            color: "rgba(100, 100, 100, 1)",
          }}
        >
          {t("no_data")} {label || name}
        </span>
      ) : null}
    </Box>
  );
};

export default FormInputMultipleChildren;
