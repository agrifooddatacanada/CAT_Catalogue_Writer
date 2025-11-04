import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  TextField,
  Chip,
  Box,
  Select,
  MenuItem,
  FormControl,
  FormHelperText,
  Typography,
  Link
} from "@mui/material";
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useTranslation } from "../../../utils/OpenAIRE/TranslationContext";

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
  placeholder,
  description
}) => {

  const { t } = useTranslation();  // use translation function

  const errorProps = error ? { error: true, helperText: error } : {};
  const lines = 2;

  const [expanded, setExpanded] = useState(false);
  const [isClamped, setIsClamped] = useState(false);
  const descriptionRef = useRef(null);

  // Function to check if text is clamped
  const checkIfClamped = useCallback(() => {
    if (descriptionRef.current && description) {
      const element = descriptionRef.current;
      setIsClamped(element.scrollHeight > element.clientHeight);
    }
  }, [description]);

  // Check on mount and when description changes
  useEffect(() => {
    checkIfClamped();
    setExpanded(false);
  }, [description, checkIfClamped]);

  // Use ResizeObserver to detect when the element's size changes (including window resize)
  useEffect(() => {
    if (!descriptionRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      checkIfClamped();
    });

    resizeObserver.observe(descriptionRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [checkIfClamped]);

  // Check if text is clamped (overflows 2 lines)
  useEffect(() => {
    if (descriptionRef.current && description) {
      const element = descriptionRef.current;
      setIsClamped(element.scrollHeight > element.clientHeight);
    }
  }, [description]);

  const clampSx = expanded
    ? {}
    : {
      display: "-webkit-box",
      WebkitBoxOrient: "vertical",
      WebkitLineClamp: lines,
      overflow: "hidden",
      textOverflow: "ellipsis",
    };
  
  return (
    <Box sx={{ mb: 2 }}>
      <Typography
        variant={depth === 0 ? "h6" : "h7"}
        component="label"
        sx={{ display: "block" }}
      >
        {label || name}
        {required && (
          !readOnly && (
            <span style={{ color: "red", marginLeft: 4 }}>*</span>
          )
        )}
      </Typography>
      {!readOnly && (
        <Box sx={{ position: "relative", mb: 0.5 }}>
          <Typography
            ref={descriptionRef}
            component="p"
            sx={{ 
              //mb: 0.5, 
              //display: "block", 
              color: "rgba(150, 150, 150, 1)",
              pr: isClamped && !expanded ? 12 : 0,
              ...clampSx
            }}
          >
            {description}
            {isClamped && !expanded && (
              <Box
                sx={{
                  position: "absolute",
                  right: 0,
                  bottom: 0,
                  display: "flex",
                  alignItems: "center",
                  pl: 2,
                  // optional fade so the button blends over truncated text
                  background:
                    "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,1) 24%)",
                }}
              >
                <Link
                  component="button"
                  type="button"
                  onClick={() => setExpanded((v) => !v)}
                  underline="none"
                >
                  {t("forminputsingle.show_more")}
                </Link>
              </Box>
            )}
            {!isClamped && expanded && (
              <Box>
                <Link
                  component="button"
                  type="button"
                  onClick={() => setExpanded((v) => !v)}
                  underline="none"
                >
                  {t("forminputsingle.show_less")}
                </Link>
              </Box>
            )}
          </Typography>          
        </Box>
      )}
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
            {t("no_data")} {label || name}
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
                  selected || <em>{t("forminputsingle.select")} {label}</em>
                )
              }
            >
              {!required && (
                <MenuItem value="">
                  <em>{t("forminputsingle.none")}</em>
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
            {t("no_data")} {label || name}
          </span>
        ) : readOnly ? (
          // Show formatted date text in readOnly mode instead of DatePicker
          <TextField
            disabled
            fullWidth
            value={value}
            placeholder={placeholder || `Enter ${label}`}
            sx={{
              "& .MuiOutlinedInput-root": {
                "& fieldset": {
                  borderColor: "white",
                },
                "&:hover fieldset": {
                  borderColor: "white",
                },
                "&.Mui-disabled fieldset": {
                  borderColor: "white",
                },
              },
              "& .MuiInputBase-input.Mui-disabled": {
                WebkitTextFillColor: "black",
                color: "black",
              },
            }}
            {...errorProps}
          />
        ) : (
          // Show interactive DatePicker when not readOnly
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DatePicker
              views={placeholder === "YYYY" ? ["year"] : undefined}
              value={
                value
                  ? placeholder === "YYYY"
                    ? new Date(Number(value), 0, 1)
                    : (() => {
                      // Parse yyyy-MM-dd as local date to avoid timezone shift
                      const parts = value.split("-");
                      if (parts.length === 3) {
                        return new Date(
                          Number(parts[0]),
                          Number(parts[1]) - 1,
                          Number(parts[2])
                        );
                      }
                      return new Date(value); // fallback
                    })()
                  : null
              }
              // onChange={(e) => onChange(path, e.target.value)}
              onChange={(date) => {
                if (date) {
                  if (placeholder === "YYYY") {
                    onChange(path, date.getFullYear().toString());
                  } else {
                    // Store in yyyy-MM-dd format
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, "0");
                    const day = String(date.getDate()).padStart(2, "0");
                    onChange(path, `${year}-${month}-${day}`);
                  }
                } else {
                  onChange(path, "");
                }
              }}
              inputFormat={placeholder === "YYYY" ? "yyyy" : "yyyy-MM-dd"}
              renderInput={(params) => (
                <TextField
                  {...params}
                  //fullWidth
                  {...errorProps}
                />
              )}
            />
          </LocalizationProvider>
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
            {t("no_data")} {label || name}
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
            placeholder={placeholder || `${t("forminputsingle.enter")} ${label}`}
            onChange={(e) => onChange(path, e.target.value)}
            {...errorProps}
          />
        )
      )}
    </Box>
  );
};

export default FormInputSingle;
