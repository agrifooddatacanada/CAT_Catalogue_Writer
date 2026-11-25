import React, { useCallback, useMemo } from "react";
import { Box, Button, IconButton } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import { useTranslation } from "../../../utils/OpenAIRE/TranslationContext";
import theme from "../../../theme";
import {
  selectFieldByPath,
  selectInstanceCount,
  makeSelectFormValueByPrefix,
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

  // Use stripped fieldPath ONLY for schema lookup; keep indexed valuePath for values & counts
  const fieldPath = removeIndices(valuePath);
  const field = useSelector(selectFieldByPath(fieldPath));
  const instanceCount = useSelector(selectInstanceCount(valuePath)) || 0;
  const selectPrefixedValues = useMemo(
    () => makeSelectFormValueByPrefix(valuePath),
    [valuePath],
  );
  const fieldValues = useSelector(selectPrefixedValues);

  const handleDelete = useCallback(
    (indexToDelete) => {
      for (let i = indexToDelete + 1; i < instanceCount; i++) {
        const fromKey = `${valuePath}[${i}]`;
        const toKey = `${valuePath}[${i - 1}]`;
        const fromValue = fieldValues[fromKey];
        if (fromValue !== undefined && fromValue !== null && fromValue !== "") {
          dispatch(setFieldValue({ path: toKey, value: fromValue }));
        } else {
          dispatch(removeFieldValue(toKey));
        }
      }
      if (instanceCount > 0) {
        const lastKey = `${valuePath}[${instanceCount - 1}]`;
        dispatch(removeFieldValue(lastKey));
      }
      dispatch(decrementInstanceCount(valuePath));
    },
    [dispatch, valuePath, fieldValues, instanceCount],
  );

  if (!field) return null;

  const existingValues = Array.from({ length: instanceCount }).map(
    (_, index) => fieldValues[`${valuePath}[${index}]`],
  );

  const hasEmptyEntries = existingValues.some(
    (value) => value === undefined || value === null || String(value).trim() === "",
  );

  const handleAdd = () => {
    dispatch(incrementInstanceCount(valuePath));
  };

  const { name, label } = field;
  const displayName = label || name;

  return (
    <Box sx={{ mt: 0, mb: 2, width: "100%" }}>
      {Array.from({ length: instanceCount }).map((_, index) => {
        const instancePath = `${valuePath}[${index}]`;
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
                aria-label={t("forminputmultiple.remove_item_aria")
                  .replace("{{name}}", displayName)
                  .replace("{{index}}", String(index + 1))}
                onClick={() => handleDelete(index)}
                sx={{ color: "error.main" }}
              >
                <DeleteIcon fontSize="medium" />
              </IconButton>
            )}
          </Box>
        );
      })}

      {!readOnly && (
        <Button
          disabled={readOnly || hasEmptyEntries}
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
          onClick={handleAdd}
          startIcon={<AddIcon />}
        >
          {t("forminputmultiple.add")} {displayName}
        </Button>
      )}

      {readOnly && instanceCount === 0 && existingValues.length === 0 && (
        <span
          style={{
            display: "inline-block",
            paddingLeft: "14px",
            paddingTop: "16.5px",
            paddingBottom: "16.5px",
            fontStyle: "italic",
            color: theme.descriptionColor,
          }}
        >
          {t("no_data")} {displayName}
        </span>
      )}
    </Box>
  );
};

export default FormInputMultiple;
