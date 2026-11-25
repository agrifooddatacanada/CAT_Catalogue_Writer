import React, { useEffect, useRef, useState } from "react";
import FileUploadIcon from "@mui/icons-material/FileUpload";
import FileDownloadDoneIcon from "@mui/icons-material/FileDownloadDone";
import Button from "@mui/material/Button";
import theme from "../../theme";
import { useDispatch, useSelector } from "react-redux";
import { selectIsUploaded } from "../../store/slices/uploadFileSlice";
import { setSchemaName } from "../../store/slices/fieldSchemaSlice";
import { useTranslation } from "../../utils/OpenAIRE/TranslationContext";
import { useNotification } from "../Stateless/NotificationContext";

const MAX_JSON_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

export default function UploadButton({ onFileSelect, upload_file }) {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const { notify } = useNotification();
  const [dragOver, setDragOver] = useState(false);

  const isUploaded = useSelector(selectIsUploaded);
  const fileInputRef = useRef(null);

  // Reset file input when upload is cancelled
  useEffect(() => {
    if (!isUploaded && fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [isUploaded]);

  const validateAndSelect = (files) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    const nameLower = String(file?.name || "").toLowerCase();
    const isJsonMime =
      file?.type === "application/json" ||
      file?.type === "application/ld+json" ||
      file?.type === "";

    if (!nameLower.endsWith(".json") && !isJsonMime) {
      notify(t("homepage.file_select_invalid_type"), "warning");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (file.size > MAX_JSON_FILE_BYTES) {
      notify(t("homepage.file_select_too_large"), "warning");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    dispatch(setSchemaName(""));
    onFileSelect(files);
  };

  const handleFileChange = (event) => {
    validateAndSelect(event.target.files);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragOver(false);
    const files = event.dataTransfer.files;
    if (files && files.length > 0) {
      validateAndSelect(files);
      event.dataTransfer.clearData();
    }
  };

  return (
    <Button
      component="label"
      variant="outlined"
      sx={{
        position: "relative",
        width: "85%",
        minHeight: "100px",
        padding: {
          xs: "24px 16px",
          md: "24px 28px",
        },
        textAlign: "center",
        border: dragOver
          ? `2px solid ${theme.primaryColor}`
          : `2px dashed ${theme.primaryColor}`,
        borderRadius: "8px",
        margin: "20px auto",
        backgroundColor: dragOver
          ? theme.hoverUnselectedBgColor
          : "rgba(255, 255, 255, 0.72)",
        "&:hover": {
          backgroundColor: theme.hoverUnselectedBgColor,
          border: `2px solid ${theme.primaryColor}`,
        },
        "&:focus-within": {
          outline: "3px solid #1976d2",
          outlineOffset: "2px",
        },
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        fontWeight: "500",
        fontSize: "16px",
        lineHeight: 1.35,
        boxShadow: dragOver
          ? "0px 4px 12px rgba(0, 0, 0, 0.12)"
          : "0px 1px 3px rgba(0, 0, 0, 0.08)",
        color: "black",
        textTransform: "none",
        transition: "background-color 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease",
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      startIcon={isUploaded ? <FileDownloadDoneIcon /> : <FileUploadIcon />}
    >
      {upload_file}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json,application/ld+json"
        onChange={handleFileChange}
        style={{
          position: "absolute",
          width: "1px",
          height: "1px",
          padding: 0,
          margin: "-1px",
          overflow: "hidden",
          clip: "rect(0, 0, 0, 0)",
          whiteSpace: "nowrap",
          border: 0,
        }}
      />
    </Button>
  );
}
