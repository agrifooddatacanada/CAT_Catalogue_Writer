import React, { useMemo, useState } from "react";
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Grid,
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
import Popup from "./Popup";
import { selectMode } from "../../../store/slices/modeSlice";

const FormInputMultipleChildren = ({ valuePath, depth = 0, isEditMode }) => {
  // const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false); // edit state
  const [editingIndex, setEditingIndex] = useState(null); // which instance
  const [addOpen, setAddOpen] = useState(false);
  const { t } = useTranslation();
  const dispatch = useDispatch();

  const mode = useSelector(selectMode);
  const readOnly = mode === "view";
  // console.log("mode:", mode, "| readOnly:", readOnly);

  const formState = useSelector(selectFormState);
  const fieldPath = removeIndices(valuePath);
  const field = useSelector(selectFieldByPath(fieldPath));

  const instanceCount = useSelector(selectInstanceCount(valuePath));
  const fieldValues = useSelector(selectFormValueByPrefix(valuePath));

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

  const getLabelFromPath = (subKey) => {
    // 1. removeIndices(subKey)
    const path = removeIndices(subKey); // "creator.affiliation.affiliationIdentifier.affiliationIdentifierScheme"

    // 2. Replace every "." with ".children."
    const traversalPath = path.replace(/\./g, ".children.");

    // 3. Traverse field schema dynamically
    let current = field;
    const parts = traversalPath.split(".");

    for (let i = 0; i < parts.length; i += 2) {
      const childName = parts[i];
      current = current.children?.find((c) => c.name === childName);
      if (!current) break;
    }

    // String extraction
    const labelObj = current?.label || current?.name || path.split(".").pop();

    return typeof labelObj === "string"
      ? labelObj
      : typeof labelObj === "object" && labelObj?.title
        ? labelObj.title
        : String(labelObj) || "Unknown";
  };
  const getNestingDepth = (subKey) => {
    return (subKey.match(/\./g) || []).length - 1; // Count dots = nesting levels
  };

  // Show Add button only if not in readOnly mode
  const shouldShowAddButton = !readOnly;

  const { name, label } = field;

  // Edit handler
  const handleEdit = (instance) => {
    setEditingIndex(instance.reduxIndex); // Use Redux index for popup path
    setEditOpen(true);
  };

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
                {Object.entries(instance.data).map(([subKey, value]) => {
                  const depth = getNestingDepth(subKey);
                  return (
                    <Box
                      key={subKey}
                      sx={{ mt: depth > 0 ? 0.5 : 2.5, flexGrow: 1 }}
                    >
                      <Typography variant="subtitle2" sx={{ pl: depth * 2 }}>
                        {getLabelFromPath(subKey)}:
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          overflowWrap: "anywhere", // modern, allows break anywhere
                          wordWrap: "break-word", // legacy alias, still useful
                          pl: depth * 2,
                        }}
                        color="text.secondary"
                      >
                        {value || "—"}
                      </Typography>
                    </Box>
                  );
                })}
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
          onClick={() => {
            setAddOpen(true);
          }}
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
      <Popup
        nextValuePath={`${valuePath}[${instanceCount}]`}
        open={addOpen}
        onClose={() => setAddOpen(false)}
      />

      {/* EDIT POPUP */}
      {editingIndex !== null && (
        <Popup
          nextValuePath={`${valuePath}[${editingIndex}]`} // Reuse existing index
          open={editOpen}
          onClose={() => {
            setEditOpen(false);
            setEditingIndex(null);
          }}
        />
      )}

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
