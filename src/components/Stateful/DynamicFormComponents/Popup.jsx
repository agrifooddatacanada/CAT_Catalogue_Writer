import React, { useEffect, useMemo, useRef } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  useMediaQuery,
  IconButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
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

const Popup = ({ nextValuePath, open, onClose }) => {
  const dispatch = useDispatch();
  const fullScreen = useMediaQuery("(max-width:600px)");
  const fieldPath = removeIndices(nextValuePath);
  const field = useSelector(selectFieldByPath(fieldPath));
  const fieldValues = useSelector(selectFormState);

  // Popup-level validity derived from Redux
  const isPopupValid = useSelector(
    useMemo(() => makeSelectIsPopupValid(nextValuePath), [nextValuePath]),
  );

  // Capture snapshot on mount, clear on unmount
  const prevFieldValuesRef = useRef();

  useEffect(() => {
    if (open) {
      // Popup just opened: snapshot current values
      prevFieldValuesRef.current = { ...fieldValues };
    } else if (prevFieldValuesRef.current) {
      // Popup just closed: remove only keys created while it was open
      const newKeys = Object.keys(fieldValues || {}).filter(
        (key) =>
          key.startsWith(nextValuePath) &&
          !Object.prototype.hasOwnProperty.call(
            prevFieldValuesRef.current,
            key,
          ),
      );

      newKeys.forEach((key) => dispatch(removeFieldValue(key)));

      // Optional: clear snapshot so first render with open=false does nothing
      prevFieldValuesRef.current = undefined;
    }
  }, [open, nextValuePath, dispatch]); // intentionally NOT including `fieldValues`

  const handleSave = () => {
    if (!isPopupValid) return; // runtime guard

    // Extract the prefixPath that owns this instance (parent of leaf)
    const prefixPath = nextValuePath.substring(
      0,
      nextValuePath.lastIndexOf("["),
    );
    // Just increment count - FieldChecker handles saving via Redux
    dispatch(incrementInstanceCount(prefixPath));
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen={fullScreen}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between" }}>
        <span>Add {field.label}</span>
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 3, maxHeight: "70vh", overflow: "auto" }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
          {field.children?.map((child, idx) => {
            const childPath = `${nextValuePath}.${child.name}`;
            return (
              <FieldChecker key={childPath} valuePath={childPath} depth={1} />
            );
          })}
        </Box>
      </DialogContent>

      <DialogActions
        sx={{
          display: "flex",
          justifyContent: "flex-end",
          gap: 1,
          my: 1,
          mx: 1,
        }}
      >
        <Button color="error" onClick={onClose}>
          Cancel
        </Button>
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
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default Popup;
