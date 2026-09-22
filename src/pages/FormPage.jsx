import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import { Box } from "@mui/system";
import DynamicForm from "../components/Stateful/DynamicForm";
import { useTranslation } from "../utils/OpenAIRE/TranslationContext";
import Footer from "../components/Stateless/Footer";
import PageHeaders from "../components/Stateless/PageHeaders";
import { useSelector, useDispatch } from "react-redux";
import {
  selectFields,
  selectHasFormData,
  selectSchemaName,
  selectPages,
} from "../store/selectors/formSelectors";
import {
  setFields,
  setFormatPatterns,
  setDepFormatPatterns,
  setSchemaName,
  setPages,
} from "../store/slices/fieldSchemaSlice";
import { extractJsonSchemaAsync } from "../utils/extractJsonSchema";
import { extractAttributes } from "../utils/extractAttributes";
import { enrichFieldsWithPaths } from "../utils/enrichFieldsWithPaths";
import { serializeRegexPatterns } from "../utils/regexUtils";
import {
  Link,
  Typography,
  Drawer,
  Button,
  useMediaQuery,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import theme from "../theme";
import { setMode } from "../store/slices/modeSlice";
import FormSidebar from "../components/Stateful/FormSidebar";
import { extractPages } from "../utils/extractPages";
import { selectActivePage } from "../store/slices/activePageSlice";

function FormPage() {
  const { t } = useTranslation(); // use translation function

  const navigate = useNavigate();

  const dispatch = useDispatch();

  const pages = useSelector(selectPages);
  const activePage = useSelector(selectActivePage);

  const childFormNavigation = useSelector((state) => state.childFormNavigation);

  const activePageData = pages?.[activePage];
  const activePageLabel = childFormNavigation?.useGeneratedPage
    ? childFormNavigation.fallbackLabel || ""
    : childFormNavigation?.childPageIndex === activePage &&
        childFormNavigation?.fallbackLabel
      ? childFormNavigation.fallbackLabel
      : activePageData?.label || "";

  useEffect(() => {
    dispatch(setMode("edit"));
  }, [dispatch]);

  const [searchParams] = useSearchParams();
  const { schemaSlug } = useParams();

  const iframeParam = searchParams.get("iframe");
  const isIframeMode = iframeParam === "true" || window.self !== window.top;

  const isSmallScreen = useMediaQuery("(max-width: 1024px)");
  const [sidebarDrawerOpen, setSidebarDrawerOpen] = useState(false);
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);

  const isCollapsed = isSmallScreen || isDesktopCollapsed;

  // Redux state
  const reduxSchema = useSelector(selectSchemaName);
  const fields = useSelector(selectFields);
  const hasFormData = useSelector(selectHasFormData);

  // Try URL search param first, then route param, then Redux
  const schemaFromUrl = searchParams.get("schema") || schemaSlug;
  const schema = reduxSchema || schemaFromUrl;
  const isEditMode = hasFormData;

  // AUTO-LOAD SCHEMA
  useEffect(() => {
    const loadSchema = async () => {
      if (!schema || Array.isArray(fields)) return; // already loaded

      try {
        const jsonSchema = await extractJsonSchemaAsync(schema);
        if (!jsonSchema) throw new Error("Schema fetch failed");

        dispatch(setSchemaName(schema));
        const {
          fields: rawFields,
          formatPatterns,
          depFormatPatterns,
        } = extractAttributes(jsonSchema);
        const enrichedFields = enrichFieldsWithPaths(rawFields);
        const pages = extractPages(jsonSchema, enrichedFields);

        dispatch(setFields(enrichedFields));
        dispatch(setPages(pages));
        dispatch(setFormatPatterns(serializeRegexPatterns(formatPatterns)));
        dispatch(
          setDepFormatPatterns(serializeRegexPatterns(depFormatPatterns)),
        );
      } catch (error) {
        console.error("Schema load failed:", error);
      }
    };

    loadSchema();
  }, [schema, dispatch, fields, fields?.length]); // deps: schema changes or fields empty

  // Loading states
  if (!schema) {
    return (
      <div style={{ textAlign: "center", padding: "50px" }}>
        <Typography>
          No schema selected. <Link href="/">Go to Home</Link>
        </Typography>
      </div>
    );
  }

  if (!Array.isArray(fields)) {
    return (
      <div style={{ textAlign: "center", padding: "50px" }}>
        <Typography>Loading {schema} schema...</Typography>
      </div>
    );
  }

  return (
    <div className="FormPage" style={{ maxWidth: "100%", overflowX: "hidden" }}>
      <PageHeaders
        page_heading={
          isEditMode ? t("formpage.edit_header") : t("formpage.write_header")
        }
        tooltip_description={
          isEditMode ? t("formpage.edit_tooltip") : t("formpage.write_tooltip")
        }
        help_button_redirect={() => navigate("/form-help")}
      />

      {/* Slide-over Drawer for Collapsed Sidebar - always in front of form content */}
      <Drawer
        anchor="left"
        open={sidebarDrawerOpen}
        onClose={() => setSidebarDrawerOpen(false)}
        sx={{
          zIndex: 1400,
          "& .MuiDrawer-paper": {
            width: 280,
            boxSizing: "border-box",
            backgroundColor: "#fff",
            boxShadow: "4px 0 24px rgba(0, 0, 0, 0.15)",
          },
        }}
      >
        <FormSidebar
          isDrawer
          onClose={() => setSidebarDrawerOpen(false)}
          onNavigate={() => setSidebarDrawerOpen(false)}
        />
      </Drawer>

      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          maxWidth: 1400,
          margin: "0 auto",
          px: { xs: 1.5, sm: 2, md: 3 },
          py: isIframeMode ? 2 : 4,
          gap: isCollapsed ? 0 : 4,
        }}
      >
        {!isCollapsed && (
          <Box
            component="aside"
            sx={{
              width: 280,
              flexShrink: 0,
              position: "sticky",
              top: 24,
            }}
          >
            <FormSidebar
              isDocked
              onCollapse={() => setIsDesktopCollapsed(true)}
            />
          </Box>
        )}

        <Box
          component="main"
          sx={{
            flexGrow: 1,
            minWidth: 0,
            width: "100%",
          }}
        >
          <Box
            sx={{
              maxWidth: isCollapsed ? "100%" : 1000,
              margin: isCollapsed ? "0 auto" : 0,
            }}
          >
            {/* Top Bar for Section Navigation when Sidebar is Collapsed (Option A) */}
            {isCollapsed && (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 2,
                  mb: 2.5,
                  p: 1.5,
                  borderRadius: 2,
                  backgroundColor: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 1px 2px rgba(0, 0, 0, 0.04)",
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  <Button
                    variant="contained"
                    onClick={() => setSidebarDrawerOpen(true)}
                    startIcon={<MenuIcon sx={{ color: "#fff" }} />}
                    sx={{
                      backgroundColor: theme.primaryColor,
                      color: "#fff",
                      fontWeight: 600,
                      textTransform: "none",
                      boxShadow: "none",
                      "&:hover": {
                        backgroundColor: theme.primaryColor,
                        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.12)",
                      },
                      flexShrink: 0,
                    }}
                  >
                    Sections
                  </Button>
                  {!isSmallScreen && isDesktopCollapsed && (
                    <Button
                      size="small"
                      onClick={() => setIsDesktopCollapsed(false)}
                      sx={{
                        textTransform: "none",
                        fontSize: "0.8rem",
                        color: "text.secondary",
                      }}
                    >
                      Dock Sidebar
                    </Button>
                  )}
                </Box>

                <Box sx={{ minWidth: 0, textAlign: "right" }}>
                  <Typography
                    variant="subtitle2"
                    sx={{
                      fontWeight: 600,
                      color: "text.primary",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {activePageLabel || "Section Navigation"}
                  </Typography>
                  {pages && pages.length > 0 && (
                    <Typography
                      variant="caption"
                      sx={{ color: "text.secondary", display: "block" }}
                    >
                      Section {(activePage ?? 0) + 1} of {pages.length}
                    </Typography>
                  )}
                </Box>
              </Box>
            )}

            {activePageLabel && (
              <Typography variant="h5" sx={{ mb: 2 }}>
                {activePageLabel}
              </Typography>
            )}
            <DynamicForm isEditMode={isEditMode} />
          </Box>
        </Box>
      </Box>

      {/* <pre>{JSON.stringify(fields, null, 2)}</pre> */}
      {/* <Box sx={{ maxWidth: 1000, margin: "auto", padding: 5 }}>
        <DynamicForm
          language={lang}
          isEditMode={isEditMode} // TRUE when editing existing data
        />
      </Box> */}
      <Footer powered_by={t("powered_by")} supported_by={t("supported_by")} />
    </div>
  );
}

export default FormPage;
