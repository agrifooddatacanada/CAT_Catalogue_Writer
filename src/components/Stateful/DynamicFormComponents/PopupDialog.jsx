// This component isolates the popup dialog UI and buttons while keeping state and logic
// in the main component

import React from "react";
import {
  Dialog,
  Box,
  Typography,
  //TextField,
  Button,
  IconButton,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import CloseIcon from "@mui/icons-material/Close";
import { useTranslation } from "../../../utils/OpenAIRE/TranslationContext";
import theme from "../../../theme";

const PopupDialog = ({
  open, // Boolean for dialog visibility from `dialogOpen`
  onClose, // Function to close dialog [ () => setDialogOpen(null) ]
  matches, // Media query result for fullScreen mode
  popupField, // Currently open popup field schema
  popupValue, // Form values inside popup
  setPopupValue, // Setter for popup values
  popupErrors, // Validation errors in popup
  handlePopupSave, // Save handler for popup
  isPopupSaveEnabled, // Function that returns boolean to enable/disable Save
  renderInput, // Main input rendering fucntion to render popup fields recursively
}) => {
  console.log("popupErrors:", popupErrors);
  const { t } = useTranslation(); // use translation function
  return (
    <Dialog maxWidth="lg" fullScreen={matches} open={open} onClose={onClose}>
      <Box sx={{ p: 5, minWidth: { sm: 400, md: 500, lg: 600 } }}>
        <Box
          sx={{
            position: "relative",
            mb: 3,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Typography variant="h5" align="center" gutterBottom>
            {`${t("popupdialog.add")} ${popupField?.label || "Entry"}`}
          </Typography>

          <IconButton
            onClick={onClose}
            sx={{
              position: "absolute",
              right: 0,
              top: 0,
              color: "grey.550",
            }}
            aria-label="close"
          >
            <CloseIcon />
          </IconButton>
        </Box>

        {popupField && popupField.children?.length > 0
          ? popupField.children.map((child) =>
              renderInput(
                {
                  ...child,
                  path: child.name, // relative path inside popupValue object
                },
                0,
                child.name,
                "popup",
                popupErrors
              )
            )
          : popupField // Render with proper type handling
          ? renderInput(
              {
                ...popupField,
                path: popupField.name,
                multiple: false, // Single entry in popup
              },
              0,
              popupField.name,
              "popup",
              popupErrors
            )
          : null}
        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
          <Button color="error" onClick={onClose}>
            {t("popupdialog.cancel")}
          </Button>
          <Button
            variant="contained"
            onClick={handlePopupSave}
            disabled={!isPopupSaveEnabled()} // Disable if invalid
            sx={{
              backgroundColor: theme.primaryColor,
              "&:hover": {
                backgroundColor: theme.primaryColor,
              },
            }}
            startIcon={<SaveIcon />}
          >
            {t("popupdialog.save")}
          </Button>
        </Box>
      </Box>
    </Dialog>
  );
};

export default PopupDialog;
