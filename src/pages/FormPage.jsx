import React, { useEffect, useState, useRef, useCallback } from "react";
import { Link as RouterLink, useNavigate, useSearchParams, useParams } from "react-router-dom";
import { Box } from "@mui/system";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import DynamicForm from "../components/Stateful/DynamicForm";
import { useTranslation } from "../utils/OpenAIRE/TranslationContext";
import Footer from "../components/Stateless/Footer";
import PageHeaders from "../components/Stateless/PageHeaders";
import { useSelector, useDispatch } from "react-redux";
import {
  selectFields,
  selectHasFormData,
  selectLoadedSchemaMeta,
  selectSchemaName,
  selectPages,
} from "../store/selectors/formSelectors";
import {
  Alert,
  Chip,
  CircularProgress,
  Collapse,
  Paper,
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
import FormSidebar from "../components/Stateful/FormSidebar";
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
import { normalizeNestedFields } from "../utils/normalizeJson";
import { migrateRecordToSchema } from "../utils/schemaMigration";
import {
  KNOWN_SCHEMA_MANIFEST,
  getSchemaPluginOutdatedStatus,
} from "../utils/schemaRegistry";
import { getSchemaId } from "../utils/schemaMapping";
import { flattenFormData } from "../utils/formStateFlatten";
import { loadSchemaIntoStore } from "../utils/loadSchemaIntoStore";
import {
  isAllowedOrigin,
  isSafeDataUrl,
  rememberVerifiedOrigin,
  safePostMessage,
  safeSessionGet,
  safeSessionRemove,
  safeSessionSet,
} from "../utils/postMessageSecurity";

function FormPage() {
  const { t, lang } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const pages = useSelector(selectPages);
  const activePage = useSelector(selectActivePage);
  const childFormNavigation = useSelector((state) => state.childFormNavigation);
  const hasFormData = useSelector(selectHasFormData);
  const loadedSchemaMeta = useSelector(selectLoadedSchemaMeta);

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

  const reduxSchema = useSelector(selectSchemaName);
  const fields = useSelector(selectFields);
  const mode = useSelector(selectMode);
  const upgradeContext = useSelector(selectUpgradeContext);

  const [showUnmappedDetails, setShowUnmappedDetails] = useState(false);
  const [schemaLoadError, setSchemaLoadError] = useState(null);
  const [retryToken, setRetryToken] = useState(0);

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
  const latestFieldsRef = useRef(fields);

  useEffect(() => {
    latestFieldsRef.current = fields;
  }, [fields]);

  // Warn before accidental browser refresh/close when form has unsaved data
  useEffect(() => {
    if (!hasFormData || mode === "view" || isIframeMode) return undefined;

    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasFormData, mode, isIframeMode]);

  const applyRecordToForm = useCallback(
    (
      jsonData,
      targetFields = latestFieldsRef.current,
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
          formValues = flattenFormData(normalizedJson);
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
            originalSaid: published ? jsonData.d || null : null,
            recordVersion: loadedVersion,
            isVersionOf: loadedIsVersionOf,
            schemaId: sourceSchemaId || jsonData["@schema_id"] || null,
            isPublished: published,
          })
        );
        lastAppliedRecordJsonRef.current = jsonStr;
        recordAppliedRef.current = true;
        pendingRecordRef.current = null;
        safeSessionRemove("contexthub_pending_record");
        safeSessionRemove("contexthub_pending_upgrade");
      } catch (err) {
        console.error("Error applying record to form:", err);
      }
    },
    [
      dispatch,
      isPublishedParam,
      versionParam,
      isUpgradeFromUrl,
      sourceSchemaIdParam,
      targetSchemaIdParam,
      schema,
    ]
  );

  // AUTO-LOAD RECORD from URL params, sessionStorage, or postMessage (no `fields` dep to prevent duplicate fetches)
  useEffect(() => {
    const existingDataUrl = safeSessionGet("dataUrl");
    if (existingDataUrl && existingDataUrl.startsWith("data:")) {
      safeSessionRemove("dataUrl");
    }

    const dataUrl = searchParams.get("dataUrl");
    if (dataUrl && isSafeDataUrl(dataUrl)) {
      if (!dataUrl.startsWith("data:")) {
        safeSessionSet("dataUrl", dataUrl);
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

    const currentModeParam = searchParams.get("mode");
    try {
      const storedPendingUpgrade = safeSessionGet("contexthub_pending_upgrade");
      safeSessionRemove("contexthub_pending_upgrade");
      if (currentModeParam === "upgrade" && storedPendingUpgrade) {
        const parsedUpgrade = JSON.parse(storedPendingUpgrade);
        if (parsedUpgrade?.record && typeof parsedUpgrade.record === "object") {
          applyRecordToForm(
            parsedUpgrade.record,
            latestFieldsRef.current,
            parsedUpgrade.isPublished ?? isPublishedParam,
            parsedUpgrade.version || versionParam,
            {
              upgrade: true,
              sourceSchemaId:
                parsedUpgrade.sourceSchemaId || parsedUpgrade.record["@schema_id"] || null,
              targetSchemaId: parsedUpgrade.targetSchemaId || targetSchemaIdParam || null,
            }
          );
        }
      }

      const storedPending = safeSessionGet("contexthub_pending_record");
      safeSessionRemove("contexthub_pending_record");
      if ((currentModeParam === "edit" || currentModeParam === "upgrade") && storedPending) {
        const parsed = JSON.parse(storedPending);
        if (parsed && typeof parsed === "object") {
          applyRecordToForm(parsed, latestFieldsRef.current, isPublishedParam, versionParam, {
            upgrade: currentModeParam === "upgrade",
            sourceSchemaId: sourceSchemaIdParam || parsed["@schema_id"] || null,
            targetSchemaId: targetSchemaIdParam || null,
          });
        }
      }
    } catch (e) {
      console.warn("Could not parse sessionStorage pending record:", e);
    }

    const handleMessage = (event) => {
      if (!isAllowedOrigin(event.origin)) return;
      rememberVerifiedOrigin(event.origin);

      try {
        const msg = event.data;
        if (!msg || typeof msg !== "object") return;

        if (msg.type === "CLEAR_RECORD") {
          safeSessionRemove("contexthub_pending_record");
          safeSessionRemove("contexthub_pending_upgrade");
          safeSessionRemove("contexthub_is_published");
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
          safeSessionSet("contexthub_is_published", String(msgPublished));
          if (record && typeof record === "object") {
            applyRecordToForm(record, latestFieldsRef.current, msgPublished, msgVersion, {
              upgrade: isUpgradeMsg,
              sourceSchemaId:
                msg.sourceSchemaId || sourceSchemaIdParam || record["@schema_id"] || null,
              targetSchemaId: msg.targetSchemaId || targetSchemaIdParam || null,
            });
          }
        }
      } catch (err) {
        console.warn("Error handling postMessage in FormPage:", err);
      }
    };

    window.addEventListener("message", handleMessage);

    if (window.parent && window.parent !== window) {
      safePostMessage(window.parent, { type: "REQUEST_RECORD" }, { allowWildcardFallback: true });
      safePostMessage(window.parent, { type: "REQUEST_USER_CONTEXT" }, { allowWildcardFallback: true });
    }
    if (window.opener && window.opener !== window && !window.opener.closed) {
      safePostMessage(window.opener, { type: "REQUEST_RECORD" }, { allowWildcardFallback: true });
      safePostMessage(window.opener, { type: "REQUEST_USER_CONTEXT" }, { allowWildcardFallback: true });
    }

    return () => window.removeEventListener("message", handleMessage);
  }, [
    searchParams,
    applyRecordToForm,
    dispatch,
    isPublishedParam,
    versionParam,
    sourceSchemaIdParam,
    targetSchemaIdParam,
  ]);

  // AUTO-LOAD SCHEMA & RE-EXTRACT ON LANGUAGE CHANGE (preserving user formValues & UI state)
  useEffect(() => {
    if (!schema) return undefined;

    const alreadyLoaded = Array.isArray(fields) && fields.length > 0;
    const needsLanguageReload =
      alreadyLoaded && loadedSchemaMeta?.lang && loadedSchemaMeta.lang !== lang;

    if (alreadyLoaded && !needsLanguageReload) {
      return undefined;
    }

    let cancelled = false;
    setSchemaLoadError(null);

    const loadSchema = async () => {
      try {
        const { enrichedFields } = await loadSchemaIntoStore(dispatch, {
          schema,
          exactSaid: targetSchemaIdParam || loadedSchemaMeta?.exactSaid || null,
          lang,
          preserveUiState: needsLanguageReload,
        });

        if (cancelled) return;

        if (!needsLanguageReload && pendingRecordRef.current) {
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
        if (!cancelled) {
          setSchemaLoadError(error?.message || "Schema load failed");
        }
      }
    };

    loadSchema();
    return () => {
      cancelled = true;
    };
  }, [
    schema,
    lang,
    dispatch,
    fields,
    loadedSchemaMeta?.lang,
    loadedSchemaMeta?.exactSaid,
    applyRecordToForm,
    targetSchemaIdParam,
    retryToken,
  ]);

  if (!schema) {
    return (
      <Box component="main" sx={{ textAlign: "center", p: 6 }}>
        <Typography sx={{ mb: 2 }}>{t("formpage.no_schema")}</Typography>
        <Button component={RouterLink} to="/" variant="contained" sx={{ backgroundColor: theme.primaryColor }}>
          {t("formpage.go_home")}
        </Button>
      </Box>
    );
  }

  if (schemaLoadError) {
    return (
      <Box component="main" sx={{ maxWidth: 520, mx: "auto", p: 5, textAlign: "center" }}>
        <Paper elevation={2} sx={{ p: 4, borderRadius: 2 }}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 700 }}>
            {t("formpage.schema_error_title")}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {t("formpage.schema_error_body")} ({schema})
          </Typography>
          <Box sx={{ display: "flex", justifyContent: "center", gap: 1.5 }}>
            <Button
              variant="contained"
              onClick={() => {
                setSchemaLoadError(null);
                setRetryToken((n) => n + 1);
              }}
              sx={{
                backgroundColor: theme.primaryColor,
                "&:hover": { backgroundColor: theme.primaryColor, filter: "brightness(0.93)" },
              }}
            >
              {t("formpage.retry")}
            </Button>
            <Button component={RouterLink} to="/" variant="outlined">
              {t("formpage.go_home")}
            </Button>
          </Box>
        </Paper>
      </Box>
    );
  }

  if (!Array.isArray(fields) || !Array.isArray(pages)) {
    return (
      <Box
        component="main"
        role="status"
        aria-live="polite"
        sx={{
          textAlign: "center",
          p: 6,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 2,
        }}
      >
        <CircularProgress />
        <Typography>
          {t("formpage.loading_schema")}: {schema}...
        </Typography>
      </Box>
    );
  }

  return (
    <div className="FormPage" style={{ maxWidth: "100%", overflowX: "clip" }}>
      <PageHeaders
        page_heading={
          isEditMode ? t("formpage.edit_header") : t("formpage.write_header")
        }
        tooltip_description={
          isEditMode ? t("formpage.edit_tooltip") : t("formpage.write_tooltip")
        }
        help_button_redirect={() => navigate("/form-help")}
      />

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
          id="main-content"
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
                      transition: "filter 0.15s ease",
                      "&:hover": {
                        backgroundColor: theme.primaryColor,
                        filter: "brightness(0.93)",
                        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.12)",
                      },
                      flexShrink: 0,
                    }}
                  >
                    {t("formpage.sections")}
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
                      {t("formpage.dock_sidebar")}
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
                    {activePageLabel || t("formpage.section_navigation")}
                  </Typography>
                  {pages && pages.length > 0 && (
                    <Typography
                      variant="caption"
                      sx={{ color: "text.secondary", display: "block" }}
                    >
                      {t("formpage.section_of")
                        .replace("{{current}}", String((activePage ?? 0) + 1))
                        .replace("{{total}}", String(pages.length))}
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
                  <Typography
                    variant="subtitle2"
                    sx={{ fontWeight: 700, color: "#1e3a8a" }}
                  >
                    {t("formpage.upgrading_title")}
                  </Typography>
                  {upgradeContext.sourceSchemaVersion && (
                    <Chip
                      label={`${t("formpage.upgrading_from")} v${upgradeContext.sourceSchemaVersion}`}
                      size="small"
                      sx={{ fontFamily: "monospace", fontSize: "0.72rem", height: 22 }}
                    />
                  )}
                  {upgradeContext.targetSchemaVersion && (
                    <Chip
                      label={`${t("formpage.upgrading_to")} v${upgradeContext.targetSchemaVersion}`}
                      size="small"
                      color="primary"
                      sx={{ fontFamily: "monospace", fontSize: "0.72rem", height: 22 }}
                    />
                  )}
                </Box>
                <Typography
                  variant="body2"
                  sx={{ fontSize: "0.85rem", color: "#1e40af" }}
                >
                  {t("formpage.upgrading_desc").replace(
                    "{{count}}",
                    String(upgradeContext.mappedFieldCount)
                  )}
                </Typography>

                {upgradeContext.missingRequiredFields.length > 0 && (
                  <Box sx={{ mt: 1 }}>
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 700,
                        color: "#9a3412",
                        display: "block",
                        mb: 0.5,
                      }}
                    >
                      {t("formpage.upgrading_missing_required").replace(
                        "{{count}}",
                        String(upgradeContext.missingRequiredFields.length)
                      )}
                    </Typography>
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                      {upgradeContext.missingRequiredFields.map((f) => (
                        <Chip
                          key={f.path}
                          label={f.label}
                          size="small"
                          color="warning"
                          variant="outlined"
                          sx={{
                            fontSize: "0.72rem",
                            height: 22,
                            backgroundColor: "#fffbeb",
                          }}
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
                      endIcon={
                        showUnmappedDetails ? (
                          <ExpandLessIcon />
                        ) : (
                          <ExpandMoreIcon />
                        )
                      }
                      sx={{
                        textTransform: "none",
                        fontSize: "0.78rem",
                        fontWeight: 600,
                        px: 0,
                        color: "#1d4ed8",
                      }}
                    >
                      {(showUnmappedDetails
                        ? t("formpage.upgrading_hide_unmapped")
                        : t("formpage.upgrading_show_unmapped")
                      ).replace("{{count}}", String(upgradeContext.unmappedFields.length))}
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
                        <Typography
                          variant="caption"
                          sx={{ color: "text.secondary", display: "block", mb: 0.75 }}
                        >
                          {t("formpage.upgrading_unmapped_hint")}
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
              <Typography variant="h5" component="h2" sx={{ mb: 2 }}>
                {activePageLabel}
              </Typography>
            )}
            <LocalizationProvider
              dateAdapter={AdapterDateFns}
              localeText={{
                fieldDayPlaceholder: () => "DD",
                fieldMonthPlaceholder: () => "MM",
                fieldYearPlaceholder: () => "YYYY",
              }}
            >
              <DynamicForm isEditMode={isEditMode} />
            </LocalizationProvider>
          </Box>
        </Box>
      </Box>

      <Footer powered_by={t("powered_by")} supported_by={t("supported_by")} />
    </div>
  );
}

export default FormPage;
