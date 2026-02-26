import React, { useCallback } from "react";
import { Box, Button, IconButton } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import { useTranslation } from "../../../utils/OpenAIRE/TranslationContext";
import theme from "../../../theme";
import {
  selectFieldByPath,
  selectInstanceCount,
  selectFormValueByPrefix,
} from "../../../store/selectors/formSelectors";
import {
  incrementInstanceCount,
  decrementInstanceCount,
} from "../../../store/slices/instanceCountsSlice";
import { useSelector, useDispatch } from "react-redux";
import { removeIndices } from "../../../utils/removeIndices";
import FormInputSingle from "./FormInputSingle";
import {
  setFieldValue,
  removeFieldValue,
} from "../../../store/slices/formValueSlice";
import { selectMode } from "../../../store/slices/modeSlice";

const FormInputMultiple = ({ valuePath, depth = 0 }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();

  const mode = useSelector(selectMode);
  const readOnly = mode === "view";
  // console.log("mode:", mode, "| readOnly:", readOnly);

  const fieldPath = removeIndices(valuePath);
  const field = useSelector(selectFieldByPath(fieldPath));
  const instanceCount = useSelector(selectInstanceCount(fieldPath)) || 0;
  const fieldValues = useSelector(selectFormValueByPrefix(fieldPath)) || [];

  const handleDelete = useCallback(
    (indexToDelete) => {
      // 1. Shift all values after indexToDelete down by one
      for (let i = indexToDelete + 1; i < instanceCount; i++) {
        const fromKey = `${fieldPath}[${i}]`;
        const toKey = `${fieldPath}[${i - 1}]`;
        const fromValue = fieldValues[fromKey];
        if (fromValue !== undefined && fromValue !== null && fromValue !== "") {
          dispatch(setFieldValue({ path: toKey, value: fromValue }));
        } else {
          // If there was nothing at fromKey, clear toKey
          dispatch(removeFieldValue(toKey));
        }
      }
      // 2. Remove the last (now duplicated) entry
      if (instanceCount > 0) {
        const lastKey = `${fieldPath}[${instanceCount - 1}]`;
        dispatch(removeFieldValue(lastKey));
      }
      // 3. Decrement instanceCount
      dispatch(decrementInstanceCount(fieldPath));
    },
    [dispatch, fieldPath, fieldValues, instanceCount],
  );

  if (!field) return null;

  // Extract just the first `instanceCount` values by parsing indices from keys
  const existingValues = Array.from({ length: instanceCount }).map(
    (_, index) => {
      const key = `${fieldPath}[${index}]`;
      return fieldValues[key];
    },
  );

  // Check if any existing instance is empty
  const hasEmptyEntries = existingValues.some(
    (value) => !value || value.trim() === "",
  );

  const handleAdd = () => {
    // Promote the current "nextValuePath" to a real instance
    dispatch(incrementInstanceCount(fieldPath));
  };

  const { name, label } = field;

  return (
    <Box sx={{ mt: 0, mb: 2, width: "100%" }}>
      {/* All instances */}
      {Array.from({ length: instanceCount }).map((_, index) => {
        const instancePath = `${fieldPath}[${index}]`;
        return (
          <Box
            key={instancePath}
            sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}
          >
            <Box sx={{ flex: 1, mb: "0px" }}>
              <FormInputSingle valuePath={instancePath} depth={depth} />
            </Box>
            {!readOnly && (
              <IconButton
                size="small"
                onClick={() => handleDelete(index)}
                sx={{ color: "error.main" }}
              >
                <DeleteIcon fontSize="medium" />
              </IconButton>
            )}
          </Box>
        );
      })}

      {/* Add button */}
      {!readOnly && (
        <Button
          disabled={readOnly || hasEmptyEntries}
          sx={{
            color: theme.primaryColor,
            borderColor: theme.primaryColor,
            "&:hover": {
              borderColor: theme.primaryColor,
              backgroundColor: theme.backgroundColor,
            },
            mt: 1.5,
          }}
          variant="outlined"
          onClick={handleAdd}
          startIcon={<AddIcon />}
        >
          {t("forminputmultiple.add")} {label || name}
        </Button>
      )}

      {/* Show "no data" message in readOnly mode when empty */}
      {readOnly && instanceCount === 0 && fieldValues.length === 0 && (
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
      )}
    </Box>
  );
};

export default FormInputMultiple;
