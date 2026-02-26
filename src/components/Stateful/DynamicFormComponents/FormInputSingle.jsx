import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  TextField,
  Chip,
  Box,
  Select,
  MenuItem,
  FormControl,
  Typography,
  Link,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { useTranslation } from "../../../utils/OpenAIRE/TranslationContext";
import theme from "../../../theme";
import { useDispatch, useSelector } from "react-redux";
import { setFieldValue } from "../../../store/slices/formValueSlice";
import {
  selectDepFormatPatterns,
  selectFieldByPath,
  selectFieldValue,
  selectFormatPatterns,
} from "../../../store/selectors/formSelectors";
import { removeIndices } from "../../../utils/removeIndices";
import { getValidationError } from "../../../utils/validationUtils";
import { selectMode } from "../../../store/slices/modeSlice";

const FormInputSingle = ({ valuePath, depth = 0 }) => {
  const { t } = useTranslation(); // use translation function
  const dispatch = useDispatch();

  const fieldPath = removeIndices(valuePath);
  const field = useSelector(selectFieldByPath(fieldPath));
  const value = useSelector(selectFieldValue(valuePath)) || "";
  const formatPatterns = useSelector(selectFormatPatterns); // Get format patterns
  const depFormatPatterns = useSelector(selectDepFormatPatterns);

  const mode = useSelector(selectMode);
  const readOnly = mode === "view";
  // console.log("mode:", mode, "| readOnly:", readOnly);

  const [touched, setTouched] = useState(false);

  const {
    name,
    label,
    placeholder,
    description,
    type,
    required,
    multiple,
    categories,
  } = field;

  const validationError = useMemo(
    () =>
      getValidationError({
        field,
        fieldPath,
        value,
        readOnly,
        formatPatterns,
        depFormatPatterns,
      }),
    [field, fieldPath, value, readOnly, formatPatterns, depFormatPatterns],
  );

  // Only show error text after the field has been touched
  const showError = touched && !!validationError;

  const errorProps = showError
    ? { error: true, helperText: validationError }
    : {};

  const lines = 2;

  const [expanded, setExpanded] = useState(false);
  const [isClamped, setIsClamped] = useState(false);
  const descriptionRef = useRef(null);

  const handleBlur = () => {
    if (!touched) setTouched(true);
  };

  // CHANGE HANDLER
  const onChange = (path, newValue) => {
    dispatch(setFieldValue({ path, value: newValue }));
  };

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
    <Box>
      {!multiple && (
        <Box sx={readOnly ? { mt: 1 } : { mt: depth === 0 ? 3 : 1 }}>
          <Typography
            variant={depth === 0 ? "h6" : "h7"}
            component="label"
            sx={{ display: "block" }}
          >
            {label || name}
            {required && !readOnly && (
              <span style={{ color: "red", marginLeft: 4 }}>*</span>
            )}
          </Typography>
        </Box>
      )}

      {!readOnly && (
        <Box sx={{ position: "relative", mb: 0.5 }}>
          <Typography
            ref={descriptionRef}
            component="div"
            sx={{
              color: theme.descriptionColor,
              pr: isClamped && !expanded ? 12 : 0,
              ...clampSx,
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
                  // fade so the button blends over truncated text
                  background: theme.linearGradient,
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
        readOnly && value.length === 0 ? (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              pl: 1.5,
              fontStyle: "italic",
              color: theme.descriptionColor,
              py: 1.5,
            }}
          >
            {t("no_data")} {label || name}
          </Box>
        ) : (
          <FormControl fullWidth {...errorProps}>
            <Select
              disabled={readOnly}
              sx={
                readOnly
                  ? {
                      "& .MuiOutlinedInput-notchedOutline": {
                        borderColor: "white", // border color always white
                      },
                      "&:hover .MuiOutlinedInput-notchedOutline": {
                        borderColor: "white", // prevent hover changing border color
                      },
                      "&.Mui-disabled .MuiOutlinedInput-notchedOutline": {
                        borderColor: "white", // disabled state border color white
                      },
                      "& .MuiSelect-select.Mui-disabled": {
                        WebkitTextFillColor: "black", // disabled text color
                      },
                    }
                  : {}
              }
              value={value}
              displayEmpty
              onChange={(e) => onChange(valuePath, e.target.value)}
              onBlur={handleBlur}
              {...errorProps}
              multiple={multiple}
              renderValue={(selected) =>
                multiple ? (
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                    {selected.map((val) => (
                      <Chip key={val} label={val} />
                    ))}
                  </Box>
                ) : (
                  selected || (
                    <em>
                      {t("forminputsingle.select")} {label}
                    </em>
                  )
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
            {/* {errorProps && (
              <FormHelperText error>{validationError}</FormHelperText>
            )} */}
          </FormControl>
        )
      ) : type.includes("DateTime") ? (
        readOnly && value.length === 0 ? (
          <Box
            sx={{
              display: "inline-block",
              paddingLeft: "14px",
              paddingTop: "16.5px",
              paddingBottom: "16.5px",
              fontStyle: "italic",
              color: theme.descriptionColor,
            }}
          >
            {t("no_data")} {label || name}
          </Box>
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
          />
        ) : (
          // Show interactive DatePicker when not readOnly
          <LocalizationProvider
            dateAdapter={AdapterDateFns}
            localeText={{
              fieldDayPlaceholder: () => "DD",
              fieldMonthPlaceholder: () => "MM",
              fieldYearPlaceholder: () => "YYYY",
            }}
          >
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
                          // Handle both yyyy-MM-dd AND dd-MM-yyyy
                          const year =
                            parts[0].length === 4 ? parts[0] : parts[2];
                          const month =
                            parts[1].length === 2
                              ? Number(parts[1]) - 1
                              : Number(parts[0]) - 1;
                          const day =
                            parts[1].length === 2
                              ? Number(parts[2])
                              : Number(parts[1]);
                          return new Date(year, month, day);
                        }
                        return new Date(value); // fallback
                      })()
                  : null
              }
              onChange={(date) => {
                if (date) {
                  if (placeholder === "YYYY") {
                    onChange(valuePath, date.getFullYear().toString());
                  } else {
                    // Store in yyyy-MM-dd format
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, "0");
                    const day = String(date.getDate()).padStart(2, "0");
                    onChange(valuePath, `${year}-${month}-${day}`);
                  }
                } else {
                  onChange(valuePath, "");
                }
              }}
              onBlur={handleBlur}
              format={placeholder === "YYYY" ? "yyyy" : "MM/dd/yyyy"}
              slotProps={{ field: { error: !!validationError } }}
            />
          </LocalizationProvider>
        )
      ) : readOnly && value.length === 0 ? (
        <Box
          sx={{
            display: "inline-block",
            paddingLeft: "14px",
            paddingTop: "16.5px",
            paddingBottom: "16.5px",
            fontStyle: "italic",
            color: theme.descriptionColor,
          }}
        >
          {t("no_data")} {label || name}
        </Box>
      ) : (
        <TextField
          disabled={readOnly}
          sx={
            readOnly
              ? {
                  "& .MuiOutlinedInput-root": {
                    "& fieldset": {
                      borderColor: "white", // border color always white
                    },
                    "&:hover fieldset": {
                      borderColor: "white", // prevent hover changing border color
                    },
                    "&.Mui-disabled fieldset": {
                      borderColor: "white", // disabled state border color white
                    },
                  },
                  "& .MuiInputBase-input.Mui-disabled": {
                    WebkitTextFillColor: "black", // disabled text color (adjust as needed)
                  },
                }
              : { mb: 1 }
          }
          fullWidth
          value={value}
          placeholder={placeholder || `${t("forminputsingle.enter")} ${label}`}
          onChange={(e) => onChange(valuePath, e.target.value)}
          onBlur={handleBlur}
          {...errorProps}
        />
      )}
      {/* {validationError && !readOnly && (
        <FormHelperText error>{validationError}</FormHelperText>
      )} */}
    </Box>
  );
};

export default FormInputSingle;
