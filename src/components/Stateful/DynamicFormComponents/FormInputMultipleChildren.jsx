import React, { useEffect, useMemo } from "react";
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
import { useTranslation } from "../../../utils/OpenAIRE/TranslationContext";
import theme from "../../../theme";
import {
  selectFormState,
  selectFieldByPath,
  selectInstanceCount,
  makeSelectFormValueByPrefix,
  selectPages,
} from "../../../store/selectors/formSelectors";
import { setFormState } from "../../../store/slices/formValueSlice";
import { setAllInstanceCounts } from "../../../store/slices/instanceCountsSlice";
import { useSelector, useDispatch } from "react-redux";
import { removeIndices } from "../../../utils/removeIndices";
import { selectMode } from "../../../store/slices/modeSlice";
import {
  selectActivePage,
  setActivePage,
} from "../../../store/slices/activePageSlice";
import { setCurrentPage } from "../../../store/slices/formUiSlice";
import { setChildFormNavigation } from "../../../store/slices/childFormNavigationSlice";
import { upsertChildPageMeta } from "../../../store/slices/fieldSchemaSlice";
import { extractCleanOrcid } from "../../../utils/orcidUtils";
import {
  findFieldByRelativePath,
  findLinkedChildPageIndex,
} from "../../../utils/fieldTreeUtils";
import { buildInstanceCountsFromValues } from "../../../utils/instanceCounts";
import { useNotification } from "../../Stateless/NotificationContext";

const FormInputMultipleChildren = ({ valuePath, parentPageIndex }) => {
  const { t } = useTranslation();
  const { confirm } = useNotification();
  const dispatch = useDispatch();

  const mode = useSelector(selectMode);
  const readOnly = mode === "view";

  const pages = useSelector(selectPages);
  const activePageIndex = useSelector(selectActivePage);
  const resolvedParentPageIndex =
    parentPageIndex !== undefined ? parentPageIndex : activePageIndex;

  const formState = useSelector(selectFormState);
  const fieldPath = removeIndices(valuePath);
  const field = useSelector(selectFieldByPath(fieldPath));

  const instanceCount = useSelector(selectInstanceCount(valuePath));
  const selectPrefixedValues = useMemo(
    () => makeSelectFormValueByPrefix(valuePath),
    [valuePath],
  );
  const fieldValues = useSelector(selectPrefixedValues);

  const linkedChildPageIndex = useMemo(
    () => findLinkedChildPageIndex(field, pages),
    [field, pages],
  );

  // Group flat values into instances: {0: {...}, 1: {...}, ...}
  const instances = useMemo(() => {
    const grouped = {};
    Object.entries(fieldValues || {}).forEach(([fullKey, value]) => {
      if (!fullKey.startsWith(valuePath)) return;
      const relativePath = fullKey.substring(valuePath.length);
      const indexMatch = relativePath.match(/^\[(\d+)\]/);
      if (indexMatch) {
        const index = parseInt(indexMatch[1], 10);
        const prop =
          relativePath.substring(indexMatch[0].length).slice(1) || "_base";
        if (!grouped[index]) grouped[index] = {};
        grouped[index][prop] = value;
      }
    });
    return Object.entries(grouped)
      .sort(([a], [b]) => parseInt(a, 10) - parseInt(b, 10))
      .map(([reduxIndex, instanceData]) => ({
        visualIndex: parseInt(reduxIndex, 10),
        reduxIndex: parseInt(reduxIndex, 10),
        data: instanceData,
      }));
  }, [fieldValues, valuePath]);

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

  const name = field?.name;
  const label = field?.label;

  useEffect(() => {
    if (linkedChildPageIndex >= 0 && field) {
      dispatch(
        upsertChildPageMeta({
          childPageIndex: linkedChildPageIndex,
          parentFieldPath: fieldPath,
          parentPageIndex: resolvedParentPageIndex,
          label: label || name,
        }),
      );
    }
  }, [linkedChildPageIndex, field, fieldPath, resolvedParentPageIndex, label, name, dispatch]);

  if (!field) return null;

  const parseKey = (key) => {
    const parts = key.split(".");
    let currentPath = "";
    return parts.map((part) => {
      const match = part.match(/^([^[]+)(?:\[(\d+)\])?$/);
      const partName = match ? match[1] : part;
      const index =
        match && match[2] !== undefined ? parseInt(match[2], 10) : -1;

      currentPath = currentPath ? `${currentPath}.${partName}` : partName;

      return { name: partName, index, fullPath: currentPath };
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

  const shouldShowAddButton = !readOnly;
  const displayName = label || name;

  const handleAddAsPage = () => {
    dispatch(
      setChildFormNavigation({
        push: true,
        nextValuePath: `${valuePath}[${instanceCount}]`,
        parentPageIndex: resolvedParentPageIndex,
        childPageIndex: linkedChildPageIndex >= 0 ? linkedChildPageIndex : null,
        isEdit: false,
        fallbackLabel: displayName,
        fallbackFieldPath: fieldPath,
        useGeneratedPage: linkedChildPageIndex < 0,
      }),
    );

    if (linkedChildPageIndex >= 0) {
      dispatch(setActivePage(linkedChildPageIndex));
    }

    dispatch(setCurrentPage(1));
  };

  const handleEdit = (instance) => {
    dispatch(
      setChildFormNavigation({
        push: true,
        nextValuePath: `${valuePath}[${instance.reduxIndex}]`,
        parentPageIndex: resolvedParentPageIndex,
        childPageIndex: linkedChildPageIndex >= 0 ? linkedChildPageIndex : null,
        isEdit: true,
        fallbackLabel: displayName,
        fallbackFieldPath: fieldPath,
        useGeneratedPage: linkedChildPageIndex < 0,
      }),
    );

    if (linkedChildPageIndex >= 0) {
      dispatch(setActivePage(linkedChildPageIndex));
    }

    dispatch(setCurrentPage(1));
  };

  // Delete handler: shifts keys AND rebuilds instanceCounts cleanly so nested sub-arrays stay synchronized
  const handleDelete = async (instance) => {
    const indexToDelete = instance.reduxIndex;
    const itemLabel = `${displayName} #${instance.visualIndex + 1}`;

    const confirmed = await confirm({
      title: t("forminputmultiple.delete_confirm_title"),
      message: t("forminputmultiple.delete_confirm_message").replace("{{name}}", itemLabel),
      confirmLabel: t("forminputmultiple.delete"),
      cancelLabel: t("common.cancel"),
      confirmColor: "error",
    });

    if (!confirmed) return;

    const basePrefix = `${valuePath}[`;
    const allKeysForThisField = Object.keys(formState).filter((key) =>
      key.startsWith(basePrefix),
    );

    if (allKeysForThisField.length === 0) {
      return;
    }

    const indices = Array.from(
      new Set(
        allKeysForThisField.map((key) => {
          const afterBase = key.slice(basePrefix.length);
          const indexStr = afterBase.split("]")[0];
          return parseInt(indexStr, 10);
        }),
      ),
    ).sort((a, b) => a - b);

    const maxIndex = indices.length ? indices[indices.length - 1] : -1;
    if (indexToDelete > maxIndex) return;

    const nextFormState = { ...formState };

    // Remove deleted instance keys
    const deletedPrefix = `${valuePath}[${indexToDelete}]`;
    allKeysForThisField
      .filter((key) => key.startsWith(deletedPrefix))
      .forEach((key) => {
        delete nextFormState[key];
      });

    // Shift subsequent instances down by 1
    for (let i = indexToDelete + 1; i <= maxIndex; i += 1) {
      const fromPrefix = `${valuePath}[${i}]`;
      const toPrefix = `${valuePath}[${i - 1}]`;

      allKeysForThisField
        .filter((key) => key.startsWith(fromPrefix))
        .forEach((oldKey) => {
          const suffix = oldKey.slice(fromPrefix.length);
          const newKey = `${toPrefix}${suffix}`;
          nextFormState[newKey] = formState[oldKey];
          delete nextFormState[oldKey];
        });
    }

    dispatch(setFormState(nextFormState));
    dispatch(setAllInstanceCounts(buildInstanceCountsFromValues(nextFormState)));
  };

  return (
    <Box sx={{ my: 0, width: "100%" }}>
      {instances.length > 0 && (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 280px), 1fr))",
            gap: 2,
            pt: readOnly ? 1 : 0,
            pb: readOnly ? 2 : 0,
          }}
        >
          {instances.map((instance) => {
            const instanceOrcid = extractCleanOrcid(
              instance.data["id"] ||
                Object.entries(instance.data).find(
                  ([k]) => k.toLowerCase().includes("orcid") || k.endsWith(".id"),
                )?.[1],
            );
            const isDuplicateInList =
              instanceOrcid &&
              instances.some((other) => {
                if (other.reduxIndex === instance.reduxIndex) return false;
                const otherOrcid = extractCleanOrcid(
                  other.data["id"] ||
                    Object.entries(other.data).find(
                      ([k]) => k.toLowerCase().includes("orcid") || k.endsWith(".id"),
                    )?.[1],
                );
                return otherOrcid && otherOrcid === instanceOrcid;
              });

            const sortedEntries = Object.entries(instance.data).sort(([keyA], [keyB]) =>
              compareKeys(keyA, keyB),
            );

            const nodes = [];
            let previousParts = [];

            sortedEntries.forEach(([subKey, value]) => {
              if (value === null || value === undefined || value === "") return;

              const parts = parseKey(subKey);

              let divergenceIndex = 0;
              while (
                divergenceIndex < parts.length &&
                divergenceIndex < previousParts.length &&
                parts[divergenceIndex].name === previousParts[divergenceIndex].name &&
                parts[divergenceIndex].index === previousParts[divergenceIndex].index
              ) {
                divergenceIndex++;
              }

              for (let i = divergenceIndex; i < parts.length - 1; i++) {
                const part = parts[i];
                const matchedField = findFieldByRelativePath(field, part.fullPath);
                const labelObj = matchedField?.label || matchedField?.name || part.name;
                const labelStr =
                  typeof labelObj === "string"
                    ? labelObj
                    : typeof labelObj === "object" && labelObj?.title
                      ? labelObj.title
                      : String(labelObj) || "Unknown";

                const nodeLabel =
                  labelStr + (part.index !== -1 ? ` #${part.index + 1}` : "");

                nodes.push({
                  type: "header",
                  key: `${part.fullPath}${part.index !== -1 ? `[${part.index}]` : ""}`,
                  label: nodeLabel,
                  depth: i,
                });
              }

              const lastPart = parts[parts.length - 1];
              const matchedField = findFieldByRelativePath(field, lastPart.fullPath);
              const labelObj =
                matchedField?.label || matchedField?.name || lastPart.name;
              const labelStr =
                typeof labelObj === "string"
                  ? labelObj
                  : typeof labelObj === "object" && labelObj?.title
                    ? labelObj.title
                    : String(labelObj) || "Unknown";

              const isMultiplePrimitive =
                matchedField?.multiple && !(matchedField?.children?.length > 0);

              if (isMultiplePrimitive && lastPart.index !== -1) {
                const existingNodeIndex = nodes.findIndex(
                  (n) => n.type === "valueArray" && n.fullPath === lastPart.fullPath,
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
                  labelStr + (lastPart.index !== -1 ? ` #${lastPart.index + 1}` : "");

                nodes.push({
                  type: "value",
                  key: subKey,
                  label: leafLabel,
                  value: typeof value === "boolean" ? String(value) : value,
                  depth: parts.length - 1,
                });
              }

              previousParts = parts;
            });

            return (
              <Card
                key={instance.reduxIndex}
                elevation={2}
                sx={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  minWidth: 0,
                }}
              >
                <CardContent
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    pb: 0,
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: 1,
                      mb: 1,
                    }}
                  >
                    <Typography variant="h6" sx={{ mb: 0, fontSize: "1.05rem" }}>
                      {displayName} #{instance.visualIndex + 1}
                    </Typography>
                    {isDuplicateInList && (
                      <Chip
                        label={t("forminputmultiple.duplicate_contributor")}
                        color="warning"
                        size="small"
                        sx={{ fontWeight: 600, height: 20, fontSize: "0.7rem" }}
                      />
                    )}
                  </Box>

                  {nodes.map((node) => {
                    const nodeDepth = node.depth;
                    return (
                      <Box
                        key={node.key}
                        sx={{
                          mt: nodeDepth > 0 ? 0.5 : 2,
                          flexGrow: 1,
                          pl: nodeDepth > 0 ? 1.5 : 0,
                          ml: nodeDepth > 0 ? nodeDepth * 1.5 : 0,
                          borderLeft:
                            nodeDepth > 0
                              ? "2px solid rgba(0, 0, 0, 0.12)"
                              : "none",
                        }}
                      >
                        {node.type === "header" ? (
                          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                            {node.label}
                          </Typography>
                        ) : node.type === "valueArray" ? (
                          <>
                            <Typography variant="subtitle2">{node.label}:</Typography>
                            <Box
                              sx={{
                                mt: 0.5,
                                display: "flex",
                                flexWrap: "wrap",
                                gap: 0.5,
                              }}
                            >
                              {node.values.map((val, idx) => (
                                <Chip key={`${val}-${idx}`} label={val} size="small" />
                              ))}
                            </Box>
                          </>
                        ) : (
                          <>
                            <Typography variant="subtitle2">{node.label}:</Typography>
                            <Typography
                              variant="body2"
                              sx={{
                                overflowWrap: "anywhere",
                                wordWrap: "break-word",
                              }}
                              color="text.secondary"
                            >
                              {node.value !== undefined && node.value !== null && node.value !== ""
                                ? node.value
                                : "—"}
                            </Typography>
                          </>
                        )}
                      </Box>
                    );
                  })}
                </CardContent>

                {!readOnly && (
                  <CardActions sx={{ pt: 1, justifyContent: "flex-end", mx: 1 }}>
                    <Button onClick={() => handleEdit(instance)}>
                      {t("forminputmultiple.edit")}
                    </Button>
                    <Button color="error" onClick={() => handleDelete(instance)}>
                      {t("forminputmultiple.delete")}
                    </Button>
                  </CardActions>
                )}
              </Card>
            );
          })}
        </Box>
      )}

      {shouldShowAddButton && (
        <Button
          sx={{
            color: theme.primaryColor,
            borderColor: theme.primaryColor,
            "&:hover": {
              borderColor: theme.primaryColor,
              backgroundColor: theme.hoverUnselectedBgColor,
            },
            mt: 1.5,
          }}
          variant="outlined"
          onClick={handleAddAsPage}
          startIcon={<AddIcon />}
        >
          {t("forminputmultiple.add")} {displayName}
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
          {t("no_data")} {displayName}
        </Box>
      )}
    </Box>
  );
};

export default FormInputMultipleChildren;
