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
          {pages.map((page, i) => {
            const childMeta = childPagesMeta?.[i]; // from fieldSchema.childPages
            const isChildPage = !!childMeta;

            return (
              <ListItemButton
                key={page.id}
                selected={selectedPageIndex === i}
                onClick={() => {
                  if (isChildPage) {
                    const parentFieldPath = childMeta.parentFieldPath; // e.g. "title"
                    const parentPageIndex = childMeta.parentPageIndex;
                    const label = childMeta.label;

                    // Use instanceCountsSlice shape: state.instanceCounts.instanceCounts
                    const count = allInstanceCounts[parentFieldPath] || 0;
                    const nextValuePath = `${parentFieldPath}[${count}]`;

                    dispatch(
                      setChildFormNavigation({
                        nextValuePath,
                        parentPageIndex,
                        childPageIndex: i,
                        isEdit: false, // behaves like ADD
                        fallbackLabel: label,
                        fallbackFieldPath: parentFieldPath,
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
