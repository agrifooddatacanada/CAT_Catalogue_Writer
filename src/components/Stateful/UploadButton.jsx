// UploadButton.jsx
import React, { useState } from "react";
import { Button } from "@mui/material";

export default function UploadButton({ onFileSelect }) {
  const [dragOver, setDragOver] = useState(false);

  const handleFileChange = (event) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      onFileSelect(files);
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
      event.dataTransfer.clearData();
    }
  };

  return (
    <Button
      component="label"
      role={undefined}
      variant="contained"
      tabIndex={-1}
      sx={{
        width: "85%",
        height: "100px",
        padding: {
          xs: "50px",
          md: "50px",
          lg: "30px",
          xl: "30px",
        },
        textAlign: "center",
        border: "1px solid black",
        borderRadius: "4px",
        margin: "20px auto",
        backgroundColor: dragOver
          ? "rgba(160, 220, 140, 0.7)"
          : "rgba(185, 190, 185, 1)",
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
    >
      Upload a previous Catalogue file (.json) Or drag and drop one
      <input type="file" accept=".json" hidden onChange={handleFileChange} />
    </Button>
  );
}
