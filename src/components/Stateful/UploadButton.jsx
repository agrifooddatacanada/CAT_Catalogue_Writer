// UploadButton.jsx
import React, { useState } from "react";
import FileUploadIcon from '@mui/icons-material/FileUpload';
import FileDownloadDoneIcon from '@mui/icons-material/FileDownloadDone';
import Button from '@mui/material/Button';
import theme from "../../theme";

export default function UploadButton({ onFileSelect, upload_file, disabled }) {
  const [dragOver, setDragOver] = useState(false);

  const [isUploaded, setIsUploaded] = useState(false);

  const handleFileChange = (event) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      onFileSelect(files);
      setIsUploaded(true);
    }
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
      onFileSelect(files);
      setIsUploaded(true);
      event.dataTransfer.clearData();
    }
  };

  return (
    <Button
      component="label"
      role={undefined}
      variant="contained"
      disabled={disabled}
      tabIndex={-1}
      sx={{
        width: "85%",
        height: "100px",
        padding: {
          xs: "35px",
          md: "30px",
          lg: "25px",
          xl: "20px",
        },
        textAlign: "center",
        //border: "1px solid black",
        borderRadius: "4px",
        margin: "20px auto",
        backgroundColor: dragOver
          ? theme.hoverUnselectedBgColor
          : "rgba(185, 190, 185, 1)",
        '&:hover': {
          backgroundColor: theme.hoverUnselectedBgColor
        },
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        fontWeight: "500",
        fontSize: "16px",
        lineHeight: 1.25,
        boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.2)",
        color: "black",
        textTransform: "none",
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      startIcon={isUploaded ? <FileDownloadDoneIcon /> : <FileUploadIcon />}
    >
      {upload_file}
      <input type="file" accept=".json" hidden onChange={handleFileChange} />
    </Button>
  );
}
