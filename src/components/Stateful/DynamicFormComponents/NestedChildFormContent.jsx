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
import { removeFieldValue } from "../../../store/slices/formValueSlice";
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

  const prevFieldValuesRef = useRef();

  useEffect(() => {
    if (isEdit) return;

    // Snapshot on mount
    prevFieldValuesRef.current = { ...fieldValues };

    // Cleanup on unmount
    return () => {
      if (!prevFieldValuesRef.current) return;

      const newKeys = Object.keys(fieldValues || {}).filter(
        (key) =>
          key.startsWith(nextValuePath) &&
          !Object.prototype.hasOwnProperty.call(
            prevFieldValuesRef.current,
            key,
          ),
      );

      newKeys.forEach((key) => dispatch(removeFieldValue(key)));
      prevFieldValuesRef.current = undefined;
    };
  }, [isEdit, fieldValues, nextValuePath, dispatch]);

  const handleSave = () => {
    if (!isPopupValid) return;

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
