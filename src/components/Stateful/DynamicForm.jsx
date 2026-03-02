import React, { useEffect, useState } from "react";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import SaveIcon from "@mui/icons-material/Save";
import SendIcon from "@mui/icons-material/Send";
import { useTranslation } from "../../utils/OpenAIRE/TranslationContext";
import theme from "../../theme";
import canonicalize from "../../utils/canonicalize";
import Pagination from "@mui/material/Pagination";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { setFormState } from "../../store/slices/formValueSlice";
import { buildInstanceCountsFromValues } from "../../utils/instanceCounts";
import { setInstanceCount } from "../../store/slices/instanceCountsSlice";
import {
  selectAllFormValues,
  selectFields,
} from "../../store/selectors/formSelectors";
import FieldChecker from "./DynamicFormComponents/FieldChecker";
import { selectIsRootFormValid } from "../../store/selectors/popupValidationSelectors";
import { selectMode, setMode } from "../../store/slices/modeSlice";

const filterMandatoryFields = (fields) => {
  if (!Array.isArray(fields)) return [];
  return fields
    .filter((field) => field.required)
    .map((field) => ({
      ...field,
      children: field.children ? filterMandatoryFields(field.children) : [],
    }));
};

const filterRecommendedFields = (fields) => {
  if (!Array.isArray(fields)) return [];
  return fields
    .filter((field) => field.required || field.recommended)
    .map((field) => ({
      ...field,
      children: field.children ? filterRecommendedFields(field.children) : [],
    }));
};

// COMPONENT STATE
function DynamicForm({ language = "eng", isEditMode = false }) {
  const { t } = useTranslation(); // use translation function
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const formState = useSelector(selectAllFormValues);
  const fields = useSelector(selectFields);

  const rootIsValid = useSelector(selectIsRootFormValid);

  const mode = useSelector(selectMode);
  const readOnly = mode === "view";

  // Helper functions
  const hasMandatoryFields = (fields) => {
    return Array.isArray(fields) && fields.some((f) => f.required);
  };
  const hasRecommendedFields = (fields) => {
    return (
      Array.isArray(fields) && fields.some((f) => f.recommended && !f.required)
    );
  };
  const hasOptionalFields = (fields) => {
    return Array.isArray(fields) && fields.some((f) => f.optional);
  };

  // Initialize state with safe default
  const [viewMode, setViewMode] = useState("mandatory");

  // Set correct view mode once fields load
  useEffect(() => {
    if (Array.isArray(fields) && fields.length > 0) {
      const getInitialViewMode = (fields) => {
        if (hasMandatoryFields(fields)) return "mandatory";
        if (hasRecommendedFields(fields)) return "recommended";
        if (hasOptionalFields(fields)) return "complete";
        return "complete";
      };
      setViewMode(getInitialViewMode(fields));
    }
  }, [fields]); // removed the inline helpers

  // displayedFields logic
  const getDisplayedFields = () => {
    if (!Array.isArray(fields)) return [];

    switch (viewMode) {
      case "mandatory":
        return filterMandatoryFields(fields);
      case "recommended":
        return filterRecommendedFields(fields);
      case "complete":
      default:
        return fields;
    }
  };

  const displayedFields = getDisplayedFields();

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const fieldsPerPage = 6;

  // Calculate Pagination
  // const totalPages = Math.ceil(displayedFields.length / fieldsPerPage);
  const startIndex = (currentPage - 1) * fieldsPerPage;
  const endIndex = startIndex + fieldsPerPage;
  // const currentPageFields = displayedFields.slice(startIndex, endIndex);

  const totalPages = Array.isArray(displayedFields)
    ? Math.ceil(displayedFields.length / fieldsPerPage)
    : 0;
  const currentPageFields = Array.isArray(displayedFields)
    ? displayedFields.slice(startIndex, endIndex)
    : [];

  // Reset to first page when switching between Mandatory/Complete view
  useEffect(() => {
    setCurrentPage(1);
  }, [viewMode]);

  //
  const handleSubmit = (event) => {
    event.preventDefault();

    const nestedState = { ...formState };

    // Clean up any existing metadata fields (optional, for consistency)
    const cleanKeys = ["catalogue_id", "d", "@context"];
    cleanKeys.forEach((key) => {
      if (key in nestedState) delete nestedState[key];
    });

    // ADD CANONICALISATION HERE
    const canonicalizedState = canonicalize(nestedState);
    const cleanFormData = JSON.parse(canonicalizedState);

    dispatch(setFormState(cleanFormData));
    const instanceCount = buildInstanceCountsFromValues(cleanFormData);
    dispatch(setInstanceCount(instanceCount));
    dispatch(setMode("view"));
    navigate("/view");
  };

  const hasAsterisk = (fields) => {
    if (!Array.isArray(fields)) return false;

    for (const field of fields) {
      if (
        field.required ||
        (Array.isArray(field.children) &&
          field.children.some((child) => child.required))
      ) {
        return true;
      }
    }
    return false;
  };

  const showAsterisk = hasAsterisk(fields);

  // RECURSIVE RENDERER (INDIVIDUAL INPUTS)
  const renderInput = (field, depth = 0, key) => {
    const { path } = field;

    return <FieldChecker key={key} valuePath={path} depth={depth} />;
  };

  // RETURN JSX
  return (
    <>
      <Box sx={{ mb: 2, display: "flex", gap: 2, justifyContent: "center" }}>
        {Array.isArray(fields) && (
          <>
            {hasMandatoryFields(fields) && (
              <Button
                variant="contained"
                onClick={() => setViewMode("mandatory")}
                sx={{
                  backgroundColor:
                    viewMode === "mandatory"
                      ? theme.primaryColor
                      : theme.backgroundColor,
                  color:
                    viewMode === "mandatory"
                      ? theme.backgroundColor
                      : theme.primaryColor,
                  borderColor:
                    viewMode === "mandatory"
                      ? theme.backgroundColor
                      : theme.primaryColor,
                  border:
                    viewMode === "mandatory"
                      ? "1px solid transparent"
                      : "1px solid currentColor",
                  "&:hover": {
                    backgroundColor:
                      viewMode === "mandatory"
                        ? theme.primaryColor
                        : theme.hoverUnselectedBgColor,
                    borderColor: theme.primaryColor,
                  },
                }}
              >
                {t("dynamicform.mandatory")}
              </Button>
            )}

            {hasRecommendedFields(fields) && (
              <Button
                variant="contained"
                onClick={() => setViewMode("recommended")}
                sx={{
                  backgroundColor:
                    viewMode === "recommended"
                      ? theme.primaryColor
                      : theme.backgroundColor,
                  color:
                    viewMode === "recommended"
                      ? theme.backgroundColor
                      : theme.primaryColor,
                  borderColor:
                    viewMode === "recommended"
                      ? theme.backgroundColor
                      : theme.primaryColor,
                  border:
                    viewMode === "recommended"
                      ? "1px solid transparent"
                      : "1px solid currentColor",
                  "&:hover": {
                    backgroundColor:
                      viewMode === "recommended"
                        ? theme.primaryColor
                        : theme.hoverUnselectedBgColor,
                    borderColor: theme.primaryColor,
                  },
                }}
              >
                {t("dynamicform.recommended")}
              </Button>
            )}

            {hasOptionalFields(fields) && (
              <Button
                variant="contained"
                onClick={() => setViewMode("complete")}
                sx={{
                  backgroundColor:
                    viewMode === "complete"
                      ? theme.primaryColor
                      : theme.backgroundColor,
                  color:
                    viewMode === "complete"
                      ? theme.backgroundColor
                      : theme.primaryColor,
                  borderColor:
                    viewMode === "complete"
                      ? theme.backgroundColor
                      : theme.primaryColor,
                  border:
                    viewMode === "complete"
                      ? "1px solid transparent"
                      : "1px solid currentColor",
                  "&:hover": {
                    backgroundColor:
                      viewMode === "complete"
                        ? theme.primaryColor
                        : theme.hoverUnselectedBgColor,
                    borderColor: theme.primaryColor,
                  },
                }}
              >
                {t("dynamicform.complete")}
              </Button>
            )}
          </>
        )}
      </Box>

      {/* Add loading state ABOVE the buttons */}
      {!Array.isArray(fields) && (
        <Box sx={{ textAlign: "center", py: 4 }}>
          <Typography>Loading form...</Typography>
        </Box>
      )}

      {!readOnly && showAsterisk && (
        <Typography sx={{ mb: "15px", fontSize: "13px", fontStyle: "italic" }}>
          {t("dynamicform.all_fields")}
          <span style={{ color: "red" }}>*</span>
          {t("dynamicform.are_mandatory")}
        </Typography>
      )}

      {/* Hide pagination + page indicator when no fields */}
      {Array.isArray(displayedFields) && displayedFields.length > 0 && (
        <>
          {/* PAGE INDICATOR */}
          <Box sx={{ mb: 3, textAlign: "center" }}>
            <Typography variant="body2" color="textSecondary">
              Page {currentPage} of {totalPages} ({startIndex + 1}-
              {Math.min(endIndex, displayedFields.length)} of{" "}
              {displayedFields.length} fields)
            </Typography>
          </Box>

          {/* GENERATED FORM (RECURSICE INPUT RENDERING + SUBMIT BUTTON) */}
          <form onSubmit={handleSubmit}>
            {currentPageFields.map((field, index) =>
              renderInput(
                { ...field },
                0,
                `${field.name}-${startIndex + index}`,
              ),
            )}

            {/*PAGINATION CONTROLS */}
            {totalPages > 1 && (
              <Box
                sx={{ mt: 2, mb: 2, display: "flex", justifyContent: "center" }}
              >
                <Pagination
                  count={totalPages}
                  page={currentPage}
                  onChange={(e, page) => setCurrentPage(page)}
                  size="large"
                  sx={{
                    "& .MuiPaginationItem-root": {
                      color: theme.primaryColor,
                    },
                    "& .MuiPaginationItem-root.Mui-selected": {
                      backgroundColor: theme.primaryColor,
                      color: theme.backgroundColor,
                      "&:hover": {
                        backgroundColor: theme.primaryColor,
                      },
                    },
                    "& .MuiPaginationItem-root:hover": {
                      backgroundColor: theme.secondaryColor, // Light hover effect
                    },
                  }}
                />
              </Box>
            )}

            {!readOnly && (
              <>
                <Button
                  variant="contained"
                  type="submit"
                  disabled={!rootIsValid}
                  sx={{
                    mt: 2,
                    backgroundColor: theme.primaryColor,
                    "&:hover": {
                      backgroundColor: theme.primaryColor,
                    },
                  }}
                  startIcon={isEditMode && <SaveIcon />}
                  endIcon={!isEditMode && <SendIcon />}
                >
                  {isEditMode
                    ? t("dynamicform.save_changes")
                    : t("dynamicform.review")}
                </Button>
              </>
            )}
          </form>
        </>
      )}

      {/* DEBUG PANEL SHOWING EXTRACTED FIELDS JSON FOR VERIFICATION */}
      {/* <Box
        sx={{
          mt: 4,
          p: 2,
          border: "1px solid #ccc",
          backgroundColor: "#fafafa",
          whiteSpace: "pre-wrap",
          fontSize: "0.875rem",
        }}
      >
        <Typography variant="h6" gutterBottom>
          FormState:
        </Typography>
        <pre>{JSON.stringify(formState, null, 2)}</pre>
        <Typography variant="h6" gutterBottom>
          Extracted Fields (for verification):
        </Typography>
        <pre>{JSON.stringify(fields, null, 2)}</pre>
      </Box> */}
    </>
  );
}

export default DynamicForm;
