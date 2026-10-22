import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  FormControl,
  FormControlLabel,
  FormGroup,
  // Link,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  TextareaAutosize,
  Typography,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import SyncIcon from "@mui/icons-material/Sync";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { selectUserContext } from "../../../store/slices/userContextSlice";
import {
  checkDuplicateContributorOrcid,
  extractCleanOrcid,
  fetchOrcidPersonName,
  findSiblingNameFieldKey,
  isQualifiedAttributionOrcidField,
  isValidOrcid,
} from "../../../utils/orcidUtils";
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
  selectFormState,
  selectFormValueByPrefix,
  selectInstanceCount,
} from "../../../store/selectors/formSelectors";
import { removeIndices } from "../../../utils/removeIndices";
import { getValidationError, getMaxLengthFromPattern } from "../../../utils/validationUtils";
import { selectMode } from "../../../store/slices/modeSlice";
import {
  incrementInstanceCount,
  decrementInstanceCount,
} from "../../../store/slices/instanceCountsSlice";
import { removeFieldValue } from "../../../store/slices/formValueSlice";
import FieldDescription from "./FieldDescription";

const FormInputSingle = ({ valuePath, depth = 0 }) => {
  const { t } = useTranslation(); // use translation function
  const dispatch = useDispatch();

  const fieldPath = removeIndices(valuePath);
  const field = useSelector(selectFieldByPath(fieldPath));

  const {
    name,
    label,
    placeholder,
    description,
    type,
    options,
    required,
    multiple,
    categories,
  } = field;

  const instanceCount = useSelector(selectInstanceCount(valuePath)) || 0;
  const fieldValues = useSelector(selectFormValueByPrefix(valuePath));

  // Compute existing values (same exact logic)
  const existingValues = Array.from({ length: instanceCount }).map(
    (_, index) => {
      const key = `${valuePath}[${index}]`;
      return fieldValues[key];
    },
  );

  const handleDelete = useCallback(
    (indexToDelete) => {
      // EXACT SAME LOGIC as FormInputMultiple
      for (let i = indexToDelete + 1; i < instanceCount; i++) {
        const fromKey = `${valuePath}[${i}]`;
        const toKey = `${valuePath}[${i - 1}]`;
        const fromValue = fieldValues[fromKey];
        if (fromValue !== undefined && fromValue !== null && fromValue !== "") {
          dispatch(setFieldValue({ path: toKey, value: fromValue }));
        } else {
          dispatch(removeFieldValue(toKey));
        }
      }
      if (instanceCount > 0) {
        const lastKey = `${valuePath}[${instanceCount - 1}]`;
        dispatch(removeFieldValue(lastKey));
      }
      dispatch(decrementInstanceCount(valuePath));
    },
    [dispatch, valuePath, fieldValues, instanceCount],
  );

  // const value = useSelector(selectFieldValue(valuePath)) || "";
  const rawValue = useSelector(selectFieldValue(valuePath));
  const value = useMemo(() => {
    if (rawValue === undefined || rawValue === null) {
      return multiple ? [] : "";
    }
    if (multiple) {
      return Array.isArray(rawValue) ? rawValue : [rawValue];
    }
    return rawValue;
  }, [rawValue, multiple]);

  const formatPatterns = useSelector(selectFormatPatterns); // Get format patterns
  const depFormatPatterns = useSelector(selectDepFormatPatterns);

  const mode = useSelector(selectMode);
  const readOnly = mode === "view";

  const userContext = useSelector(selectUserContext);

  const isOrcidField = useMemo(() => {
    return isQualifiedAttributionOrcidField(field, fieldPath);
  }, [field, fieldPath]);

  const parentPath = useMemo(() => {
    const parts = fieldPath.split(".");
    return parts.length > 1 ? parts.slice(0, -1).join(".") : null;
  }, [fieldPath]);

  const parentFieldSelector = useMemo(
    () => (parentPath ? selectFieldByPath(parentPath) : () => null),
    [parentPath]
  );
  const parentField = useSelector(parentFieldSelector);

  const nameValuePath = useMemo(() => {
    if (!isOrcidField) return null;
    const siblingKey = findSiblingNameFieldKey(parentField);
    const lastDotIndex = valuePath.lastIndexOf(".");
    const instancePrefix =
      lastDotIndex !== -1 ? valuePath.substring(0, lastDotIndex) : "";
    return instancePrefix ? `${instancePrefix}.${siblingKey}` : siblingKey;
  }, [isOrcidField, parentField, valuePath]);

  const allFormValues = useSelector(selectFormState);

  const cleanUserOrcid = useMemo(() => {
    return extractCleanOrcid(userContext?.orcid);
  }, [userContext?.orcid]);

  const isUserOrcidUsedElsewhere = useMemo(() => {
    if (!cleanUserOrcid || !allFormValues || !isOrcidField) return false;
    return Object.entries(allFormValues).some(([key, val]) => {
      if (key === valuePath) return false;
      if (parentPath && !key.startsWith(parentPath)) return false;
      const cleanVal = extractCleanOrcid(val);
      return cleanVal && cleanVal === cleanUserOrcid;
    });
  }, [cleanUserOrcid, allFormValues, isOrcidField, valuePath, parentPath]);

  const [isFetchingName, setIsFetchingName] = useState(false);
  const [fetchFeedback, setFetchFeedback] = useState(null);

  const handleAddContextHubOrcid = useCallback(async () => {
    if (!userContext?.orcid) return;
    const targetOrcid = userContext.orcid;

    // Set the ORCID in this field
    dispatch(setFieldValue({ path: valuePath, value: targetOrcid }));

    // If we have ContextHub user's name, immediately set it into sibling contributor name
    let appliedContextHubName = false;
    if (nameValuePath && userContext.name) {
      dispatch(setFieldValue({ path: nameValuePath, value: userContext.name }));
      appliedContextHubName = true;
    }

    setIsFetchingName(true);
    setFetchFeedback({
      type: "info",
      message: t("orcid.adding_orcid") || "Adding ORCID & fetching details...",
    });

    try {
      const res = await fetchOrcidPersonName(targetOrcid);
      if (res?.name && nameValuePath) {
        dispatch(setFieldValue({ path: nameValuePath, value: res.name }));
        setFetchFeedback({
          type: "success",
          message: `${t("orcid.name_fetched") || "Name fetched: "}${res.name}`,
        });
      } else if (appliedContextHubName) {
        setFetchFeedback({
          type: "success",
          message: `${t("orcid.name_set_contexthub") || "Name set from ContextHub: "}${userContext.name}`,
        });
      } else {
        setFetchFeedback({
          type: "success",
          message: `${t("orcid.added_orcid") || "Added verified ORCID: "}${targetOrcid}`,
        });
      }
    } catch {
      if (appliedContextHubName) {
        setFetchFeedback({
          type: "success",
          message: `${t("orcid.name_set_contexthub") || "Name set from ContextHub: "}${userContext.name}`,
        });
      } else {
        setFetchFeedback({
          type: "info",
          message: `${t("orcid.added_orcid") || "Added verified ORCID: "}${targetOrcid}`,
        });
      }
    } finally {
      setIsFetchingName(false);
      setTimeout(() => setFetchFeedback(null), 5000);
    }
  }, [userContext, valuePath, nameValuePath, dispatch, t]);

  const handleFetchNameDirectlyFromOrcid = useCallback(async () => {
    const rawVal = value || userContext?.orcid || "";
    const clean = extractCleanOrcid(rawVal);
    if (!clean) {
      setFetchFeedback({
        type: "error",
        message: "Please enter a valid ORCID (e.g. 0000-0002-1825-0097)",
      });
      setTimeout(() => setFetchFeedback(null), 4000);
      return;
    }

    setIsFetchingName(true);
    setFetchFeedback({
      type: "info",
      message: t("orcid.fetching_name") || "Fetching name from ORCID...",
    });

    try {
      const res = await fetchOrcidPersonName(clean);
      if (res?.name && nameValuePath) {
        dispatch(setFieldValue({ path: nameValuePath, value: res.name }));
        setFetchFeedback({
          type: "success",
          message: `${t("orcid.name_fetched") || "Name fetched from ORCID: "}${res.name}`,
        });
      } else {
        setFetchFeedback({
          type: "error",
          message: res?.error || "No public name visible on this ORCID record",
        });
      }
    } catch {
      setFetchFeedback({
        type: "error",
        message: "Failed to connect to ORCID API",
      });
    } finally {
      setIsFetchingName(false);
      setTimeout(() => setFetchFeedback(null), 6000);
    }
  }, [value, userContext, nameValuePath, dispatch, t]);

  const [touched, setTouched] = useState(false);

  const duplicateOrcidInfo = useMemo(() => {
    if (!isOrcidField || !value || !allFormValues) {
      return { isDuplicate: false, duplicateOrcid: null, duplicateName: null, duplicateIndex: null };
    }
    return checkDuplicateContributorOrcid(allFormValues, valuePath, value);
  }, [isOrcidField, value, allFormValues, valuePath]);

  const validationError = useMemo(
    () =>
      getValidationError({
        field,
        fieldPath: valuePath,
        valuePath,
        value,
        readOnly,
        formatPatterns,
        depFormatPatterns,
        allFormValues,
      }),
    [field, valuePath, value, readOnly, formatPatterns, depFormatPatterns, allFormValues],
  );

  // Show error text after touched, or immediately if duplicate contributor ORCID detected
  const showError = (touched || duplicateOrcidInfo.isDuplicate) && !!validationError;

  const fieldNameForMax = fieldPath.split(".").pop() || name;
  const maxLength = useMemo(
    () =>
      getMaxLengthFromPattern(
        fieldNameForMax,
        formatPatterns,
        depFormatPatterns
      ),
    [fieldNameForMax, formatPatterns, depFormatPatterns]
  );

  const fieldErrorProps = showError ? { error: true } : {};
  // const textErrorProps = showError
  //   ? { error: true, helperText: validationError }
  //   : {};

  // const lines = 2;

  // const [expanded, setExpanded] = useState(false);
  // const [isClamped, setIsClamped] = useState(false);
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
      // const element = descriptionRef.current;
      // setIsClamped(element.scrollHeight > element.clientHeight);
    }
  }, [description]);

  // Check on mount and when description changes
  useEffect(() => {
    checkIfClamped();
    // setExpanded(false);
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
      // const element = descriptionRef.current;
      // setIsClamped(element.scrollHeight > element.clientHeight);
    }
  }, [description]);

  // const clampSx = expanded
  //   ? {}
  //   : {
  //       display: "-webkit-box",
  //       WebkitBoxOrient: "vertical",
  //       WebkitLineClamp: lines,
  //       overflow: "hidden",
  //       textOverflow: "ellipsis",
  //     };

  return (
    <Box>
      {!multiple && (
        <Box sx={readOnly ? { mt: 1 } : { mt: 3 }}>
          <Typography
            variant="subtitle1"
            component="label"
            sx={{ display: "block", fontWeight: 600 }}
          >
            {label || name}
            {required && !readOnly && (
              <span style={{ color: "red", marginLeft: 4 }}>*</span>
            )}
          </Typography>
        </Box>
      )}

      {/* <FieldDescription valuePath={valuePath} /> */}

      {multiple && type.includes("Text") ? null : (
        <FieldDescription valuePath={valuePath} />
      )}

      {/* ContextHub Verified ORCID Option Banner */}
      {isOrcidField &&
        !readOnly &&
        userContext?.orcidVerified &&
        userContext?.orcid &&
        !isUserOrcidUsedElsewhere && (
        <Box
          sx={{
            my: 1.5,
            p: 1.5,
            borderRadius: "8px",
            background:
              "linear-gradient(135deg, rgba(166, 206, 57, 0.12) 0%, rgba(166, 206, 57, 0.04) 100%)",
            border: "1px solid rgba(166, 206, 57, 0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 1.5,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
            <Box
              component="span"
              sx={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 28,
                height: 28,
                borderRadius: "50%",
                backgroundColor: "#A6CE39",
                color: "#fff",
                fontSize: "13px",
                fontWeight: 700,
                fontFamily: "sans-serif",
                flexShrink: 0,
                boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
              }}
            >
              iD
            </Box>
            <Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 600, color: "#2e7d32", fontSize: "0.85rem" }}
                >
                  {t("orcid.verified_available") || "ContextHub Verified ORCID Available"}
                </Typography>
                <Chip
                  size="small"
                  label="Verified"
                  color="success"
                  variant="filled"
                  sx={{ height: 18, fontSize: "0.68rem", fontWeight: 600 }}
                />
              </Box>
              <Typography
                variant="caption"
                sx={{ color: "text.secondary", display: "block", mt: 0.25 }}
              >
                {userContext.orcid}
                {userContext.name ? ` • ${userContext.name}` : ""}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {value && extractCleanOrcid(value) === extractCleanOrcid(userContext.orcid) ? (
              <Chip
                icon={<CheckCircleIcon sx={{ fontSize: 16, color: "#2e7d32 !important" }} />}
                label={t("orcid.orcid_added") || "Added to field"}
                size="small"
                variant="outlined"
                sx={{
                  borderColor: "#A6CE39",
                  color: "#2e7d32",
                  fontWeight: 600,
                  backgroundColor: "rgba(166, 206, 57, 0.12)",
                }}
              />
            ) : (
              <Button
                size="small"
                variant="contained"
                disabled={isFetchingName}
                onClick={handleAddContextHubOrcid}
                startIcon={
                  isFetchingName ? (
                    <CircularProgress size={14} color="inherit" />
                  ) : (
                    <CheckCircleIcon sx={{ fontSize: 16 }} />
                  )
                }
                sx={{
                  backgroundColor: "#A6CE39",
                  color: "#1b3806",
                  fontWeight: 600,
                  textTransform: "none",
                  fontSize: "0.8rem",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
                  "&:hover": {
                    backgroundColor: "#93b831",
                  },
                }}
              >
                {isFetchingName
                  ? t("orcid.adding_orcid") || "Adding..."
                  : t("orcid.add_verified_orcid") || "Use My Verified ORCID"}
              </Button>
            )}
          </Box>
        </Box>
      )}

      {categories && categories.length > 0 ? (
        !multiple ? (
          readOnly &&
          (value.length === 0 || (Array.isArray(value) && value.length > 0)) ? (
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
            <FormControl fullWidth size="small" {...fieldErrorProps}>
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
                // {...errorProps}
                // multiple={isMulti}
                renderValue={(selected) => {
                  if (!Array.isArray(selected)) {
                    return (
                      selected || (
                        <em>
                          {t("forminputsingle.select")} {label}
                        </em>
                      )
                    );
                  }
                  if (selected.length === 0) {
                    return (
                      <em>
                        {t("forminputsingle.select")} {label}
                      </em>
                    );
                  }
                  return (
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                      {selected.map((val) => (
                        <Chip key={val} label={val} size="small" />
                      ))}
                    </Box>
                  );
                }}
              >
                {!required && (
                  <MenuItem value="">
                    <em>{t("forminputsingle.none")}</em>
                  </MenuItem>
                )}
                {categories.map((option) => {
                  const code = option.split(" (")[0];
                  return (
                    <MenuItem key={code} value={code}>
                      {option}
                    </MenuItem>
                  );
                })}
              </Select>

              {showError && (
                <Typography
                  variant="caption"
                  color="error"
                  sx={{ mt: 0.5, ml: 1 }}
                >
                  {validationError}
                </Typography>
                // <FormHelperText error>{validationError}</FormHelperText>
              )}
            </FormControl>
          )
        ) : readOnly && instanceCount === 0 ? (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              pl: 1.5,
              py: 1.5,
              fontStyle: "italic",
              color: theme.descriptionColor,
            }}
          >
            {t("no_data")} {label || name}
          </Box>
        ) : (
          <Box sx={{ mt: depth === 0 ? 1 : 0 }}>
            {!readOnly && (
              <FormControl
                fullWidth
                size="small"
                {...fieldErrorProps}
                sx={{ p: 1 }}
              >
                <FormGroup>
                  {categories.map((option) => {
                    const code = option.split(" (")[0];

                    // Check if ANY instance has this code
                    const isChecked = existingValues.includes(code);

                    return (
                      <FormControlLabel
                        key={code}
                        control={
                          <Checkbox
                            checked={isChecked}
                            onChange={(e) => {
                              const checked = e.target.checked;

                              if (checked) {
                                // ADD: new instance with this code
                                const newIndex = instanceCount;
                                const newPath = `${valuePath}[${newIndex}]`;
                                dispatch(
                                  setFieldValue({ path: newPath, value: code }),
                                );
                                dispatch(incrementInstanceCount(valuePath));
                              } else {
                                // REMOVE: find & delete instance with this code
                                const indexToDelete =
                                  existingValues.indexOf(code);
                                if (indexToDelete !== -1) {
                                  handleDelete(indexToDelete);
                                }
                              }
                            }}
                            disabled={readOnly}
                            size="small"
                          />
                        }
                        label={option}
                        sx={{
                          m: 0,
                          "& .MuiFormControlLabel-label": readOnly
                            ? { color: "black" }
                            : { color: "inherit" },
                        }}
                      />
                    );
                  })}
                </FormGroup>

                {showError && (
                  <Typography
                    variant="caption"
                    color="error"
                    sx={{ mt: 0.5, ml: 1 }}
                  >
                    {validationError}
                  </Typography>
                )}
              </FormControl>
            )}

            {/* Read-only: Show selected chips */}
            {readOnly && existingValues.length > 0 && (
              <Box sx={{ mt: 1, display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                {existingValues.map((val, index) => (
                  <Chip key={`${val}-${index}`} label={val} />
                ))}
              </Box>
            )}
          </Box>
        )
      ) : type === "Boolean" || type.includes("Boolean") ? (
        readOnly && (!value || value.length === 0) ? (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              pl: 1.5,
              py: 1.5,
              fontStyle: "italic",
              color: theme.descriptionColor,
            }}
          >
            {t("no_data")} {label || name}
          </Box>
        ) : (
          <FormControl component="fieldset" {...fieldErrorProps} sx={{ mt: depth === 0 ? 1 : 0, p: 1, width: "100%" }}>
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <RadioGroup
                row
                value={
                  typeof value === "boolean"
                    ? value
                      ? (options ? options[0] : "True")
                      : (options ? options[1] : "False")
                    : value || ""
                }
                onChange={(e) => {
                  let val = e.target.value;
                  const optTrue = options ? options[0] : "True";
                  const optFalse = options ? options[1] : "False";
                  if (val === optTrue) val = true;
                  else if (val === optFalse) val = false;
                  onChange(valuePath, val);
                }}
                onBlur={handleBlur}
              >
                {(options || ["True", "False"]).map((opt) => (
                  <FormControlLabel
                    key={opt}
                    value={opt}
                    control={<Radio disabled={readOnly} size="small" />}
                    label={opt}
                    sx={{
                      m: 0,
                      mr: 2,
                      "& .MuiFormControlLabel-label": readOnly
                        ? { color: "black" }
                        : { color: "inherit" },
                    }}
                  />
                ))}
              </RadioGroup>
              {!readOnly && value !== "" && value !== null && value !== undefined && (
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => onChange(valuePath, "")}
                  sx={{ ml: 5, textTransform: "none", color: "error.main", borderColor: "error.main"}}
                >
                  {t("Clear Response") || "Clear Response"}
                </Button>
              )}
            </Box>
            {showError && (
              <Typography
                variant="caption"
                color="error"
                sx={{ mt: 0.5, ml: 1 }}
              >
                {validationError}
              </Typography>
            )}
          </FormControl>
        )
      ) : type.includes("DateTime") ? (
        readOnly &&
        (value.length === 0 || (Array.isArray(value) && value.length === 0)) ? (
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
          <TextareaAutosize
            disabled
            value={value}
            placeholder={placeholder || `Enter ${label}`}
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "8.5px 14px",
              fontFamily: "inherit",
              fontSize: "inherit",
              resize: "none",
              borderColor: "white",
              borderRadius: "4px",
              color: "black",
              WebkitTextFillColor: "black",
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
              format={placeholder === "YYYY" ? "yyyy" : "yyyy/MM/dd"}
              slotProps={{
                textField: { size: "small", error: !!validationError },
              }}
            />
          </LocalizationProvider>
        )
      ) : readOnly &&
        (value.length === 0 || (Array.isArray(value) && value.length === 0)) ? (
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
        <Box sx={{ position: "relative", width: "100%" }}>
          {isOrcidField && !readOnly && duplicateOrcidInfo.isDuplicate && (
            <Alert
              severity="warning"
              sx={{
                mb: 1.5,
                borderRadius: "8px",
                border: "1px solid #ff9800",
                backgroundColor: "rgba(255, 152, 0, 0.08)",
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 600, color: "#e65100" }}>
                {t("orcid.contributor_already_added") || "Contributor Already Added"}
              </Typography>
              <Typography variant="caption" sx={{ color: "text.primary", display: "block", mt: 0.25 }}>
                {duplicateOrcidInfo.duplicateName
                  ? `${duplicateOrcidInfo.duplicateName} (${duplicateOrcidInfo.duplicateOrcid})`
                  : duplicateOrcidInfo.duplicateOrcid}{" "}
                {t("orcid.duplicate_warning_text") ||
                  "has already been added as a contributor to this record. Contributors cannot be repeated."}
              </Typography>
            </Alert>
          )}

          <TextareaAutosize
            disabled={readOnly}
            minRows={1}
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "8.5px 14px",
              fontFamily: "inherit",
              fontSize: "inherit",
              resize: readOnly ? "none" : "vertical",
              borderColor: duplicateOrcidInfo.isDuplicate
                ? "#ed6c02"
                : showError
                  ? "#d32f2f"
                  : readOnly
                    ? "white"
                    : "rgba(0, 0, 0, 0.23)",
              borderRadius: "4px",
              color: readOnly ? "black" : "inherit",
              WebkitTextFillColor: readOnly ? "black" : "inherit",
              outline: "none",
            }}
            value={value}
            placeholder={
              placeholder || `${t("forminputsingle.enter")} ${label}`
            }
            onChange={(e) => onChange(valuePath, e.target.value)}
            onBlur={handleBlur}
          />
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              my: 0.25,
              px: 1,
              flexWrap: "wrap",
              gap: 0.5,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
              {showError ? (
                <Typography
                  variant="caption"
                  color={duplicateOrcidInfo.isDuplicate ? "warning.main" : "error"}
                  sx={{
                    fontWeight: duplicateOrcidInfo.isDuplicate ? 600 : 400,
                  }}
                >
                  {validationError}
                </Typography>
              ) : null}

              {isOrcidField && !readOnly && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Button
                    size="small"
                    variant="text"
                    disabled={isFetchingName || !value}
                    onClick={handleFetchNameDirectlyFromOrcid}
                    startIcon={
                      isFetchingName ? (
                        <CircularProgress size={13} color="inherit" />
                      ) : (
                        <SyncIcon sx={{ fontSize: 15 }} />
                      )
                    }
                    sx={{
                      textTransform: "none",
                      fontSize: "0.75rem",
                      color: "#2e7d32",
                      py: 0.25,
                      px: 0.75,
                      minHeight: 0,
                      "&:hover": {
                        backgroundColor: "rgba(166, 206, 57, 0.12)",
                      },
                    }}
                  >
                    {isFetchingName
                      ? t("orcid.fetching_name") || "Fetching name..."
                      : t("orcid.fetch_name_from_orcid") || "Fetch Name from ORCID"}
                  </Button>

                  {fetchFeedback && (
                    <Typography
                      variant="caption"
                      sx={{
                        color:
                          fetchFeedback.type === "success"
                            ? "success.main"
                            : fetchFeedback.type === "error"
                              ? "error.main"
                              : "info.main",
                        fontWeight: 500,
                      }}
                    >
                      {fetchFeedback.message}
                    </Typography>
                  )}
                </Box>
              )}

              {isOrcidField && readOnly && value && isValidOrcid(value) && (
                <Box
                  component="a"
                  href={`https://orcid.org/${extractCleanOrcid(value)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 0.5,
                    fontSize: "0.75rem",
                    color: "#2e7d32",
                    textDecoration: "none",
                    fontWeight: 500,
                    "&:hover": { textDecoration: "underline" },
                  }}
                >
                  <span>View ORCID profile</span>
                  <OpenInNewIcon sx={{ fontSize: 13 }} />
                </Box>
              )}
            </Box>

            {!readOnly && maxLength && (
              <Typography
                variant="caption"
                color={value?.length > maxLength ? "error" : "textSecondary"}
              >
                {value?.length || 0} / {maxLength}
              </Typography>
            )}
          </Box>
        </Box>
      )}
      {/* {validationError && !readOnly && (
        <FormHelperText error>{validationError}</FormHelperText>
      )} */}
    </Box>
  );
};

export default FormInputSingle;
