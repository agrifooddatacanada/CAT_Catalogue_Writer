import React, { useEffect, useMemo, useRef } from "react";
import { useTranslation } from "../../../utils/OpenAIRE/TranslationContext";
import { Button, Box } from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import { useDispatch, useSelector } from "react-redux";
import FieldChecker from "./FieldChecker";
import { removeIndices } from "../../../utils/removeIndices";
import { incrementInstanceCount } from "../../../store/slices/instanceCountsSlice";
import {
  selectFieldByPath,
  selectFormState,
} from "../../../store/selectors/formSelectors";
import theme from "../../../theme";
import { removeFieldValue, setFieldValue } from "../../../store/slices/formValueSlice";
import { makeSelectIsPopupValid } from "../../../store/selectors/popupValidationSelectors";

const NestedChildFormContent = ({
  nextValuePath,
  isOpen = true,
  onClose,
  isEdit = false,
}) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();

  const fieldPath = removeIndices(nextValuePath);
  const field = useSelector(selectFieldByPath(fieldPath));
  const fieldValues = useSelector(selectFormState);

  const isPopupValid = useSelector(
    useMemo(() => makeSelectIsPopupValid(nextValuePath), [nextValuePath]),
  );

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
    if (!isPopupValid) return;

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

  return (
    <Box>
      {/* <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
        <span>Add {field.label}</span>
        {onClose && (
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        )}
      </Box> */}

      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
        {field.children?.map((child) => {
          const childPath = `${nextValuePath}.${child.name}`;
          return (
            <FieldChecker key={childPath} valuePath={childPath} depth={1} />
          );
        })}
      </Box>

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
          disabled={!isPopupValid}
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
