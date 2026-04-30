import React, { useEffect, useState } from "react";
import { Box, Button, Pagination, Typography, Fab } from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import SendIcon from "@mui/icons-material/Send";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
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
import {
  clearChildFormNavigation,
  setChildFormNavigation,
} from "../../store/slices/childFormNavigationSlice";
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

const getValueByPath = (obj, path) => {
  if (!obj || !path) return undefined;
  try {
    const parts = path.replace(/\[(\w+)\]/g, ".$1").split(".");
    let current = obj;
    for (let part of parts) {
      if (current === null || current === undefined) return undefined;
      current = current[part];
    }
    return current;
  } catch (e) {
    return undefined;
  }
};

// COMPONENT STATE
function DynamicForm({ isEditMode = false }) {
  const { t } = useTranslation(); // use translation function
  const navigate = useNavigate();

  const [showTopBtn, setShowTopBtn] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setShowTopBtn(true);
      } else {
        setShowTopBtn(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const goToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };
  const dispatch = useDispatch();
  const formState = useSelector(selectAllFormValues);
  const fields = useSelector(selectFields);

  const pages = useSelector(selectPages);
  const activePage = useSelector(selectActivePage);

  const childFormNavigation = useSelector((state) => state.childFormNavigation);

  const childPagesMeta = useSelector((state) => state.fieldSchema.childPages);

  const hasActiveChildSession = !!childFormNavigation?.nextValuePath;

  const hasSchemaPages = Array.isArray(pages) && pages.length > 0;

  const activePageData = pages?.[activePage];

  const isGeneratedChildPage =
    hasActiveChildSession && childFormNavigation?.useGeneratedPage;

  const isSchemaBackedChildPage =
    hasActiveChildSession &&
    childFormNavigation?.childPageIndex !== null &&
    childFormNavigation?.childPageIndex === activePage;

  // Collect all page indices registered as children (at any level)
  // const allChildPageIndices = new Set(
  //   Object.entries(childPagesMeta || {}).map(([pageIndex]) =>
  //     Number(pageIndex),
  //   ),
  // );

  const basePageIndices = pages
    .map((_, i) => i)
    .filter((i) => !pages[i]?.isChildPage);

  // console.log("childPagesMeta:", childPagesMeta);
  // console.log("allChildPageIndices:", [...allChildPageIndices]);
  // console.log("basePageIndices:", basePageIndices);

  const isCurrentPageAChildPage = !!pages[activePage]?.isChildPage;

  const currentBasePagePosition = basePageIndices.indexOf(activePage);

  const isNestedChildPage = isGeneratedChildPage || isSchemaBackedChildPage;

  // const isLastBasePage =
  //   !isCurrentPageAChildPage &&
  //   pages
  //     .map((_, i) => i)
  //     .filter((i) => !childPagesMeta?.[i]) // only base pages
  //     .at(-1) === activePage;

  const showNextButton =
    hasSchemaPages &&
    !isNestedChildPage &&
    !isCurrentPageAChildPage &&
    currentBasePagePosition < basePageIndices.length - 1;

  const showBackButton =
    hasSchemaPages &&
    !isNestedChildPage &&
    !isCurrentPageAChildPage &&
    currentBasePagePosition > 0;

  const rootIsValid = useSelector(selectIsRootFormValid);

  const mode = useSelector(selectMode);
  const readOnly = mode === "view";

  const getActiveItems = () => {
    if (!hasSchemaPages) return [];
    if (readOnly) {
      return basePageIndices.flatMap((idx) =>
        (pages[idx]?.items || []).map(item => ({ ...item, _sourcePageIndex: idx }))
      );
    }
    return (activePageData?.items || []).map(item => ({ ...item, _sourcePageIndex: activePage }));
  };

  const activeItems = getActiveItems();

  const sourceFields = hasSchemaPages
    ? activeItems.flatMap((item) =>
        item.type === "section"
          ? (item.fields || []).map(f => ({ ...f, _sourcePageIndex: item._sourcePageIndex }))
          : [{ ...item.field, _sourcePageIndex: item._sourcePageIndex }]
      )
    : fields;

  const {
    currentPage = 1,
    viewMode = "mandatory",
    fieldsPerPage = 6,
  } = useSelector((state) => state.formUi || {});

  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }, [activePage, currentPage]);

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
    ? activeItems
        .map((item) => {
          if (item.type === "field") {
            const filtered = filterFieldsByViewMode([item.field]);
            return filtered.length > 0
              ? { type: "field", field: filtered[0], _sourcePageIndex: item._sourcePageIndex }
              : null;
          }

          if (item.type === "section") {
            const filteredFields = filterFieldsByViewMode(item.fields || []);
            return filteredFields.length > 0
              ? { ...item, fields: filteredFields, _sourcePageIndex: item._sourcePageIndex }
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
    ? readOnly
      ? displayedFields
      : displayedFields.slice(startIndex, endIndex)
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
    const { path, _sourcePageIndex } = field;

    return <FieldChecker key={key} valuePath={path} depth={depth} parentPageIndex={_sourcePageIndex} />;
  };

  if (isNestedChildPage) {
    const activeChildSessions = [];

    if (isGeneratedChildPage) {
      activeChildSessions.push({
        isGenerated: true,
        path: childFormNavigation.nextValuePath,
        isEdit: childFormNavigation.isEdit,
      });
    } else {
      let currIdx = childFormNavigation.childPageIndex;
      let currPath = childFormNavigation.nextValuePath || "";

      while (currIdx !== null && currIdx !== undefined) {
        const meta = childPagesMeta?.[currIdx];
        if (!meta) break; // Base page reached

        const val = getValueByPath(formState, currPath);
        const derivedIsEdit = val !== undefined && val !== null;

        // Prepend so the deepest child is at the end of the array
        activeChildSessions.unshift({
          pageIndex: currIdx,
          path: currPath,
          parentPageIndex: meta.parentPageIndex,
          meta: meta,
          isEdit: derivedIsEdit,
        });

        currIdx = meta.parentPageIndex;
        const lastDotIndex = currPath.lastIndexOf(".");
        currPath =
          lastDotIndex !== -1 ? currPath.substring(0, lastDotIndex) : currPath;
      }

      // Override the deepest active descendant with the exact navigated state
      if (activeChildSessions.length > 0) {
        activeChildSessions[activeChildSessions.length - 1].isEdit =
          childFormNavigation.isEdit;
      }
    }

    return (
      <>
        {activeChildSessions.map((session, index) => {
          const isLast = index === activeChildSessions.length - 1;
          const key = session.isGenerated
            ? `gen-${session.path}`
            : `schema-${session.pageIndex}-${session.path}`;

          return (
            <Box key={key} sx={{ display: isLast ? "block" : "none" }}>
              <NestedChildFormContent
                nextValuePath={session.path}
                isOpen={true}
                isEdit={session.isEdit}
                pageIndex={session.pageIndex}
                isGenerated={session.isGenerated}
                onClose={() => {
                  if (!isLast) return;

                  const parentIdx = childFormNavigation.parentPageIndex;
                  if (parentIdx !== null && parentIdx !== undefined) {
                    dispatch(setActivePage(parentIdx));

                    const parentMeta = childPagesMeta?.[parentIdx];
                    if (parentMeta) {
                      const currentPath =
                        childFormNavigation.nextValuePath || "";
                      const lastDotIndex = currentPath.lastIndexOf(".");
                      const parentPath =
                        lastDotIndex !== -1
                          ? currentPath.substring(0, lastDotIndex)
                          : currentPath;

                      const parentVal = getValueByPath(formState, parentPath);
                      const isParentEdit =
                        parentVal !== undefined && parentVal !== null;

                      dispatch(
                        setChildFormNavigation({
                          nextValuePath: parentPath,
                          parentPageIndex: parentMeta.parentPageIndex,
                          childPageIndex: parentIdx,
                          isEdit: isParentEdit,
                          fallbackLabel:
                            parentMeta.label || pages[parentIdx]?.sidebarLabel,
                          fallbackFieldPath: parentPath,
                          useGeneratedPage: false,
                        }),
                      );
                    } else {
                      dispatch(clearChildFormNavigation());
                    }
                  } else {
                    dispatch(clearChildFormNavigation());
                  }
                  dispatch(setCurrentPage(1));
                }}
              />
            </Box>
          );
        })}
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
                          mb: 2,
                          p: 3,
                          border: "1px solid",
                          borderColor: "divider",
                          borderRadius: 2,
                          backgroundColor: "background.paper",
                          boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.05)",
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
                            { ...field, _sourcePageIndex: item._sourcePageIndex },
                            0,
                            `${item.id}-${field.name}-${fieldIndex}`,
                          ),
                        )}
                      </Box>
                    );
                  }

                  if (item.type === "field") {
                    return renderInput(
                      { ...item.field, _sourcePageIndex: item._sourcePageIndex },
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
            {!hasSchemaPages && !readOnly && (
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
            {!hasSchemaPages && totalPages > 1 && !readOnly && (
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
                {!showNextButton && (
                  <Button
                    variant="contained"
                    type="submit"
                    disabled={!rootIsValid}
                    sx={{
                      mt: 3,
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
                )}

                {showNextButton && (
                  <Button
                    variant="outlined"
                    onClick={() => {
                      const nextBaseIndex =
                        basePageIndices[currentBasePagePosition + 1];
                      dispatch(setActivePage(nextBaseIndex));
                      dispatch(setCurrentPage(1));
                    }}
                    sx={{
                      mt: 3,
                      color: theme.primaryColor,
                      borderColor: theme.primaryColor,
                      "&:hover": {
                        borderColor: theme.primaryColor,
                        backgroundColor: theme.backgroundColor,
                      },
                    }}
                  >
                    Next
                  </Button>
                )}

                {showBackButton && (
                  <Button
                    variant="outlined"
                    onClick={() => {
                      const prevBaseIndex =
                        basePageIndices[currentBasePagePosition - 1];
                      dispatch(setActivePage(prevBaseIndex));
                      dispatch(setCurrentPage(1));
                    }}
                    sx={{
                      mt: 3,
                      ml: 2,
                      color: theme.primaryColor,
                      borderColor: theme.primaryColor,
                      "&:hover": {
                        borderColor: theme.primaryColor,
                        backgroundColor: theme.backgroundColor,
                      },
                    }}
                  >
                    Back
                  </Button>
                )}
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

      {showTopBtn && (
        <Fab
          color="primary"
          size="medium"
          onClick={goToTop}
          sx={{
            position: "fixed",
            bottom: 32,
            right: 32,
            zIndex: 1000,
            backgroundColor: theme.primaryColor,
            "&:hover": {
              backgroundColor: theme.secondaryColor,
            },
          }}
        >
          <KeyboardArrowUpIcon sx={{ color: theme.backgroundColor }} />
        </Fab>
      )}
    </>
  );
}

export default DynamicForm;
