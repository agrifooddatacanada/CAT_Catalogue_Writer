import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import { Box } from "@mui/system";
import DynamicForm from "../components/Stateful/DynamicForm";
import { useTranslation } from "../utils/OpenAIRE/TranslationContext";
import Footer from "../components/Stateless/Footer";
import PageHeaders from "../components/Stateless/PageHeaders";
import { useSelector, useDispatch } from "react-redux";
import {
  selectFields,
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
import { setMode, selectMode } from "../store/slices/modeSlice";
import { setViewMode } from "../store/slices/formUiSlice";
import { getInitialViewMode } from "../utils/viewModeUtils";
import FormSidebar from "../components/Stateful/FormSidebar";
import { extractPages } from "../utils/extractPages";
import { selectActivePage } from "../store/slices/activePageSlice";
import { checkIsIframe } from "../utils/iframeUtils";
import { setInitialFormState } from "../store/slices/formValueSlice";
import { buildInstanceCountsFromValues } from "../utils/instanceCounts";
import { setAllInstanceCounts } from "../store/slices/instanceCountsSlice";
import { setIsUploaded, setRecordMetadata } from "../store/slices/uploadFileSlice";
import { escapeKey } from "../utils/pathEncoding";
import { normalizeNestedFields } from "../utils/normalizeJson";

// FLATTEN NESTED OBJECT TO SINGLE LEVEL WITH DOT NOTATION KEYS
function flatten(obj, parentKey = "", result = {}) {
  if (Array.isArray(obj)) {
    if (obj.length === 0) {
      result[parentKey] = obj;
    } else {
      obj.forEach((item, index) => {
        const newKey = `${parentKey}[${index}]`;
        if (item !== null && typeof item === "object") {
          flatten(item, newKey, result);
        } else {
          result[newKey] = item;
        }
      });
    }
    return result;
  }
  for (const key in obj) {
    if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;

    const value = obj[key];
    const escapedKey = escapeKey(key);
    const newKey = parentKey ? `${parentKey}.${escapedKey}` : escapedKey;

    if (value !== null && typeof value === "object") {
      flatten(value, newKey, result);
    } else {
      result[newKey] = value;
    }
  }
  return result;
}

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

  const [searchParams] = useSearchParams();
  const { schemaSlug } = useParams();

  const isIframeMode = checkIsIframe(searchParams);

  const isSmallScreen = useMediaQuery("(max-width: 1024px)");
  const [sidebarDrawerOpen, setSidebarDrawerOpen] = useState(false);
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);

  const isCollapsed = isSmallScreen || isDesktopCollapsed;

  // Redux state
  const reduxSchema = useSelector(selectSchemaName);
  const fields = useSelector(selectFields);
  const mode = useSelector(selectMode);

  // Try URL search param first, then route param, then Redux
  const schemaFromUrl = searchParams.get("schema") || schemaSlug;
  const schema = reduxSchema || schemaFromUrl;
  const isEditMode = mode === "edit" || searchParams.get("mode") === "edit";

  const isPublishedParam =
    searchParams.get("isPublished") === "true" ||
    searchParams.get("published") === "true";

  const recordAppliedRef = useRef(false);
  const pendingRecordRef = useRef(null);
  const lastAppliedRecordJsonRef = useRef("");

  const applyRecordToForm = useCallback(
    (jsonData, targetFields = fields, published = isPublishedParam) => {
      if (!jsonData || typeof jsonData !== "object") return;

      let jsonStr = "";
      try {
        jsonStr = JSON.stringify(jsonData);
      } catch {
        jsonStr = "";
      }

      if (jsonStr && lastAppliedRecordJsonRef.current === jsonStr && recordAppliedRef.current) {
        return;
      }

      if (!targetFields || !Array.isArray(targetFields) || targetFields.length === 0) {
        pendingRecordRef.current = jsonData;
        return;
      }

      try {
        const normalizedJson = normalizeNestedFields(jsonData, targetFields);
        const formValues = flatten(normalizedJson);

        dispatch(setInitialFormState(formValues));
        const instanceCount = buildInstanceCountsFromValues(formValues);
        dispatch(setAllInstanceCounts(instanceCount));
        dispatch(setIsUploaded(true));
        dispatch(setMode("edit"));

        const loadedVersion =
          jsonData.dcterms?.version ||
          jsonData.version ||
          jsonData["dcterms:version"] ||
          "1.0.0";
        const loadedIsVersionOf =
          jsonData.dcterms?.isVersionOf ||
          jsonData.isVersionOf ||
          jsonData["dcterms:isVersionOf"] ||
          null;

        dispatch(
          setRecordMetadata({
            originalSaid: published ? (jsonData.d || null) : null,
            recordVersion: loadedVersion,
            isVersionOf: loadedIsVersionOf,
            schemaId: jsonData["@schema_id"] || null,
            isPublished: published,
          })
        );
        lastAppliedRecordJsonRef.current = jsonStr;
        recordAppliedRef.current = true;
        pendingRecordRef.current = null;
      } catch (err) {
        console.error("Error applying record to form:", err);
      }
    },
    [dispatch, fields, isPublishedParam]
  );

  // AUTO-LOAD RECORD from URL params, sessionStorage, or postMessage
  useEffect(() => {
    // Clean up any stale dataUrl in sessionStorage that starts with "data:"
    try {
      const existingDataUrl = window.sessionStorage.getItem("dataUrl");
      if (existingDataUrl && existingDataUrl.startsWith("data:")) {
        window.sessionStorage.removeItem("dataUrl");
      }
    } catch {
      // Ignore sessionStorage access errors
    }

    // 1. Check dataUrl from search params or sessionStorage
    const dataUrl = searchParams.get("dataUrl");
    if (dataUrl) {
      if (!dataUrl.startsWith("data:")) {
        try {
          window.sessionStorage.setItem("dataUrl", dataUrl);
        } catch (e) {
          console.warn("Could not save dataUrl to sessionStorage:", e);
        }
      }
      if (dataUrl.startsWith("data:application/json")) {
        try {
          const commaIndex = dataUrl.indexOf(",");
          if (commaIndex !== -1) {
            const isBase64 = dataUrl.slice(0, commaIndex).includes(";base64");
            const dataStr = dataUrl.slice(commaIndex + 1);
            const decoded = isBase64 ? atob(dataStr) : decodeURIComponent(dataStr);
            const parsed = JSON.parse(decoded);
            applyRecordToForm(parsed);
          }
        } catch (e) {
          console.warn("Could not inline decode dataUrl, falling back to fetch:", e);
          fetch(dataUrl)
            .then((r) => r.json())
            .then((data) => applyRecordToForm(data))
            .catch((err) => console.warn("dataUrl fetch failed:", err));
        }
      } else {
        fetch(dataUrl)
          .then((r) => r.json())
          .then((data) => applyRecordToForm(data))
          .catch((err) => console.warn("dataUrl fetch failed:", err));
      }
    }

    // 2. Check pending record stored in sessionStorage by App.js
    try {
      const storedPending = window.sessionStorage.getItem("contexthub_pending_record");
      if (storedPending) {
        const parsed = JSON.parse(storedPending);
        if (parsed && typeof parsed === "object") {
          applyRecordToForm(parsed);
        }
      }
    } catch (e) {
      console.warn("Could not parse sessionStorage pending record:", e);
    }

    // 3. Listen for postMessage from parent (iframe) or opener (popup / new tab)
    const handleMessage = (event) => {
      try {
        const msg = event.data;
        if (!msg || typeof msg !== "object") return;

        if (
          msg.type === "SET_RECORD" ||
          msg.type === "LOAD_RECORD" ||
          msg.type === "SET_DATA" ||
          msg.type === "SET_CATALOGUE_RECORD" ||
          msg.type === "IMPORT_RECORD" ||
          msg.type === "PREFILL_RECORD" ||
          msg.type === "PREFILL" ||
          msg.action === "LOAD_RECORD"
        ) {
          const record = msg.record || msg.data || msg.payload;
          const msgPublished =
            msg.isPublished !== undefined
              ? Boolean(msg.isPublished)
              : isPublishedParam;
          try {
            window.sessionStorage.setItem("contexthub_is_published", String(msgPublished));
          } catch {}
          if (record && typeof record === "object") {
            applyRecordToForm(record, fields, msgPublished);
          }
        }
      } catch (err) {
        console.warn("Error handling postMessage in FormPage:", err);
      }
    };

    window.addEventListener("message", handleMessage);

    // 4. Request record from parent (iframe) and opener (new tab)
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: "REQUEST_RECORD" }, "*");
      window.parent.postMessage({ type: "REQUEST_USER_CONTEXT" }, "*");
    }
    if (window.opener && window.opener !== window && !window.opener.closed) {
      try {
        window.opener.postMessage({ type: "REQUEST_RECORD" }, "*");
        window.opener.postMessage({ type: "REQUEST_USER_CONTEXT" }, "*");
      } catch (e) {
        console.warn("Could not request record from opener:", e);
      }
    }

    return () => window.removeEventListener("message", handleMessage);
  }, [searchParams, applyRecordToForm]);

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

        dispatch(setPages(pages));
        dispatch(setFormatPatterns(serializeRegexPatterns(formatPatterns)));
        dispatch(
          setDepFormatPatterns(serializeRegexPatterns(depFormatPatterns)),
        );
        dispatch(setViewMode(getInitialViewMode(enrichedFields)));
        dispatch(setFields(enrichedFields));

        if (pendingRecordRef.current) {
          applyRecordToForm(pendingRecordRef.current, enrichedFields);
        }
      } catch (error) {
        console.error("Schema load failed:", error);
      }
    };

    loadSchema();
  }, [schema, dispatch, fields, fields?.length, applyRecordToForm]); // deps: schema changes or fields empty

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

  if (!Array.isArray(fields) || !Array.isArray(pages)) {
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
