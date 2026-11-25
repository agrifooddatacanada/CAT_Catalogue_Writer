import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Pagination,
  Typography,
  Fab,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { useTranslation } from "../../utils/OpenAIRE/TranslationContext";
import theme from "../../theme";
import canonicalize from "../../utils/canonicalize";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { setFormState } from "../../store/slices/formValueSlice";
import { buildInstanceCountsFromValues } from "../../utils/instanceCounts";
import { setAllInstanceCounts } from "../../store/slices/instanceCountsSlice";
import {
  selectAllFormValues,
  selectFields,
  selectPages,
} from "../../store/selectors/formSelectors";
import FieldChecker from "./DynamicFormComponents/FieldChecker";
import {
  selectIsRootFormValid,
  selectValidationSummary,
} from "../../store/selectors/popupValidationSelectors";
import { selectMode, setMode } from "../../store/slices/modeSlice";
import { setCurrentPage } from "../../store/slices/formUiSlice";
import {
  selectActivePage,
  setActivePage,
} from "../../store/slices/activePageSlice";
import NestedChildFormContent from "./DynamicFormComponents/NestedChildFormContent";
import {
  clearChildFormNavigation,
  setChildFormNavigation,
} from "../../store/slices/childFormNavigationSlice";
import { filterFieldsByViewMode } from "../../utils/viewModeUtils";

const getValueByPath = (obj, path) => {
  if (!obj || !path) return undefined;
  try {
    const parts = path.replace(/\[(\w+)\]/g, ".$1").split(".");
    let current = obj;
    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      current = current[part];
    }
    return current;
  } catch {
    return undefined;
  }
};

function DynamicForm({ isEditMode: propIsEditMode }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [showTopBtn, setShowTopBtn] = useState(false);

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const isPast = window.scrollY > 300;
          setShowTopBtn((prev) => (prev !== isPast ? isPast : prev));
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
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

  const safePages = Array.isArray(pages) ? pages : [];
  const basePageIndices = safePages
    .map((_, i) => i)
    .filter((i) => !safePages[i]?.isChildPage);

  const isCurrentPageAChildPage = !!safePages[activePage]?.isChildPage;
  const currentBasePagePosition = basePageIndices.indexOf(activePage);
  const isNestedChildPage = isGeneratedChildPage || isSchemaBackedChildPage;

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
  const validationSummary = useSelector(selectValidationSummary);

  const mode = useSelector(selectMode);
  const readOnly = mode === "view";
  const isEditMode =
    propIsEditMode !== undefined ? propIsEditMode : mode === "edit";

  const getActiveItems = () => {
    if (!hasSchemaPages) return [];
    if (readOnly) {
      return basePageIndices.flatMap((idx) =>
        (pages[idx]?.items || []).map((item) => ({
          ...item,
          _sourcePageIndex: idx,
        })),
      );
    }
    return (activePageData?.items || []).map((item) => ({
      ...item,
      _sourcePageIndex: activePage,
    }));
  };

  const activeItems = getActiveItems();

  const sourceFields = hasSchemaPages
    ? activeItems.flatMap((item) =>
        item.type === "section"
          ? (item.fields || []).map((f) => ({
              ...f,
              _sourcePageIndex: item._sourcePageIndex,
            }))
          : [{ ...item.field, _sourcePageIndex: item._sourcePageIndex }],
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

  const displayedFields = filterFieldsByViewMode(sourceFields, viewMode);

  const displayedItems = hasSchemaPages
    ? activeItems
        .map((item) => {
          if (item.type === "field") {
            const filtered = filterFieldsByViewMode([item.field], viewMode);
            return filtered.length > 0
              ? {
                  type: "field",
                  field: filtered[0],
                  _sourcePageIndex: item._sourcePageIndex,
                }
              : null;
          }

          if (item.type === "section") {
            const filteredFields = filterFieldsByViewMode(
              item.fields || [],
              viewMode,
            );
            return filteredFields.length > 0
              ? {
                  ...item,
                  fields: filteredFields,
                  _sourcePageIndex: item._sourcePageIndex,
                }
              : null;
          }

          return null;
        })
        .filter(Boolean)
    : [];

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

  useEffect(() => {
    dispatch(setCurrentPage(1));
  }, [activePage, viewMode, hasSchemaPages, dispatch]);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!rootIsValid) return;

    const nestedState = { ...formState };
    const cleanKeys = ["catalogue_id", "d", "@context"];
    cleanKeys.forEach((key) => {
      if (key in nestedState) delete nestedState[key];
    });

    const canonicalizedState = canonicalize(nestedState);
    const cleanFormData = JSON.parse(canonicalizedState);

    dispatch(setFormState(cleanFormData));
    const instanceCount = buildInstanceCountsFromValues(cleanFormData);
    dispatch(setAllInstanceCounts(instanceCount));
    dispatch(setMode("view"));
    navigate({
      pathname: "/view",
      search: window.location.search,
    });
  };

  const hasAsterisk = (fieldList) => {
    if (!Array.isArray(fieldList)) return false;

    for (const field of fieldList) {
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

  const renderInput = (field, depth = 0, key) => {
    const { path, _sourcePageIndex } = field;
    return (
      <FieldChecker
        key={key}
        valuePath={path}
        depth={depth}
        parentPageIndex={_sourcePageIndex}
      />
    );
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
        if (!meta) break;

        const val = getValueByPath(formState, currPath);
        const derivedIsEdit = val !== undefined && val !== null;

        activeChildSessions.unshift({
          pageIndex: currIdx,
          path: currPath,
          parentPageIndex: meta.parentPageIndex,
          meta,
          isEdit: derivedIsEdit,
        });

        currIdx = meta.parentPageIndex;
        const lastDotIndex = currPath.lastIndexOf(".");
        currPath =
          lastDotIndex !== -1 ? currPath.substring(0, lastDotIndex) : currPath;
      }

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

  return (
    <>
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

      {(hasDisplayedSchemaItems || hasDisplayedFlatFields) && (
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
                      filter: "brightness(0.93)",
                    },
                  },
                  "& .MuiPaginationItem-root:hover": {
                    backgroundColor: theme.secondaryColor,
                  },
                }}
              />
            </Box>
          )}

          {/* Validation Summary when Submit/Review is blocked on the final step */}
          {!readOnly && !showNextButton && !rootIsValid && (
            <Alert severity="info" sx={{ mt: 3, borderRadius: 2 }}>
              {validationSummary.isEmptyForm &&
              validationSummary.issues.length === 0 ? (
                <Typography variant="body2">
                  {t("dynamicform.submit_blocked_empty")}
                </Typography>
              ) : (
                <Box>
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 600, mb: 0.75 }}
                  >
                    {t("dynamicform.submit_blocked_title")}
                  </Typography>
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
                    {validationSummary.issues.slice(0, 12).map((issue) => {
                      const reasonLabel =
                        issue.reason === "missing"
                          ? t("dynamicform.issue_missing")
                          : t("dynamicform.issue_invalid");
                      const chipLabel = issue.pageLabel
                        ? `${issue.fieldLabel} (${issue.pageLabel} · ${reasonLabel})`
                        : `${issue.fieldLabel} (${reasonLabel})`;
                      const canJump =
                        hasSchemaPages &&
                        issue.pageIndex !== null &&
                        issue.pageIndex !== undefined;

                      return (
                        <Chip
                          key={issue.fieldPath}
                          size="small"
                          variant="outlined"
                          color={issue.reason === "missing" ? "warning" : "error"}
                          label={chipLabel}
                          clickable={canJump}
                          onClick={
                            canJump
                              ? () => {
                                  dispatch(setActivePage(issue.pageIndex));
                                  dispatch(clearChildFormNavigation());
                                  dispatch(setCurrentPage(1));
                                }
                              : undefined
                          }
                          sx={{ fontSize: "0.78rem" }}
                        />
                      );
                    })}
                  </Box>
                </Box>
              )}
            </Alert>
          )}

          {/* Standard LTR Navigation Bar: Back on left, Next / Review on right */}
          {!readOnly && (
            <Box
              sx={{
                mt: 3,
                display: "flex",
                alignItems: "center",
                justifyContent: showBackButton ? "space-between" : "flex-end",
                gap: 2,
                flexWrap: "wrap",
              }}
            >
              {showBackButton && (
                <Button
                  type="button"
                  variant="outlined"
                  startIcon={<ArrowBackIcon />}
                  onClick={() => {
                    const prevBaseIndex =
                      basePageIndices[currentBasePagePosition - 1];
                    dispatch(setActivePage(prevBaseIndex));
                    dispatch(setCurrentPage(1));
                  }}
                  sx={{
                    color: theme.primaryColor,
                    borderColor: theme.primaryColor,
                    "&:hover": {
                      borderColor: theme.primaryColor,
                      backgroundColor: theme.hoverUnselectedBgColor,
                    },
                  }}
                >
                  {t("dynamicform.back")}
                </Button>
              )}

              {showNextButton ? (
                <Button
                  type="button"
                  variant="outlined"
                  endIcon={<ArrowForwardIcon />}
                  onClick={() => {
                    const nextBaseIndex =
                      basePageIndices[currentBasePagePosition + 1];
                    dispatch(setActivePage(nextBaseIndex));
                    dispatch(setCurrentPage(1));
                  }}
                  sx={{
                    color: theme.primaryColor,
                    borderColor: theme.primaryColor,
                    "&:hover": {
                      borderColor: theme.primaryColor,
                      backgroundColor: theme.hoverUnselectedBgColor,
                    },
                  }}
                >
                  {t("dynamicform.next")}
                </Button>
              ) : (
                <Button
                  variant="contained"
                  type="submit"
                  disabled={!rootIsValid}
                  sx={{
                    backgroundColor: theme.primaryColor,
                    transition: "filter 0.15s ease",
                    "&:hover": {
                      backgroundColor: theme.primaryColor,
                      filter: "brightness(0.93)",
                    },
                  }}
                  endIcon={<SendIcon />}
                >
                  {isEditMode
                    ? t("dynamicform.update_review")
                    : t("dynamicform.review")}
                </Button>
              )}
            </Box>
          )}
        </form>
      )}

      {showTopBtn && (
        <Fab
          color="primary"
          size="medium"
          aria-label={t("dynamicform.scroll_to_top")}
          onClick={goToTop}
          sx={{
            position: "fixed",
            bottom: 32,
            right: 32,
            zIndex: 1000,
            backgroundColor: theme.primaryColor,
            transition: "filter 0.15s ease, transform 0.15s ease",
            "&:hover": {
              backgroundColor: theme.primaryColor,
              filter: "brightness(0.9)",
              transform: "translateY(-2px)",
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
