import React from "react";
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
} from "@mui/material";
import theme from "../../theme";
import {
  selectAllInstanceCounts,
  selectFields,
  selectPages,
} from "../../store/selectors/formSelectors";
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

const getDisplayedFields = (fields, viewMode) => {
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

const hasMandatoryFields = (fields) =>
  Array.isArray(fields) && fields.some((f) => f.required);

const hasRecommendedFields = (fields) =>
  Array.isArray(fields) && fields.some((f) => f.recommended && !f.required);

const hasOptionalFields = (fields) =>
  Array.isArray(fields) && fields.some((f) => f.optional);

const getFieldByPath = (fieldsArray, targetPath) => {
  if (!Array.isArray(fieldsArray)) return null;
  for (const field of fieldsArray) {
    if (field?.path === targetPath) {
      return field;
    }
    if (field?.children?.length) {
      const found = getFieldByPath(field.children, targetPath);
      if (found) return found;
    }
  }
  return null;
};

function FormSidebar() {
  // ALL hooks at the top — no exceptions
  const pages = useSelector(selectPages);
  const activePage = useSelector(selectActivePage);
  const fields = useSelector(selectFields);
  const {
    viewMode,
    // fieldsPerPage
  } = useSelector((state) => state.formUi);
  const { t } = useTranslation();
  const dispatch = useDispatch();

  const childPagesMeta = useSelector((state) => state.fieldSchema.childPages);
  const allInstanceCounts = useSelector(selectAllInstanceCounts);

  const childFormNavigation = useSelector((state) => state.childFormNavigation);

  const selectedPageIndex = childFormNavigation?.childPageIndex ?? activePage;

  const hasSchemaPages = Array.isArray(pages) && pages.length > 0;

  const currentPageData = pages[activePage];
  const currentDigest = currentPageData?.captureBaseDigest;

  // Build the active path indices to know which parents are "open"
  const activePathIndices = new Set();
  let currIndex = activePage;
  while (currIndex !== undefined && currIndex !== null) {
    if (activePathIndices.has(currIndex)) break;
    activePathIndices.add(currIndex);
    const meta = childPagesMeta?.[currIndex];
    currIndex = meta?.parentPageIndex;
  }

  const visiblePages = [];
  const pagesWithIndex = pages.map((page, i) => ({ ...page, index: i }));

  const basePages = pagesWithIndex.filter((p) => !p.isChildPage);

  // Group children by their intended parent page
  const childrenByParent = {};
  pagesWithIndex.forEach((p) => {
    if (p.isChildPage) {
      const meta = childPagesMeta?.[p.index];
      if (meta && meta.parentPageIndex !== undefined) {
        if (!childrenByParent[meta.parentPageIndex]) {
          childrenByParent[meta.parentPageIndex] = [];
        }
        childrenByParent[meta.parentPageIndex].push(p);
      }
    }
  });

  // Recursively build the list so children appear right under their parents
  const addPageAndChildren = (page) => {
    visiblePages.push(page);
    if (activePathIndices.has(page.index)) {
      const children = childrenByParent[page.index] || [];
      children.forEach((child) => addPageAndChildren(child));
    }
  };

  basePages.forEach((basePage) => addPageAndChildren(basePage));

  console.log("=== SIDEBAR DEBUG ===");
  console.log("activePage:", activePage);
  console.log("activePathIndices:", [...activePathIndices]);
  console.log(
    "visiblePages:",
    visiblePages.map((p) => p.id),
  );

  const isGeneratedChildPage =
    childFormNavigation?.useGeneratedPage &&
    !!childFormNavigation?.fallbackLabel;

  const displayedFields = getDisplayedFields(fields, viewMode);

  const getViewModeChipSx = (modeKey) => ({
    backgroundColor:
      viewMode === modeKey ? theme.primaryColor : theme.backgroundColor,
    color: viewMode === modeKey ? theme.backgroundColor : theme.primaryColor,
    borderColor:
      viewMode === modeKey ? theme.backgroundColor : theme.primaryColor,
    border:
      viewMode === modeKey ? "1px solid transparent" : "1px solid currentColor",
    borderRadius: "16px",
    fontSize: 15,
    fontWeight: 400,
    height: 32,
    cursor: "pointer",
    "&:hover": {
      backgroundColor:
        viewMode === modeKey
          ? theme.primaryColor
          : theme.hoverUnselectedBgColor,
      borderColor: theme.primaryColor,
    },
  });

  return (
    <Paper elevation={2} sx={{ borderRadius: 1, overflow: "hidden" }}>
      {/* SCHEMA PAGES NAV */}
      <Box
        sx={{
          px: 2,
          py: 2,
          backgroundColor: theme.primaryColor,
          color: theme.backgroundColor,
        }}
      >
        <Typography variant="h6">Form Navigation</Typography>
      </Box>

      <Box
        sx={{
          p: 2,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 1,
          flexWrap: "wrap",
        }}
      >
        {hasMandatoryFields(fields) && (
          <Chip
            label={t("dynamicform.mandatory")}
            clickable
            sx={getViewModeChipSx("mandatory")}
            onClick={() => dispatch(setViewMode("mandatory"))}
          />
        )}
        {hasRecommendedFields(fields) && (
          <Chip
            label={t("dynamicform.recommended")}
            clickable
            onClick={() => dispatch(setViewMode("recommended"))}
            sx={getViewModeChipSx("recommended")}
          />
        )}
        {hasOptionalFields(fields) && (
          <Chip
            label={t("dynamicform.complete")}
            clickable
            onClick={() => dispatch(setViewMode("complete"))}
            sx={getViewModeChipSx("complete")}
          />
        )}
      </Box>
      <Typography variant="body2" px="5px" pb="10px" align="center">
        Showing {displayedFields.length} of {fields.length} fields
      </Typography>

      <Divider />

      {isGeneratedChildPage ? (
        <List disablePadding>
          <ListItemButton
            selected
            onClick={() => {}}
            sx={{
              "&.Mui-selected": {
                backgroundColor: theme.secondaryColor,
                color: theme.primaryColor,
              },
              "&.Mui-selected:hover": {
                backgroundColor: theme.secondaryColor,
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
            const childMeta = childPagesMeta?.[i]; // from fieldSchema.childPages
            const isChildPage = !!page.isChildPage;
            const depth = page.depth || 0;

            return (
              <ListItemButton
                key={page.id}
                selected={selectedPageIndex === i}
                onClick={() => {
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
                      const confirmDiscard = window.confirm(
                        "All changes that you have made will get discarded. Do you want to continue?",
                      );
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
                              f?.multiple === true || f?.multiple === "true";

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
                      parentField?.multiple === "true";

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
                  } else {
                    dispatch(setActivePage(i));
                    dispatch(clearChildFormNavigation());
                  }
                }}
                sx={{
                  pl: 2 + (page.depth || 0) * 2,
                  "&.Mui-selected": {
                    backgroundColor: theme.secondaryColor,
                    color: theme.primaryColor,
                  },
                  "&.Mui-selected:hover": {
                    backgroundColor: theme.secondaryColor,
                  },
                }}
              >
                <ListItemText primary={page.sidebarLabel} />
              </ListItemButton>
            );
          })}
        </List>
      ) : null}
      {/* {hasSchemaPages && (
        <>
          <Box
            sx={{
              px: 2,
              py: 1.5,
              backgroundColor: theme.secondaryColor,
              color: theme.primaryColor,
            }}
          >
            <Typography variant="subtitle1">Schema Pages</Typography>
          </Box>

          <List disablePadding>
            {pages.map((page, i) => (
              <ListItemButton
                key={page.id}
                selected={activePage === i}
                onClick={() => dispatch(setActivePage(i))}
                sx={{
                  "&.Mui-selected": {
                    backgroundColor: theme.secondaryColor,
                    color: theme.primaryColor,
                  },
                  "&.Mui-selected:hover": {
                    backgroundColor: theme.secondaryColor,
                  },
                }}
              >
                <ListItemText primary={page.sidebarLabel} />
              </ListItemButton>
            ))}
          </List>
        </>
      )} */}

      {/* <Divider /> */}

      {/* <List>
        {pageItems.map((item) => (
          <ListItemButton
            key={item.pageNumber}
            selected={currentPage === item.pageNumber}
            onClick={() => dispatch(setCurrentPage(item.pageNumber))}
            sx={{
              "&.Mui-selected": {
                backgroundColor: theme.secondaryColor,
                color: theme.primaryColor,
              },
              "&.Mui-selected:hover": {
                backgroundColor: theme.secondaryColor,
              },
            }}
          >
            <ListItemText
              primary={`${t("dynamicform.page")} ${item.pageNumber}`}
              secondary={`${item.label} • ${item.count} ${t("dynamicform.fields")}`}
            />
          </ListItemButton>
        ))}
      </List> */}
    </Paper>
  );
}

export default FormSidebar;
