import React, {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useId,
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
import SearchIcon from "@mui/icons-material/Search";
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
import { useTranslation } from "../../../utils/OpenAIRE/TranslationContext";
import theme from "../../../theme";
import { useDispatch, useSelector } from "react-redux";
import {
  setFieldValue,
  removeFieldValue,
} from "../../../store/slices/formValueSlice";
import {
  selectDepFormatPatterns,
  selectFieldByPath,
  selectFieldValue,
  selectFormatPatterns,
  makeSelectFormValueByPrefix,
  selectInstanceCount,
} from "../../../store/selectors/formSelectors";
import { removeIndices } from "../../../utils/removeIndices";
import {
  getValidationError,
  getMaxLengthFromPattern,
} from "../../../utils/validationUtils";
import { selectMode } from "../../../store/slices/modeSlice";
import {
  incrementInstanceCount,
  decrementInstanceCount,
} from "../../../store/slices/instanceCountsSlice";
import FieldDescription from "./FieldDescription";

const OrcidSearchDialog = lazy(() => import("./OrcidSearchDialog"));

function parseStoredDateValue(val, placeholder) {
  if (!val || typeof val !== "string") return null;
  if (placeholder === "YYYY") {
    const yearNum = Number(val);
    return Number.isFinite(yearNum) && yearNum > 0 ? new Date(yearNum, 0, 1) : null;
  }
  const parts = val.split(/[-/]/);
  if (parts.length === 3) {
    let year;
    let month;
    let day;
    if (parts[0].length === 4) {
      // yyyy-MM-dd
      year = Number(parts[0]);
      month = Number(parts[1]) - 1;
      day = Number(parts[2]);
    } else if (parts[2].length === 4) {
      // dd-MM-yyyy
      day = Number(parts[0]);
      month = Number(parts[1]) - 1;
      year = Number(parts[2]);
    } else {
      const parsed = new Date(val);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    const candidate = new Date(year, month, day);
    return Number.isNaN(candidate.getTime()) ? null : candidate;
  }
  const fallback = new Date(val);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

const EMPTY_OBJECT = {};

const FormInputSingle = ({ valuePath, depth = 0 }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();

  const inputId = useId();
  const descId = useId();
  const errorId = useId();

  const fieldPath = removeIndices(valuePath);
  const field = useSelector(selectFieldByPath(fieldPath));

  const name = field?.name || "";
  const label = field?.label || "";
  const placeholder = field?.placeholder || "";
  const type = field?.type || "";
  const options = field?.options || null;
  const required = Boolean(field?.required);
  const multiple = Boolean(field?.multiple);
  const categories = field?.categories || null;

  const isMultiCategory = Boolean(multiple && categories && categories.length > 0);
  const instanceCount = useSelector(selectInstanceCount(valuePath)) || 0;

  // Memoize prefix selector and skip scanning formState when not needed
  const selectPrefixedValues = useMemo(
    () =>
      isMultiCategory
        ? makeSelectFormValueByPrefix(valuePath)
        : () => EMPTY_OBJECT,
    [isMultiCategory, valuePath],
  );
  const fieldValues = useSelector(selectPrefixedValues);

  const existingValues = useMemo(
    () =>
      isMultiCategory
        ? Array.from({ length: instanceCount }).map(
            (_, index) => fieldValues[`${valuePath}[${index}]`],
          )
        : [],
    [isMultiCategory, instanceCount, fieldValues, valuePath],
  );

  const handleDelete = useCallback(
    (indexToDelete) => {
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

  const formatPatterns = useSelector(selectFormatPatterns);
  const depFormatPatterns = useSelector(selectDepFormatPatterns);
  const mode = useSelector(selectMode);
  const readOnly = mode === "view";
  const userContext = useSelector(selectUserContext);

  const isOrcidField = useMemo(
    () => isQualifiedAttributionOrcidField(field, fieldPath),
    [field, fieldPath],
  );

  const parentPath = useMemo(() => {
    const parts = fieldPath.split(".");
    return parts.length > 1 ? parts.slice(0, -1).join(".") : null;
  }, [fieldPath]);

  const parentField = useSelector(selectFieldByPath(parentPath));

  const nameValuePath = useMemo(() => {
    if (!isOrcidField) return null;
    const siblingKey = findSiblingNameFieldKey(parentField);
    const lastDotIndex = valuePath.lastIndexOf(".");
    const instancePrefix =
      lastDotIndex !== -1 ? valuePath.substring(0, lastDotIndex) : "";
    return instancePrefix ? `${instancePrefix}.${siblingKey}` : siblingKey;
  }, [isOrcidField, parentField, valuePath]);

  // Only subscribe to full formState on ORCID fields so typing in one field never re-renders unrelated fields
  const allFormValues = useSelector((state) =>
    isOrcidField ? state.formValues.formState : null,
  );

  const cleanUserOrcid = useMemo(
    () => extractCleanOrcid(userContext?.orcid),
    [userContext?.orcid],
  );

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
  const [isSearchDialogOpen, setIsSearchDialogOpen] = useState(false);
  const feedbackTimerRef = useRef(null);

  const showTransientFeedback = useCallback((feedback, durationMs = 5000) => {
    if (feedbackTimerRef.current) {
      clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = null;
    }
    setFetchFeedback(feedback);
    if (feedback && durationMs > 0) {
      feedbackTimerRef.current = setTimeout(() => {
        setFetchFeedback(null);
        feedbackTimerRef.current = null;
      }, durationMs);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) {
        clearTimeout(feedbackTimerRef.current);
      }
    };
  }, []);

  const initialOrcidSearchQuery = useMemo(() => {
    if (!isOrcidField) return "";
    const siblingName = nameValuePath ? allFormValues?.[nameValuePath] : "";
    if (typeof siblingName === "string" && siblingName.trim()) {
      return siblingName.trim();
    }
    if (typeof value === "string" && value.trim() && !isValidOrcid(value)) {
      return value.trim();
    }
    return "";
  }, [isOrcidField, nameValuePath, allFormValues, value]);

  const handleSelectOrcidFromSearch = useCallback(
    async (selectedItem) => {
      if (!selectedItem?.orcidId) return;
      const targetOrcid = selectedItem.orcidId;

      dispatch(setFieldValue({ path: valuePath, value: targetOrcid }));

      if (selectedItem.displayName && nameValuePath) {
        dispatch(
          setFieldValue({ path: nameValuePath, value: selectedItem.displayName }),
        );
        showTransientFeedback({
          type: "success",
          message: `${t("orcid.selected_orcid_feedback")}${targetOrcid} (${selectedItem.displayName})`,
        });
        return;
      }

      if (nameValuePath) {
        setIsFetchingName(true);
        try {
          const res = await fetchOrcidPersonName(targetOrcid);
          if (res?.name) {
            dispatch(setFieldValue({ path: nameValuePath, value: res.name }));
            showTransientFeedback({
              type: "success",
              message: `${t("orcid.selected_orcid_feedback")}${targetOrcid} (${res.name})`,
            });
          } else {
            showTransientFeedback({
              type: "success",
              message: `${t("orcid.selected_orcid_feedback")}${targetOrcid}`,
            });
          }
        } catch {
          showTransientFeedback({
            type: "success",
            message: `${t("orcid.selected_orcid_feedback")}${targetOrcid}`,
          });
        } finally {
          setIsFetchingName(false);
        }
      } else {
        showTransientFeedback({
          type: "success",
          message: `${t("orcid.selected_orcid_feedback")}${targetOrcid}`,
        });
      }
    },
    [dispatch, valuePath, nameValuePath, t, showTransientFeedback],
  );

  const handleAddContextHubOrcid = useCallback(async () => {
    if (!userContext?.orcid) return;
    const targetOrcid = userContext.orcid;

    dispatch(setFieldValue({ path: valuePath, value: targetOrcid }));

    let appliedContextHubName = false;
    if (nameValuePath && userContext.name) {
      dispatch(setFieldValue({ path: nameValuePath, value: userContext.name }));
      appliedContextHubName = true;
    }

    setIsFetchingName(true);
    showTransientFeedback(
      {
        type: "info",
        message: t("orcid.adding_orcid"),
      },
      0,
    );

    try {
      const res = await fetchOrcidPersonName(targetOrcid);
      if (res?.name && nameValuePath) {
        dispatch(setFieldValue({ path: nameValuePath, value: res.name }));
        showTransientFeedback({
          type: "success",
          message: `${t("orcid.name_fetched")}${res.name}`,
        });
      } else if (appliedContextHubName) {
        showTransientFeedback({
          type: "success",
          message: `${t("orcid.name_set_contexthub")}${userContext.name}`,
        });
      } else {
        showTransientFeedback({
          type: "success",
          message: `${t("orcid.added_orcid")}${targetOrcid}`,
        });
      }
    } catch {
      if (appliedContextHubName) {
        showTransientFeedback({
          type: "success",
          message: `${t("orcid.name_set_contexthub")}${userContext.name}`,
        });
      } else {
        showTransientFeedback({
          type: "info",
          message: `${t("orcid.added_orcid")}${targetOrcid}`,
        });
      }
    } finally {
      setIsFetchingName(false);
    }
  }, [userContext, valuePath, nameValuePath, dispatch, t, showTransientFeedback]);

  const handleFetchNameDirectlyFromOrcid = useCallback(async () => {
    const rawVal = value || userContext?.orcid || "";
    const clean = extractCleanOrcid(rawVal);
    if (!clean) {
      showTransientFeedback(
        {
          type: "error",
          message: t("orcid.invalid_orcid_prompt"),
        },
        4000,
      );
      return;
    }

    setIsFetchingName(true);
    showTransientFeedback(
      {
        type: "info",
        message: t("orcid.fetching_name"),
      },
      0,
    );

    try {
      const res = await fetchOrcidPersonName(clean);
      if (res?.name && nameValuePath) {
        dispatch(setFieldValue({ path: nameValuePath, value: res.name }));
        showTransientFeedback(
          {
            type: "success",
            message: `${t("orcid.name_fetched")}${res.name}`,
          },
          6000,
        );
      } else {
        showTransientFeedback(
          {
            type: "error",
            message: res?.error || t("orcid.no_public_name"),
          },
          6000,
        );
      }
    } catch {
      showTransientFeedback(
        {
          type: "error",
          message: t("orcid.api_connect_failed"),
        },
        6000,
      );
    } finally {
      setIsFetchingName(false);
    }
  }, [value, userContext, nameValuePath, dispatch, t, showTransientFeedback]);

  const [touched, setTouched] = useState(false);

  const duplicateOrcidInfo = useMemo(() => {
    if (!isOrcidField || !value || !allFormValues) {
      return {
        isDuplicate: false,
        duplicateOrcid: null,
        duplicateName: null,
        duplicateIndex: null,
      };
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
        t,
      }),
    [
      field,
      valuePath,
      value,
      readOnly,
      formatPatterns,
      depFormatPatterns,
      allFormValues,
      t,
    ],
  );

  const showError = (touched || duplicateOrcidInfo.isDuplicate) && !!validationError;

  const fieldNameForMax = fieldPath.split(".").pop() || name;
  const maxLength = useMemo(
    () =>
      getMaxLengthFromPattern(
        fieldNameForMax,
        formatPatterns,
        depFormatPatterns,
        field?.captureBase,
      ),
    [fieldNameForMax, formatPatterns, depFormatPatterns, field?.captureBase],
  );

  const handleBlur = () => {
    if (!touched) setTouched(true);
  };

  const onChange = (path, newValue) => {
    dispatch(setFieldValue({ path, value: newValue }));
  };

  if (!field) {
    return null;
  }

  const fieldErrorProps = showError ? { error: true } : {};
  const displayName = label || name;
  const isEmptyValue =
    value === undefined ||
    value === null ||
    value === "" ||
    (Array.isArray(value) && value.length === 0);

  const describedBy = [field.description ? descId : null, showError ? errorId : null]
    .filter(Boolean)
    .join(" ") || undefined;

  return (
    <Box>
      {!multiple && (
        <Box sx={readOnly ? { mt: 1 } : { mt: 3 }}>
          <Typography
            variant="subtitle1"
            component="label"
            htmlFor={inputId}
            sx={{ display: "block", fontWeight: 600 }}
          >
            {displayName}
            {required && !readOnly && (
              <span aria-hidden="true" style={{ color: "red", marginLeft: 4 }}>*</span>
            )}
          </Typography>
        </Box>
      )}

      {multiple && typeof type === "string" && type.includes("Text") ? null : (
        <FieldDescription valuePath={valuePath} id={descId} />
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
                aria-hidden="true"
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
                    {t("orcid.verified_available")}
                  </Typography>
                  <Chip
                    size="small"
                    label={t("orcid.verified_badge")}
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
              {value &&
              extractCleanOrcid(value) === extractCleanOrcid(userContext.orcid) ? (
                <Chip
                  icon={
                    <CheckCircleIcon
                      sx={{ fontSize: 16, color: "#2e7d32 !important" }}
                    />
                  }
                  label={t("orcid.orcid_added")}
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
                    ? t("orcid.adding_orcid")
                    : t("orcid.add_verified_orcid")}
                </Button>
              )}
            </Box>
          </Box>
        )}

      {categories && categories.length > 0 ? (
        !multiple ? (
          readOnly && isEmptyValue ? (
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
              {t("no_data")} {displayName}
            </Box>
          ) : (
            <FormControl fullWidth size="small" {...fieldErrorProps}>
              <Select
                id={inputId}
                disabled={readOnly}
                inputProps={{
                  "aria-label": displayName,
                  "aria-describedby": describedBy,
                  "aria-invalid": showError || undefined,
                }}
                sx={
                  readOnly
                    ? {
                        "& .MuiOutlinedInput-notchedOutline": {
                          borderColor: "white",
                        },
                        "&:hover .MuiOutlinedInput-notchedOutline": {
                          borderColor: "white",
                        },
                        "&.Mui-disabled .MuiOutlinedInput-notchedOutline": {
                          borderColor: "white",
                        },
                        "& .MuiSelect-select.Mui-disabled": {
                          WebkitTextFillColor: "black",
                        },
                      }
                    : {}
                }
                value={value}
                displayEmpty
                onChange={(e) => onChange(valuePath, e.target.value)}
                onBlur={handleBlur}
                renderValue={(selected) => {
                  if (!Array.isArray(selected)) {
                    return (
                      selected || (
                        <em>
                          {t("forminputsingle.select")} {displayName}
                        </em>
                      )
                    );
                  }
                  if (selected.length === 0) {
                    return (
                      <em>
                        {t("forminputsingle.select")} {displayName}
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
                  id={errorId}
                  variant="caption"
                  color="error"
                  sx={{ mt: 0.5, ml: 1 }}
                >
                  {validationError}
                </Typography>
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
            {t("no_data")} {displayName}
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
                <FormGroup aria-label={displayName}>
                  {categories.map((option) => {
                    const code = option.split(" (")[0];
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
                                const newIndex = instanceCount;
                                const newPath = `${valuePath}[${newIndex}]`;
                                dispatch(
                                  setFieldValue({ path: newPath, value: code }),
                                );
                                dispatch(incrementInstanceCount(valuePath));
                              } else {
                                const indexToDelete = existingValues.indexOf(code);
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
                    id={errorId}
                    variant="caption"
                    color="error"
                    sx={{ mt: 0.5, ml: 1 }}
                  >
                    {validationError}
                  </Typography>
                )}
              </FormControl>
            )}

            {readOnly && existingValues.length > 0 && (
              <Box sx={{ mt: 1, display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                {existingValues.map((val, index) => (
                  <Chip key={`${val}-${index}`} label={val} />
                ))}
              </Box>
            )}
          </Box>
        )
      ) : type === "Boolean" || (typeof type === "string" && type.includes("Boolean")) ? (
        // Boolean `false` is a valid value; only treat null/undefined/"" as empty
        readOnly && isEmptyValue ? (
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
            {t("no_data")} {displayName}
          </Box>
        ) : (
          <FormControl
            component="fieldset"
            {...fieldErrorProps}
            sx={{ mt: depth === 0 ? 1 : 0, p: 1, width: "100%" }}
          >
            <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 1 }}>
              <RadioGroup
                row
                aria-label={displayName}
                value={
                  typeof value === "boolean"
                    ? value
                      ? options
                        ? options[0]
                        : "True"
                      : options
                        ? options[1]
                        : "False"
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
              {!readOnly && !isEmptyValue && (
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => onChange(valuePath, "")}
                  sx={{
                    ml: { xs: 0, sm: 3 },
                    textTransform: "none",
                    color: "error.main",
                    borderColor: "error.main",
                  }}
                >
                  {t("forminputsingle.clear_response")}
                </Button>
              )}
            </Box>
            {showError && (
              <Typography
                id={errorId}
                variant="caption"
                color="error"
                sx={{ mt: 0.5, ml: 1 }}
              >
                {validationError}
              </Typography>
            )}
          </FormControl>
        )
      ) : typeof type === "string" && type.includes("DateTime") ? (
        readOnly && isEmptyValue ? (
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
            {t("no_data")} {displayName}
          </Box>
        ) : readOnly ? (
          <TextareaAutosize
            id={inputId}
            disabled
            value={value}
            aria-label={displayName}
            placeholder={placeholder || `${t("forminputsingle.enter")} ${displayName}`}
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
          <DatePicker
            views={placeholder === "YYYY" ? ["year"] : undefined}
            value={parseStoredDateValue(value, placeholder)}
            onChange={(date) => {
              if (!date) {
                onChange(valuePath, "");
                return;
              }
              if (Number.isNaN(date.getTime())) {
                return; // Ignore incomplete/invalid intermediate typing
              }
              if (placeholder === "YYYY") {
                onChange(valuePath, date.getFullYear().toString());
              } else {
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, "0");
                const day = String(date.getDate()).padStart(2, "0");
                onChange(valuePath, `${year}-${month}-${day}`);
              }
            }}
            format={placeholder === "YYYY" ? "yyyy" : "yyyy/MM/dd"}
            slotProps={{
              textField: {
                id: inputId,
                size: "small",
                error: showError,
                helperText: showError ? validationError : undefined,
                onBlur: handleBlur,
                inputProps: {
                  "aria-describedby": describedBy,
                  "aria-invalid": showError || undefined,
                },
              },
            }}
          />
        )
      ) : readOnly && isEmptyValue ? (
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
          {t("no_data")} {displayName}
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
              <Typography
                variant="body2"
                sx={{ fontWeight: 600, color: "#e65100" }}
              >
                {t("orcid.contributor_already_added")}
              </Typography>
              <Typography
                variant="caption"
                sx={{ color: "text.primary", display: "block", mt: 0.25 }}
              >
                {duplicateOrcidInfo.duplicateName
                  ? `${duplicateOrcidInfo.duplicateName} (${duplicateOrcidInfo.duplicateOrcid})`
                  : duplicateOrcidInfo.duplicateOrcid}{" "}
                {t("orcid.duplicate_warning_text")}
              </Typography>
            </Alert>
          )}

          <TextareaAutosize
            id={inputId}
            className="form-textarea-input"
            disabled={readOnly}
            minRows={1}
            aria-label={multiple ? displayName : undefined}
            aria-describedby={describedBy}
            aria-invalid={showError || undefined}
            aria-required={required || undefined}
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "8.5px 14px",
              fontFamily: "inherit",
              fontSize: "inherit",
              resize: readOnly ? "none" : "vertical",
              border: "1px solid",
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
            }}
            value={value}
            placeholder={
              placeholder || `${t("forminputsingle.enter")} ${displayName}`
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
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                flexWrap: "wrap",
              }}
            >
              {showError ? (
                <Typography
                  id={errorId}
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
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    flexWrap: "wrap",
                  }}
                >
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => setIsSearchDialogOpen(true)}
                    startIcon={<SearchIcon sx={{ fontSize: 15 }} />}
                    sx={{
                      textTransform: "none",
                      fontSize: "0.75rem",
                      color: "#1b3806",
                      borderColor: "rgba(166, 206, 57, 0.85)",
                      backgroundColor: "rgba(166, 206, 57, 0.14)",
                      fontWeight: 600,
                      py: 0.25,
                      px: 1,
                      minHeight: 0,
                      "&:hover": {
                        borderColor: "#93b831",
                        backgroundColor: "rgba(166, 206, 57, 0.26)",
                      },
                    }}
                  >
                    {t("orcid.search_registry")}
                  </Button>

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
                      ? t("orcid.fetching_name")
                      : t("orcid.fetch_name_from_orcid")}
                  </Button>

                  {fetchFeedback && (
                    <Typography
                      variant="caption"
                      role="status"
                      aria-live="polite"
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

                  {isSearchDialogOpen && (
                    <Suspense fallback={null}>
                      <OrcidSearchDialog
                        open={isSearchDialogOpen}
                        onClose={() => setIsSearchDialogOpen(false)}
                        onSelectOrcid={handleSelectOrcidFromSearch}
                        initialQuery={initialOrcidSearchQuery}
                        currentOrcidValue={typeof value === "string" ? value : ""}
                        allFormValues={allFormValues}
                        valuePath={valuePath}
                      />
                    </Suspense>
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
                  <span>{t("orcid.view_orcid_profile")}</span>
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
    </Box>
  );
};

export default FormInputSingle;
