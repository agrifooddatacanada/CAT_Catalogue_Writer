import React, { useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  Box,
  Paper,
  Typography,
  List,
  ListItemButton,
  ListItemText,
  Divider,
  Chip,
  IconButton,
  Tooltip,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import theme from "../../theme";
import {
  selectAllInstanceCounts,
  selectFields,
  selectPages,
  selectSchemaName,
} from "../../store/selectors/formSelectors";
import { selectValidationSummary } from "../../store/selectors/popupValidationSelectors";
import { setViewMode } from "../../store/slices/formUiSlice";
import { useTranslation } from "../../utils/OpenAIRE/TranslationContext";
import {
  setActivePage,
  selectActivePage,
} from "../../store/slices/activePageSlice";
import {
  clearChildFormNavigation,
  setChildFormNavigation,
} from "../../store/slices/childFormNavigationSlice";
import {
  hasMandatoryFields,
  hasRecommendedFields,
  hasOptionalFields,
  getDisplayedFields,
  isFieldVisibleInViewMode,
} from "../../utils/viewModeUtils";
import { getFieldByPath } from "../../utils/fieldTreeUtils";
import { useNotification } from "../Stateless/NotificationContext";

function FormSidebar({ onNavigate, onClose, isDrawer = false, onCollapse }) {
  const pages = useSelector(selectPages);
  const activePage = useSelector(selectActivePage);
  const fields = useSelector(selectFields);
  const schemaName = useSelector(selectSchemaName);
  const {
    viewMode,
    currentPage = 1,
    fieldsPerPage = 6,
  } = useSelector((state) => state.formUi || {});
  const { t } = useTranslation();
  const { confirm } = useNotification();
  const dispatch = useDispatch();

  const childPagesMeta = useSelector((state) => state.fieldSchema.childPages);
  const allInstanceCounts = useSelector(selectAllInstanceCounts);
  const childFormNavigation = useSelector((state) => state.childFormNavigation);
  const validationSummary = useSelector(selectValidationSummary);

  const selectedPageIndex = childFormNavigation?.childPageIndex ?? activePage;
  const hasSchemaPages = Array.isArray(pages) && pages.length > 0;

  const { basePages, visiblePages } = useMemo(() => {
    const activePathIndices = new Set();
    let currIndex = activePage;
    while (currIndex !== undefined && currIndex !== null) {
      if (activePathIndices.has(currIndex)) break;
      activePathIndices.add(currIndex);
      const meta = childPagesMeta?.[currIndex];
      currIndex = meta?.parentPageIndex;
    }

    const safePages = Array.isArray(pages) ? pages : [];
    const pagesWithIndex = safePages.map((page, i) => ({ ...page, index: i }));
    const computedBasePages = pagesWithIndex.filter((p) => !p.isChildPage);

    const childrenByParent = {};
    pagesWithIndex.forEach((p) => {
      if (p.isChildPage) {
        const meta = childPagesMeta?.[p.index];
        if (meta && meta.parentPageIndex !== undefined) {
          const parentField = getFieldByPath(fields, meta.parentFieldPath);
          if (isFieldVisibleInViewMode(parentField, viewMode)) {
            if (!childrenByParent[meta.parentPageIndex]) {
              childrenByParent[meta.parentPageIndex] = [];
            }
            childrenByParent[meta.parentPageIndex].push(p);
          }
        }
      }
    });

    const extractPaths = (fieldsArray) => {
      let paths = [];
      fieldsArray.forEach((f) => {
        if (f?.path) paths.push(f.path);
        if (f?.children && Array.isArray(f.children)) {
          paths = paths.concat(extractPaths(f.children));
        }
      });
      return paths;
    };

    Object.keys(childrenByParent).forEach((parentIndexStr) => {
      const parentIndex = parseInt(parentIndexStr, 10);
      const parentPage = safePages[parentIndex];
      if (parentPage && parentPage.items) {
        const orderedPaths = [];
        parentPage.items.forEach((item) => {
          if (item.type === "field" && item.field) {
            orderedPaths.push(...extractPaths([item.field]));
          } else if (item.type === "section" && item.fields) {
            orderedPaths.push(...extractPaths(item.fields));
          }
        });

        childrenByParent[parentIndex].sort((a, b) => {
          const metaA = childPagesMeta?.[a.index];
          const metaB = childPagesMeta?.[b.index];
          let idxA = orderedPaths.indexOf(metaA?.parentFieldPath);
          let idxB = orderedPaths.indexOf(metaB?.parentFieldPath);
          if (idxA === -1) idxA = Infinity;
          if (idxB === -1) idxB = Infinity;
          if (idxA !== idxB) return idxA - idxB;
          return a.index - b.index;
        });
      }
    });

    const computedVisible = [];
    const addPageAndChildren = (page) => {
      computedVisible.push(page);
      if (activePathIndices.has(page.index)) {
        const children = childrenByParent[page.index] || [];
        children.forEach((child) => addPageAndChildren(child));
      }
    };

    computedBasePages.forEach((basePage) => addPageAndChildren(basePage));

    return {
      basePages: computedBasePages,
      visiblePages: computedVisible,
    };
  }, [activePage, childPagesMeta, pages, fields, viewMode]);

  const isGeneratedChildPage =
    childFormNavigation?.useGeneratedPage &&
    !!childFormNavigation?.fallbackLabel;

  const displayedFields = useMemo(
    () => getDisplayedFields(fields, viewMode),
    [fields, viewMode],
  );
  const totalFlatPages = Math.ceil(displayedFields.length / fieldsPerPage);

  let resolvedBasePageIndex = selectedPageIndex;
  while (
    resolvedBasePageIndex !== undefined &&
    resolvedBasePageIndex !== null &&
    pages?.[resolvedBasePageIndex]?.isChildPage
  ) {
    const meta = childPagesMeta?.[resolvedBasePageIndex];
    if (meta?.parentPageIndex !== undefined) {
      resolvedBasePageIndex = meta.parentPageIndex;
    } else {
      break;
    }
  }
  const currentBasePageNumber =
    basePages.findIndex((p) => p.index === resolvedBasePageIndex) + 1;

  const currentDisplayPage = hasSchemaPages
    ? currentBasePageNumber
    : totalFlatPages === 0
      ? 0
      : currentPage;
  const totalDisplayPages = hasSchemaPages ? basePages.length : totalFlatPages;

  const getViewModeChipSx = (modeKey) => ({
    backgroundColor:
      viewMode === modeKey ? theme.primaryColor : theme.backgroundColor,
    color:
      viewMode === modeKey ? theme.primaryContrastText : theme.primaryTextColor,
    borderColor:
      viewMode === modeKey ? theme.primaryColor : theme.borderColor,
    border: "1px solid",
    borderRadius: "16px",
    fontSize: 14,
    fontWeight: viewMode === modeKey ? 700 : 600,
    height: 32,
    cursor: "pointer",
    "&:hover": {
      backgroundColor:
        viewMode === modeKey
          ? theme.primaryHoverColor
          : theme.hoverUnselectedBgColor,
      borderColor: theme.primaryHoverColor,
    },
  });

  const showMandatory = useMemo(() => hasMandatoryFields(fields), [fields]);
  const showRecommended = useMemo(() => hasRecommendedFields(fields), [fields]);
  const showOptional = useMemo(() => hasOptionalFields(fields), [fields]);
  const availableModesCount = [
    showMandatory,
    showRecommended,
    showOptional,
  ].filter(Boolean).length;

  const pageCountText = (
    totalDisplayPages === 1
      ? t("sidebar.showing_page_singular")
      : t("sidebar.showing_page_plural")
  )
    .replace("{{current}}", String(currentDisplayPage))
    .replace("{{total}}", String(totalDisplayPages));

  const handleSelectPage = async (page) => {
    const i = page.index;
    const childMeta = childPagesMeta?.[i];
    const isChildPage = !!page.isChildPage;

    const hasActiveChildPage =
      childFormNavigation?.childPageIndex !== undefined &&
      childFormNavigation?.childPageIndex !== null;

    if (hasActiveChildPage) {
      if (selectedPageIndex === i) {
        return;
      }

      let isSuccessor = false;
      let curr = i;
      while (curr !== undefined && curr !== null) {
        const meta = childPagesMeta?.[curr];
        if (meta?.parentPageIndex === selectedPageIndex) {
          isSuccessor = true;
          break;
        }
        curr = meta?.parentPageIndex;
      }

      if (!isSuccessor) {
        const confirmDiscard = await confirm({
          title: t("sidebar.discard_changes_title"),
          message: t("sidebar.discard_changes_message"),
          confirmLabel: t("sidebar.discard_confirm"),
          cancelLabel: t("common.cancel"),
          confirmColor: "error",
        });
        if (!confirmDiscard) {
          return;
        }
      }
    }

    if (isChildPage) {
      const parentFieldPath = childMeta?.parentFieldPath;
      const parentPageIndex = childMeta?.parentPageIndex;
      const label = childMeta?.label || page.sidebarLabel;

      let count = 0;
      let actualParentPath = parentFieldPath;

      if (parentFieldPath && allInstanceCounts) {
        if (allInstanceCounts[parentFieldPath] !== undefined) {
          count = allInstanceCounts[parentFieldPath];
        } else {
          let found = false;
          for (const key of Object.keys(allInstanceCounts)) {
            const schemaKey = key.replace(/\[\d+\]/g, "");
            if (schemaKey === parentFieldPath) {
              count = allInstanceCounts[key];
              actualParentPath = key;
              found = true;
              break;
            }
          }
          if (!found && parentFieldPath) {
            const segments = parentFieldPath.split(".");
            let currentSchemaPath = "";
            let constructedPath = "";

            segments.forEach((seg, index) => {
              currentSchemaPath = currentSchemaPath
                ? `${currentSchemaPath}.${seg}`
                : seg;
              const f = getFieldByPath(fields, currentSchemaPath);
              const isSegMultiple =
                f?.multiple === true ||
                f?.multiple === "true" ||
                (f?.children && f.children.length > 0);

              constructedPath = constructedPath
                ? `${constructedPath}.${seg}`
                : seg;

              if (isSegMultiple && index < segments.length - 1) {
                constructedPath += "[0]";
              }
            });
            actualParentPath = constructedPath;
          }
        }
      }

      const parentField = getFieldByPath(fields, parentFieldPath);
      const isMultiple =
        parentField?.multiple === true ||
        parentField?.multiple === "true" ||
        (parentField?.children && parentField.children.length > 0);

      let nextValuePath;
      let isEdit = false;

      if (!isMultiple) {
        nextValuePath = actualParentPath;
        isEdit = true;
      } else {
        nextValuePath = `${actualParentPath}[${count}]`;
        isEdit = false;
      }

      dispatch(
        setChildFormNavigation({
          nextValuePath,
          parentPageIndex,
          childPageIndex: i,
          isEdit,
          fallbackLabel: label,
          fallbackFieldPath: actualParentPath,
          useGeneratedPage: false,
        }),
      );

      dispatch(setActivePage(i));
      onNavigate?.();
    } else {
      dispatch(setActivePage(i));
      dispatch(clearChildFormNavigation());
      onNavigate?.();
    }
  };

  return (
    <Paper
      component="nav"
      aria-label={t("sidebar.form_navigation")}
      elevation={isDrawer ? 0 : 2}
      sx={{
        borderRadius: isDrawer ? 0 : 1,
        overflow: "hidden",
        width: 280,
        height: isDrawer ? "100%" : "auto",
        maxHeight: isDrawer ? "100vh" : "calc(100vh - 48px)",
        overflowY: "auto",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box
        sx={{
          px: 2,
          py: 1.5,
          backgroundColor: theme.primaryColor,
          color: theme.primaryContrastText,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1,
        }}
      >
        <Typography
          variant="h6"
          component="h2"
          sx={{
            fontSize: "1.05rem",
            fontWeight: 700,
            color: theme.primaryContrastText,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {schemaName || t("sidebar.form_navigation")}
        </Typography>
        {onClose && (
          <IconButton
            onClick={onClose}
            size="small"
            sx={{
              color: theme.primaryContrastText,
              "&:hover": {
                backgroundColor: "rgba(255, 255, 255, 0.18)",
              },
            }}
            aria-label={t("sidebar.close_sidebar")}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        )}
        {!onClose && onCollapse && (
          <Tooltip title={t("sidebar.collapse_sidebar")}>
            <IconButton
              onClick={onCollapse}
              size="small"
              sx={{
                color: theme.primaryContrastText,
                "&:hover": {
                  backgroundColor: "rgba(255, 255, 255, 0.18)",
                },
              }}
              aria-label={t("sidebar.collapse_sidebar")}
            >
              <ChevronLeftIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {availableModesCount > 1 && (
        <Box
          sx={{
            px: 2,
            pt: 2,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 1,
            flexWrap: "wrap",
          }}
        >
          {showMandatory && (
            <Chip
              label={t("dynamicform.mandatory")}
              clickable
              aria-pressed={viewMode === "mandatory"}
              sx={getViewModeChipSx("mandatory")}
              onClick={() => dispatch(setViewMode("mandatory"))}
            />
          )}
          {showRecommended && (
            <Chip
              label={t("dynamicform.recommended")}
              clickable
              aria-pressed={viewMode === "recommended"}
              onClick={() => dispatch(setViewMode("recommended"))}
              sx={getViewModeChipSx("recommended")}
            />
          )}
          {showOptional && (
            <Chip
              label={t("dynamicform.complete")}
              clickable
              aria-pressed={viewMode === "complete"}
              onClick={() => dispatch(setViewMode("complete"))}
              sx={getViewModeChipSx("complete")}
            />
          )}
        </Box>
      )}
      <Typography variant="body2" px="5px" py="10px" align="center">
        {pageCountText}
      </Typography>

      <Divider />

      {isGeneratedChildPage ? (
        <List disablePadding>
          <ListItemButton
            selected
            onClick={() => {
              onNavigate?.();
            }}
            sx={{
              "&.Mui-selected": {
                backgroundColor: theme.secondaryColor,
                color: theme.primaryTextColor,
                fontWeight: 600,
              },
              "&.Mui-selected:hover": {
                backgroundColor: theme.selectedMenuBgColor,
              },
            }}
          >
            <ListItemText primary={childFormNavigation.fallbackLabel} />
          </ListItemButton>
        </List>
      ) : hasSchemaPages ? (
        <List disablePadding>
          {visiblePages.map((page) => {
            const i = page.index;
            const stats = !page.isChildPage
              ? validationSummary.pageStats?.[i]
              : null;
            const hasIssues = Boolean(stats && stats.issueCount > 0 && !validationSummary.isEmptyForm);
            const isSectionComplete = Boolean(
              stats &&
                stats.issueCount === 0 &&
                ((stats.requiredTotal > 0 &&
                  stats.requiredFilled === stats.requiredTotal) ||
                  (stats.requiredTotal === 0 && stats.filledFields > 0)),
            );

            return (
              <ListItemButton
                key={page.id}
                selected={selectedPageIndex === i}
                aria-current={selectedPageIndex === i ? "step" : undefined}
                onClick={() => handleSelectPage(page)}
                sx={{
                  pl: 2 + (page.depth || 0) * 2,
                  "&.Mui-selected": {
                    backgroundColor: theme.secondaryColor,
                    color: theme.primaryTextColor,
                    "& .MuiListItemText-primary": {
                      fontWeight: 600,
                    },
                  },
                  "&.Mui-selected:hover": {
                    backgroundColor: theme.selectedMenuBgColor,
                  },
                }}
              >
                <ListItemText primary={page.sidebarLabel} />
                {isSectionComplete && (
                  <Tooltip title={t("sidebar.section_complete")}>
                    <CheckCircleOutlineIcon
                      fontSize="small"
                      sx={{ color: "success.main", ml: 1, flexShrink: 0 }}
                    />
                  </Tooltip>
                )}
                {hasIssues && (
                  <Tooltip
                    title={t("sidebar.section_issues").replace(
                      "{{count}}",
                      String(stats.issueCount),
                    )}
                  >
                    <Box
                      sx={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 0.25,
                        color: "warning.dark",
                        ml: 1,
                        flexShrink: 0,
                      }}
                    >
                      <ErrorOutlineIcon sx={{ fontSize: 16 }} />
                      <Typography variant="caption" sx={{ fontWeight: 700 }}>
                        {stats.issueCount}
                      </Typography>
                    </Box>
                  </Tooltip>
                )}
              </ListItemButton>
            );
          })}
        </List>
      ) : null}
    </Paper>
  );
}

export default FormSidebar;
