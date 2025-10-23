// This component receives the array of nested fields (`children`), `label`, `name`, 
// currrent `path`, current `depth`, and `renderInput` function as props.
// It renders a header for the group


import React from "react";
import { Box, Typography } from "@mui/material";


const FormInputGroup = ({ 
  children, 
  label,
  name, 
  path, 
  depth = 0, 
  renderInput, 
  required,
  readOnly
}) => {
  return (
    <Box>
      <Typography variant={depth === 0 ? "h6" : "h8"} gutterBottom>
        {label || name}
        {/* Show asterisk only if group itself is required, otherwise nothing */}
        {required && (
          !readOnly && (
            <span style={{ color: "red", marginLeft: 4 }}>*</span>
          )
        )}
      </Typography>
      {children.map((child) =>
        renderInput(
          {
            ...child,
            path: path ? `${path}.${child.name}` : child.name,
          },
          depth + 1,
          child.name
        )
      )}
    </Box>
  );
};


export default FormInputGroup;