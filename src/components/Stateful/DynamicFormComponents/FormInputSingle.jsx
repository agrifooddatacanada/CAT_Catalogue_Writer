import React from "react";
import {
  TextField,
  Chip,
  Box,
  Select,
  MenuItem,
  FormControl,
  FormHelperText,
  Typography,
} from "@mui/material";

const FormInputSingle = ({
  name,
  label,
  type,
  multiple,
  categories,
  path,
  value,
  error,
  onChange,
  required,
  depth = 0,
}) => {
  const errorProps = error ? { error: true, helperText: error } : {};

  return (
    <Box sx={{ mb: 2 }}>
      <Typography
        variant={depth === 0 ? "h6" : "h8"}
        component="label"
        sx={{ mb: 0.5, display: "block" }}
      >
        {label || name}
      </Typography>

      {categories && categories.length > 0 ? (
        <FormControl fullWidth {...errorProps}>
          <Select
            value={value}
            onChange={(e) => onChange(path, e.target.value)}
            multiple={multiple}
            renderValue={(selected) =>
              multiple ? (
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                  {selected.map((val) => (
                    <Chip key={val} label={val} />
                  ))}
                </Box>
              ) : (
                selected || <em>None</em>
              )
            }
          >
            {!required && (
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
            )}
            {categories.map((option) => {
              const code = option.split(" ")[0];
              return (
                <MenuItem key={code} value={code}>
                  {option}
                </MenuItem>
              );
            })}
          </Select>
          {error && <FormHelperText>{error}</FormHelperText>}
        </FormControl>
      ) : type === "DateTime" ? (
        <TextField
          type="date"
          fullWidth
          value={value}
          onChange={(e) => onChange(path, e.target.value)}
          InputLabelProps={{ shrink: true }}
          {...errorProps}
        />
      ) : (
        <TextField
          fullWidth
          value={value}
          onChange={(e) => onChange(path, e.target.value)}
          {...errorProps}
        />
      )}
    </Box>
  );
};

export default FormInputSingle;
