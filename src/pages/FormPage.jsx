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
  Alert,
  Chip,
  Collapse,
  Link,
  Typography,
  Drawer,
  Button,
  useMediaQuery,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import UpgradeIcon from "@mui/icons-material/Upgrade";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
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
import {
  setIsUploaded,
  setRecordMetadata,
  setUpgradeContext,
  clearUpgradeContext,
  selectUpgradeContext,
} from "../store/slices/uploadFileSlice";
import { escapeKey } from "../utils/pathEncoding";
import { normalizeNestedFields } from "../utils/normalizeJson";
import { migrateRecordToSchema } from "../utils/schemaMigration";
import {
  KNOWN_SCHEMA_MANIFEST,
  getSchemaPluginOutdatedStatus,
} from "../utils/schemaRegistry";
import { getSchemaId } from "../utils/schemaMapping";

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
  const upgradeContext = useSelector(selectUpgradeContext);

  const [showUnmappedDetails, setShowUnmappedDetails] = useState(false);

  // Try URL search param first, then route param, then Redux
  const schemaFromUrl = searchParams.get("schema") || schemaSlug;
  const targetSchemaIdParam = searchParams.get("targetSchemaId");
  const sourceSchemaIdParam = searchParams.get("sourceSchemaId");
  const modeParam = searchParams.get("mode");
  const isUpgradeFromUrl = modeParam === "upgrade";
  const schema = reduxSchema || schemaFromUrl;
  const isEditMode =
    mode === "edit" || modeParam === "edit" || isUpgradeFromUrl || upgradeContext.isUpgradeMode;

  const isPublishedParam =
    searchParams.get("isPublished") === "true" ||
    searchParams.get("published") === "true";
  const versionParam = searchParams.get("version");

  const recordAppliedRef = useRef(false);
  const pendingRecordRef = useRef(null);
  const lastAppliedRecordJsonRef = useRef("");

  const applyRecordToForm = useCallback(
    (
      jsonData,
      targetFields = fields,
      published = isPublishedParam,
      versionOverride = null,
      options = {}
    ) => {
      if (!jsonData || typeof jsonData !== "object") return;

      const isUpgrade = Boolean(options?.upgrade || isUpgradeFromUrl);
      const sourceSchemaId =
        options?.sourceSchemaId || sourceSchemaIdParam || jsonData["@schema_id"] || null;
      const targetSchemaId =
        options?.targetSchemaId || targetSchemaIdParam || getSchemaId(schema) || null;

      let jsonStr = "";
      try {
        jsonStr = JSON.stringify({
          data: jsonData,
          upgrade: isUpgrade,
          targetSchemaId,
        });
      } catch {
        jsonStr = "";
      }

      if (jsonStr && lastAppliedRecordJsonRef.current === jsonStr && recordAppliedRef.current) {
        return;
      }

      if (!targetFields || !Array.isArray(targetFields) || targetFields.length === 0) {
        pendingRecordRef.current = {
          jsonData,
          published,
          versionOverride,
          options: { upgrade: isUpgrade, sourceSchemaId, targetSchemaId },
        };
        return;
      }

      try {
        let formValues;
        let instanceCount;

        if (isUpgrade) {
          const migration = migrateRecordToSchema(jsonData, targetFields);
          formValues = migration.formValues;
          instanceCount = migration.instanceCounts;

          const outdatedStatus = getSchemaPluginOutdatedStatus(sourceSchemaId);
          const sourceMeta = sourceSchemaId ? KNOWN_SCHEMA_MANIFEST[sourceSchemaId] : null;
          const targetMeta = targetSchemaId ? KNOWN_SCHEMA_MANIFEST[targetSchemaId] : null;

          dispatch(
            setUpgradeContext({
              isUpgradeMode: true,
              sourceSchemaId,
              sourceSchemaVersion:
                sourceMeta?.version ||
                outdatedStatus?.currentVersion ||
                jsonData["@schema_version"] ||
                "1.0.0",
              targetSchemaId: targetSchemaId || outdatedStatus?.latestSaid || null,
              targetSchemaVersion:
                targetMeta?.version || outdatedStatus?.latestVersion || "1.0.0",
              targetFamily: targetMeta?.family || sourceMeta?.family || schema || null,
              unmappedFields: migration.unmappedFields,
              missingRequiredFields: migration.missingRequiredFields,
              mappedFieldCount: migration.mappedCount,
            })
          );
        } else {
          const normalizedJson = normalizeNestedFields(jsonData, targetFields);
          formValues = flatten(normalizedJson);
          instanceCount = buildInstanceCountsFromValues(formValues);
          dispatch(clearUpgradeContext());
        }

        dispatch(setInitialFormState(formValues));
        dispatch(setAllInstanceCounts(instanceCount));
        dispatch(setIsUploaded(true));
        dispatch(setMode("edit"));

        const loadedVersion =
          versionOverride ||
          versionParam ||
          jsonData.datasetVersion ||
          jsonData.versionLabel ||
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
            schemaId: sourceSchemaId || jsonData["@schema_id"] || null,
            isPublished: published,
          })
        );
        lastAppliedRecordJsonRef.current = jsonStr;
        recordAppliedRef.current = true;
        pendingRecordRef.current = null;
        try {
          window.sessionStorage.removeItem("contexthub_pending_record");
          window.sessionStorage.removeItem("contexthub_pending_upgrade");
        } catch {}
      } catch (err) {
        console.error("Error applying record to form:", err);
      }
    },
    [
      dispatch,
      fields,
      isPublishedParam,
      versionParam,
      isUpgradeFromUrl,
      sourceSchemaIdParam,
      targetSchemaIdParam,
      schema,
    ]
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

    // 2. Check pending record / pending upgrade stored in sessionStorage by App.js.
    //    Only consume it when explicitly in edit or upgrade mode; otherwise discard any stale record
    //    from an earlier edit session in the same tab so new forms always start clean.
    const currentModeParam = searchParams.get("mode");
    try {
      const storedPendingUpgrade = window.sessionStorage.getItem("contexthub_pending_upgrade");
      window.sessionStorage.removeItem("contexthub_pending_upgrade");
      if (currentModeParam === "upgrade" && storedPendingUpgrade) {
        const parsedUpgrade = JSON.parse(storedPendingUpgrade);
        if (parsedUpgrade?.record && typeof parsedUpgrade.record === "object") {
          applyRecordToForm(
            parsedUpgrade.record,
            fields,
            parsedUpgrade.isPublished ?? isPublishedParam,
            parsedUpgrade.version || versionParam,
            {
              upgrade: true,
              sourceSchemaId: parsedUpgrade.sourceSchemaId || parsedUpgrade.record["@schema_id"] || null,
              targetSchemaId: parsedUpgrade.targetSchemaId || targetSchemaIdParam || null,
            }
          );
        }
      }

      const storedPending = window.sessionStorage.getItem("contexthub_pending_record");
      window.sessionStorage.removeItem("contexthub_pending_record");
      if ((currentModeParam === "edit" || currentModeParam === "upgrade") && storedPending) {
        const parsed = JSON.parse(storedPending);
        if (parsed && typeof parsed === "object") {
          applyRecordToForm(parsed, fields, isPublishedParam, versionParam, {
            upgrade: currentModeParam === "upgrade",
            sourceSchemaId: sourceSchemaIdParam || parsed["@schema_id"] || null,
            targetSchemaId: targetSchemaIdParam || null,
          });
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

        if (msg.type === "CLEAR_RECORD") {
          try {
            window.sessionStorage.removeItem("contexthub_pending_record");
            window.sessionStorage.removeItem("contexthub_pending_upgrade");
            window.sessionStorage.removeItem("contexthub_is_published");
          } catch {}
          pendingRecordRef.current = null;
          recordAppliedRef.current = false;
          lastAppliedRecordJsonRef.current = "";
          dispatch(setInitialFormState({}));
          dispatch(setAllInstanceCounts({}));
          dispatch(setIsUploaded(false));
          dispatch(clearUpgradeContext());
          dispatch(setMode("write"));
          return;
        }

        if (
          msg.type === "UPGRADE_RECORD" ||
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
          const msgVersion = msg.version || versionParam;
          const isUpgradeMsg =
            msg.type === "UPGRADE_RECORD" ||
            Boolean(msg.upgrade) ||
            currentModeParam === "upgrade";
          try {
            window.sessionStorage.setItem("contexthub_is_published", String(msgPublished));
          } catch {}
          if (record && typeof record === "object") {
            applyRecordToForm(record, fields, msgPublished, msgVersion, {
              upgrade: isUpgradeMsg,
              sourceSchemaId: msg.sourceSchemaId || sourceSchemaIdParam || record["@schema_id"] || null,
              targetSchemaId: msg.targetSchemaId || targetSchemaIdParam || null,
            });
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
  }, [
    searchParams,
    applyRecordToForm,
    dispatch,
    fields,
    isPublishedParam,
    versionParam,
    sourceSchemaIdParam,
    targetSchemaIdParam,
  ]);

  // AUTO-LOAD SCHEMA
  useEffect(() => {
    const loadSchema = async () => {
      if (!schema || Array.isArray(fields)) return; // already loaded

      try {
        const jsonSchema = await extractJsonSchemaAsync(
          schema,
          targetSchemaIdParam ? { exactSaid: targetSchemaIdParam } : undefined
        );
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
          const pending = pendingRecordRef.current;
          if (pending && pending.jsonData) {
            applyRecordToForm(
              pending.jsonData,
              enrichedFields,
              pending.published,
              pending.versionOverride,
              pending.options
            );
          } else {
            applyRecordToForm(pending, enrichedFields);
          }
        }
      } catch (error) {
        console.error("Schema load failed:", error);
      }
    };

    loadSchema();
  }, [schema, dispatch, fields, fields?.length, applyRecordToForm, targetSchemaIdParam]); // deps: schema changes or fields empty

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

            {upgradeContext.isUpgradeMode && (
              <Alert
                severity="info"
                icon={<UpgradeIcon />}
                sx={{
                  mb: 2.5,
                  borderRadius: 2,
                  border: "1px solid #bfdbfe",
                  backgroundColor: "#eff6ff",
                  "& .MuiAlert-message": { width: "100%" },
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    gap: 1,
                    mb: 0.75,
                  }}
                >
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#1e3a8a" }}>
                    Upgrading Form Questionnaire
                  </Typography>
                  {upgradeContext.sourceSchemaVersion && (
                    <Chip
                      label={`From v${upgradeContext.sourceSchemaVersion}`}
                      size="small"
                      sx={{ fontFamily: "monospace", fontSize: "0.72rem", height: 22 }}
                    />
                  )}
                  {upgradeContext.targetSchemaVersion && (
                    <Chip
                      label={`To v${upgradeContext.targetSchemaVersion}`}
                      size="small"
                      color="primary"
                      sx={{ fontFamily: "monospace", fontSize: "0.72rem", height: 22 }}
                    />
                  )}
                </Box>
                <Typography variant="body2" sx={{ fontSize: "0.85rem", color: "#1e40af" }}>
                  Matching fields from your previous catalogue record ({upgradeContext.mappedFieldCount} values)
                  have been pre-filled automatically. Please review and manually enter any new or changed fields.
                </Typography>

                {upgradeContext.missingRequiredFields.length > 0 && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: "#9a3412", display: "block", mb: 0.5 }}>
                      Required fields needing manual input ({upgradeContext.missingRequiredFields.length}):
                    </Typography>
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                      {upgradeContext.missingRequiredFields.map((f) => (
                        <Chip
                          key={f.path}
                          label={f.label}
                          size="small"
                          color="warning"
                          variant="outlined"
                          sx={{ fontSize: "0.72rem", height: 22, backgroundColor: "#fffbeb" }}
                        />
                      ))}
                    </Box>
                  </Box>
                )}

                {upgradeContext.unmappedFields.length > 0 && (
                  <Box sx={{ mt: 1 }}>
                    <Button
                      size="small"
                      onClick={() => setShowUnmappedDetails((prev) => !prev)}
                      endIcon={showUnmappedDetails ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      sx={{
                        textTransform: "none",
                        fontSize: "0.78rem",
                        fontWeight: 600,
                        px: 0,
                        color: "#1d4ed8",
                      }}
                    >
                      {showUnmappedDetails ? "Hide" : "Show"} {upgradeContext.unmappedFields.length} unmapped
                      {upgradeContext.unmappedFields.length === 1 ? " value" : " values"} from the previous version
                    </Button>
                    <Collapse in={showUnmappedDetails}>
                      <Box
                        sx={{
                          mt: 1,
                          p: 1.25,
                          borderRadius: 1.5,
                          backgroundColor: "#ffffff",
                          border: "1px solid #dbeafe",
                          maxHeight: 200,
                          overflowY: "auto",
                        }}
                      >
                        <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 0.75 }}>
                          These fields did not match the new schema structure and were omitted from the upgraded record. Copy any values you still need into the new form fields:
                        </Typography>
                        {upgradeContext.unmappedFields.map((entry, idx) => (
                          <Box
                            key={`${entry.key}-${idx}`}
                            sx={{
                              display: "flex",
                              gap: 1.5,
                              py: 0.4,
                              borderTop: idx > 0 ? "1px solid #f1f5f9" : "none",
                              fontSize: "0.78rem",
                            }}
                          >
                            <Typography
                              component="span"
                              sx={{
                                fontFamily: "monospace",
                                fontWeight: 600,
                                color: "#334155",
                                minWidth: 160,
                                wordBreak: "break-word",
                              }}
                            >
                              {entry.key}
                            </Typography>
                            <Typography
                              component="span"
                              sx={{ color: "#475569", wordBreak: "break-word" }}
                            >
                              {entry.value}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    </Collapse>
                  </Box>
                )}
              </Alert>
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
