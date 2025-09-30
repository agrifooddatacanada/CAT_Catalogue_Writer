import React from "react";
import { Box, Typography, Button } from "@mui/material";

const FormInputMultiple = ({
  label,
  name,
  path,
  children,
  multiple,
  value = [], // Array of entries for this field
  setPopupValue, // Handler from DynamicForm to control popup editing
  setEditingIndex, // Handler from DynamicForm to control popup editing
  setDialogOpen, // Handler from DynamicForm to control popup editing
  handleItemDelete, // Function to delete an entry in parent state
  depth = 0, // For styling
}) => {
  const columns =
    children && children.length > 0
      ? children.map((child) => child.name)
      : value.length > 0
      ? Object.keys(value[0])
      : [];

  // Build map from attribute name to label for table header
  const labelMap = children?.reduce((acc, child) => {
    acc[child.name] = child.label || child.name;
    return acc;
  }, {}) || {};

  const formatValue = (val) => {
    if (val === null || val === undefined) return "";
    if (typeof val === "object") return JSON.stringify(val, null, 2);
    return val;
  };

  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant={depth === 0 ? "h6" : "h8"}>{label || name}</Typography>

      {/* Table showing existing entries */}
      {value.length > 0 && (
        <Box sx={{ overflowX: "auto", mb: 2 }}>
          <table style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead>
              <tr>
                {columns.map((col) => (
                  <th
                    key={col}
                    style={{
                      border: "1px solid #ccc",
                      padding: "8px",
                      textAlign: "left",
                      backgroundColor: "#eee",
                    }}
                  >
                    {labelMap[col] || col}
                  </th>
                ))}
                <th
                  style={{
                    border: "1px solid #ccc",
                    padding: "8px",
                    textAlign: "center",
                    backgroundColor: "#eee",
                  }}
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {value.map((entry, idx) => (
                <tr key={idx} style={{ borderBottom: "1px solid #ddd" }}>
                  {columns.map((col) => (
                    <td
                      key={col}
                      style={{
                        border: "1px solid #ccc",
                        padding: "8px",
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {formatValue(entry[col])}
                    </td>
                  ))}
                  <td
                    style={{
                      border: "1px solid #ccc",
                      padding: "8px",
                      textAlign: "center",
                    }}
                  >
                    <Button
                      size="small"
                      onClick={() => {
                        // Use deep copy to avoid mutation side-effects
                        const entryCopy = JSON.parse(JSON.stringify(value[idx]));
                        setPopupValue(entryCopy);
                        setEditingIndex(idx);
                        setDialogOpen(path);
                      }}
                      sx={{ mr: 1 }}
                    >
                      Edit
                    </Button>
                    <Button
                      size="small"
                      color="error"
                      onClick={() => handleItemDelete(path, idx)}
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Box>
      )}

      <Button
        sx={{
          color: "rgba(70, 160, 35, 1)",
          borderColor: "rgba(70, 160, 35, 1)",
        }}
        variant="outlined"
        onClick={() => {
          setPopupValue(multiple ? {} : "");
          setEditingIndex(null);
          setDialogOpen(path);
        }}
      >
        Add {label || name}
      </Button>
    </Box>
  );
};

export default FormInputMultiple;
