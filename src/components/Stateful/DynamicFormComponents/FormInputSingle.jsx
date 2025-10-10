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
  readOnly,
  placeholder
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
        {required && (
          <span style={{ color: "red", marginLeft: 4 }}>*</span>
        )}
      </Typography>

      {categories && categories.length > 0 ? (
        (readOnly && value.length === 0)? (
          <span 
            style={{ 
              display: "inline-block",
              paddingLeft: "14px",
              paddingTop: "16.5px",
              paddingBottom: "16.5px",
              fontStyle: "italic", 
              color:"rgba(100, 100, 100, 1)" 
            }}
          >
            No data exist for {label || name}
          </span>
        ) : (
          <FormControl fullWidth {...errorProps}>
            <Select
              disabled={readOnly}
              sx={readOnly ? {
                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor: "white",       // border color always white
                },
                "&:hover .MuiOutlinedInput-notchedOutline": {
                    borderColor: "white",       // prevent hover changing border color
                },
                "&.Mui-disabled .MuiOutlinedInput-notchedOutline": {
                  borderColor: "white",       // disabled state border color white
                },
                "& .MuiSelect-select.Mui-disabled": {
                  WebkitTextFillColor: "black", // disabled text color
                }
              } :{}}
              // slotProps={{
              //   htmlInput:{
              //     readOnly:readOnly
              //   }
              // }}
              value={value}
              displayEmpty
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
                  selected || <em>Select {label}</em>
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
        )
      ) : type === "DateTime" ? (
        (readOnly && value.length === 0)? (
          <span
            style={{ 
              display: "inline-block",
              paddingLeft: "14px",
              paddingTop: "16.5px",
              paddingBottom: "16.5px",
              fontStyle: "italic", 
              color:"rgba(100, 100, 100, 1)" 
            }}
          >
            No data exist for {label || name}
          </span>
        ) : (
          <TextField
            disabled={readOnly}
            sx={readOnly ? {
              "& .MuiOutlinedInput-root": {
                "& fieldset": {
                  borderColor: "white",       // border color always white
                },
                "&:hover fieldset": {
                  borderColor: "white",       // prevent hover changing border color
                },
                "&.Mui-disabled fieldset": {
                  borderColor: "white",       // disabled state border color white
                },
              },
              "& .MuiInputBase-input.Mui-disabled": {
                WebkitTextFillColor: "black", // disabled text color (adjust as needed)
              },
            } : {}}
            type="date"
            fullWidth
            value={value}
            label={placeholder || `Enter ${label}`}
            onChange={(e) => onChange(path, e.target.value)}
            {...errorProps}
          />
        )
      ) : (
        (readOnly && value.length === 0)? (
          <span
            style={{ 
              display: "inline-block",
              paddingLeft: "14px",
              paddingTop: "16.5px",
              paddingBottom: "16.5px",
              fontStyle: "italic", 
              color:"rgba(100, 100, 100, 1)" 
            }}
          >
            No data exist for {label || name}
          </span>
        ) : (
          <TextField
            disabled={readOnly}
            sx={readOnly ? {
              "& .MuiOutlinedInput-root": {
                "& fieldset": {
                  borderColor: "white",       // border color always white
                },
                "&:hover fieldset": {
                  borderColor: "white",       // prevent hover changing border color
                },
                "&.Mui-disabled fieldset": {
                  borderColor: "white",       // disabled state border color white
                },
              },
              "& .MuiInputBase-input.Mui-disabled": {
                WebkitTextFillColor: "black", // disabled text color (adjust as needed)
              },
            } : {}}
            fullWidth
            value={value}
            placeholder={placeholder || `Enter ${label}`}
            onChange={(e) => onChange(path, e.target.value)}
            {...errorProps}
          />
        )
      )}
    </Box>
  );
};

export default FormInputSingle;
