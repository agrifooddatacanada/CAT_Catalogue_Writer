import React, { useEffect } from "react";
import { Box, Button, Pagination, Typography } from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import SendIcon from "@mui/icons-material/Send";
import { useTranslation } from "../../utils/OpenAIRE/TranslationContext";
import theme from "../../theme";
import canonicalize from "../../utils/canonicalize";
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
import { setViewMode, setCurrentPage } from "../../store/slices/formUiSlice";
import { selectActivePage } from "../../store/slices/activePageSlice";
import { selectPages } from "../../store/selectors/formSelectors";
import NestedChildFormContent from "./DynamicFormComponents/NestedChildFormContent";
import { clearChildFormNavigation } from "../../store/slices/childFormNavigationSlice";
import { setActivePage } from "../../store/slices/activePageSlice";

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
function DynamicForm({ isEditMode = false }) {
  const { t } = useTranslation(); // use translation function
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const formState = useSelector(selectAllFormValues);
  const fields = useSelector(selectFields);

  const pages = useSelector(selectPages);
  const activePage = useSelector(selectActivePage);

  const childFormNavigation = useSelector((state) => state.childFormNavigation);

  const hasActiveChildSession = !!childFormNavigation?.nextValuePath;

  const hasSchemaPages = Array.isArray(pages) && pages.length > 0;

  const activePageData = pages?.[activePage];

  const isGeneratedChildPage =
    hasActiveChildSession && childFormNavigation?.useGeneratedPage;

  const isSchemaBackedChildPage =
    hasActiveChildSession &&
    childFormNavigation?.childPageIndex !== null &&
    childFormNavigation?.childPageIndex === activePage;

  const isNestedChildPage = isGeneratedChildPage || isSchemaBackedChildPage;

  const sourceFields = hasSchemaPages
    ? (activePageData?.items || []).flatMap((item) =>
        item.type === "section" ? item.fields : [item.field],
      )
    : fields;

  const rootIsValid = useSelector(selectIsRootFormValid);

  const mode = useSelector(selectMode);
  const readOnly = mode === "view";

  const {
    currentPage = 1,
    viewMode = "mandatory",
    fieldsPerPage = 6,
  } = useSelector((state) => state.formUi || {});

  // Helper functions
  const hasMandatoryFields = (fieldList) => {
    return Array.isArray(fieldList) && fieldList.some((f) => f.required);
  };
  const hasRecommendedFields = (fieldList) => {
    return (
      Array.isArray(fieldList) &&
      fieldList.some((f) => f.recommended && !f.required)
    );
  };
  const hasOptionalFields = (fieldList) => {
    return Array.isArray(fieldList) && fieldList.some((f) => f.optional);
  };

  // Initialize state with safe default
  // const [viewMode, setViewMode] = useState("mandatory");

  // Set correct view mode once fields load
  useEffect(() => {
    if (!Array.isArray(sourceFields) || sourceFields.length === 0) return;

    const getInitialViewMode = (fields) => {
      if (hasMandatoryFields(fields)) return "mandatory";
      if (hasRecommendedFields(fields)) return "recommended";
      if (hasOptionalFields(fields)) return "complete";
      return "complete";
    };

    dispatch(setViewMode(getInitialViewMode(sourceFields)));
  }, [sourceFields, activePage, hasSchemaPages, dispatch]); // removed the inline helpers

  // displayedFields logic
  const getDisplayedFields = () => {
    if (!Array.isArray(sourceFields)) return [];

    switch (viewMode) {
      case "mandatory":
        return filterMandatoryFields(sourceFields);
      case "recommended":
        return filterRecommendedFields(sourceFields);
      case "complete":
      default:
        return sourceFields;
    }
  };

  const displayedFields = getDisplayedFields();

  const filterFieldsByViewMode = (fieldList) => {
    if (!Array.isArray(fieldList)) return [];

    switch (viewMode) {
      case "mandatory":
        return filterMandatoryFields(fieldList);
      case "recommended":
        return filterRecommendedFields(fieldList);
      case "complete":
      default:
        return fieldList;
    }
  };

  const displayedItems = hasSchemaPages
    ? (activePageData?.items || [])
        .map((item) => {
          if (item.type === "field") {
            const filtered = filterFieldsByViewMode([item.field]);
            return filtered.length > 0
              ? { type: "field", field: filtered[0] }
              : null;
          }

          if (item.type === "section") {
            const filteredFields = filterFieldsByViewMode(item.fields || []);
            return filteredFields.length > 0
              ? { ...item, fields: filteredFields }
              : null;
          }

          return null;
        })
        .filter(Boolean)
    : [];

  // Calculate Pagination
  const startIndex = (currentPage - 1) * fieldsPerPage;
  const endIndex = startIndex + fieldsPerPage;

  const totalPages = Array.isArray(displayedFields)
    ? Math.ceil(displayedFields.length / fieldsPerPage)
    : 0;
  const currentPageFields = Array.isArray(displayedFields)
    ? displayedFields.slice(startIndex, endIndex)
    : [];

  // Reset to first page when switching between Mandatory/Complete view
  useEffect(() => {
    dispatch(setCurrentPage(1));
  }, [activePage, viewMode, hasSchemaPages, dispatch]);

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

  const showAsterisk = hasAsterisk(sourceFields);

  const hasDisplayedSchemaItems =
    hasSchemaPages &&
    Array.isArray(displayedItems) &&
    displayedItems.length > 0;

  const hasDisplayedFlatFields =
    !hasSchemaPages &&
    Array.isArray(displayedFields) &&
    displayedFields.length > 0;

  // RECURSIVE RENDERER (INDIVIDUAL INPUTS)
  const renderInput = (field, depth = 0, key) => {
    const { path } = field;

    return <FieldChecker key={key} valuePath={path} depth={depth} />;
  };

  if (isNestedChildPage) {
    return (
      <>
        {/* {!readOnly && (
          <Typography
            sx={{ mb: "15px", fontSize: "13px", fontStyle: "italic" }}
          >
            {t("dynamicform.all_fields")}
            <span style={{ color: "red" }}>*</span>
            {t("dynamicform.are_mandatory")}
          </Typography>
        )} */}

        <NestedChildFormContent
          nextValuePath={childFormNavigation.nextValuePath}
          isOpen={true}
          isEdit={childFormNavigation.isEdit}
          onClose={() => {
            if (childFormNavigation.parentPageIndex !== null) {
              dispatch(setActivePage(childFormNavigation.parentPageIndex));
            }
            dispatch(setCurrentPage(1));
            dispatch(clearChildFormNavigation());
          }}
        />
      </>
    );
  }

  // RETURN JSX
  return (
    <>
      {/* <Box sx={{ mb: 2, display: "flex", gap: 2, justifyContent: "center" }}>
        {Array.isArray(sourceFields) && (
          <>
            {hasMandatoryFields(sourceFields) && (
              <Button
                variant="contained"
                onClick={() => dispatch(setViewMode("mandatory"))}
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

            {hasRecommendedFields(sourceFields) && (
              <Button
                variant="contained"
                onClick={() => dispatch(setViewMode("recommended"))}
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

            {hasOptionalFields(sourceFields) && (
              <Button
                variant="contained"
                onClick={() => dispatch(setViewMode("complete"))}
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
      </Box> */}

      {/* Add loading state ABOVE the buttons */}
      {!Array.isArray(fields) && !Array.isArray(pages) && (
        <Box sx={{ textAlign: "center", py: 4 }}>
          <Typography>{t("dynamicform.loading")}</Typography>
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
      {(hasDisplayedSchemaItems || hasDisplayedFlatFields) && (
        <>
          {/* PAGE INDICATOR */}
          {/* {!hasSchemaPages && (
            <Box sx={{ mb: 3, textAlign: "center" }}>
              <Typography variant="body2" color="textSecondary">
                {t("dynamicform.page")} {currentPage} {t("dynamicform.of")}{" "}
                {totalPages} ({startIndex + 1}-
                {Math.min(endIndex, displayedFields.length)}{" "}
                {t("dynamicform.of")} {displayedFields.length}{" "}
                {t("dynamicform.fields")})
              </Typography>
            </Box>
          )} */}

          {/* GENERATED FORM (RECURSICE INPUT RENDERING + SUBMIT BUTTON) */}
          <form onSubmit={handleSubmit}>
            {hasSchemaPages
              ? displayedItems.map((item, index) => {
                  if (item.type === "section") {
                    return (
                      <Box
                        key={item.id}
                        sx={{
                          mt: 4,
                          pb: 2,
                          // border: 1,
                          // // borderStyle: "groove",
                          // borderInlineWidth: 20,
                          // borderBlockColor: "grey",
                          // borderStyle: "none",
                        }}
                      >
                        <Typography variant="h6" sx={{ mb: 0.5 }}>
                          {item.label}
                        </Typography>

                        {item.description && (
                          <Typography
                            variant="body2"
                            sx={{ mt: 0.5, mb: 0, color: "text.secondary" }}
                          >
                            {item.description}
                          </Typography>
                        )}

                        {item.fields.map((field, fieldIndex) =>
                          renderInput(
                            { ...field },
                            0,
                            `${item.id}-${field.name}-${fieldIndex}`,
                          ),
                        )}
                      </Box>
                    );
                  }

                  if (item.type === "field") {
                    return renderInput(
                      { ...item.field },
                      0,
                      `field-${item.field.name}-${index}`,
                    );
                  }

                  return null;
                })
              : currentPageFields.map((field, index) =>
                  renderInput(
                    { ...field },
                    0,
                    `${field.name}-${startIndex + index}`,
                  ),
                )}
            {/* {currentPageFields.map((field, index) =>
              renderInput(
                { ...field },
                0,
                `${field.name}-${startIndex + index}`,
              ),
            )} */}

            {/* PAGE INDICATOR */}
            {!hasSchemaPages && (
              <Box sx={{ mt: 3, textAlign: "center" }}>
                <Typography variant="body2" color="textSecondary">
                  {t("dynamicform.page")} {currentPage} {t("dynamicform.of")}{" "}
                  {totalPages} ({startIndex + 1}-
                  {Math.min(endIndex, displayedFields.length)}{" "}
                  {t("dynamicform.of")} {displayedFields.length}{" "}
                  {t("dynamicform.fields")})
                </Typography>
              </Box>
            )}

            {/*PAGINATION CONTROLS */}
            {!hasSchemaPages && totalPages > 1 && (
              <Box
                sx={{
                  mt: 2,
                  mb: 2,
                  display: "flex",
                  justifyContent: "center",
                }}
              >
                <Pagination
                  count={totalPages}
                  page={currentPage}
                  onChange={(e, page) => dispatch(setCurrentPage(page))}
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
                      backgroundColor: theme.secondaryColor,
                    },
                  }}
                />
              </Box>
            )}

            {/* {totalPages > 1 && (
              <Box
                sx={{ mt: 2, mb: 2, display: "flex", justifyContent: "center" }}
              >
                <Pagination
                  count={totalPages}
                  page={currentPage}
                  onChange={(e, page) => dispatch(setCurrentPage(page))}
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
            )} */}

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
