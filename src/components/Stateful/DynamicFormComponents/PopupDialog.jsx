// This component isolates the popup dialog UI and buttons while keeping state and logic 
// in the main component

import React from "react";
import { Dialog, Box, Typography, TextField, Button } from "@mui/material";
import SaveIcon from '@mui/icons-material/Save';
import { useTranslation } from "../../../utils/OpenAIRE/TranslationContext";

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
  const { t } = useTranslation();  // use translation function
  return (
    <Dialog maxWidth="lg" fullScreen={matches} open={open} onClose={onClose}>
      <Box sx={{ p: 5, minWidth: { sm: 400, md: 500, lg: 600 } }}>
        <Typography variant="h5" align="center" gutterBottom>
          {`${t("popupdialog.add")} ${popupField?.label || "Entry"}`}
        </Typography>
        {popupField && popupField.children?.length > 0 ? (
          popupField.children.map((child) =>
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
        ) : (
          <TextField
            autoFocus
            fullWidth
            value={popupValue}
            onChange={(e) => setPopupValue(e.target.value)}
            sx={{ mb: 2 }}
          />
        )}
        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
          <Button sx={{ color: "rgba(70, 160, 35, 1)" }} onClick={onClose}>
            {t("popupdialog.cancel")}
          </Button>
          <Button
            variant="contained"
            onClick={handlePopupSave}
            disabled={!isPopupSaveEnabled()} // Disable if invalid
            sx={{ backgroundColor: "rgba(70, 160, 35, 1)" }}
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
