import React, { useEffect, useMemo, useState } from "react";
import { Box } from "@mui/system";
import { Link as RouterLink, useNavigate, useSearchParams } from "react-router-dom";
import {
  Button,
  TextField,
  Typography,
  Chip,
  Stack,
  Alert,
} from "@mui/material";
import { useTranslation } from "../utils/OpenAIRE/TranslationContext";
import Footer from "../components/Stateless/Footer";
import DynamicForm from "../components/Stateful/DynamicForm";
import EditIcon from "@mui/icons-material/Edit";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import SaveIcon from "@mui/icons-material/Save";
import SendIcon from "@mui/icons-material/Send";
import PageHeaders from "../components/Stateless/PageHeaders";
import { saidifyUrn } from "saidify";
import theme from "../theme";
import { useSelector, useDispatch } from "react-redux";
import {
  selectHasFormData,
  selectHasFormChanges,
  selectFields,
  selectAllFormValues,
  selectLoadedSchemaMeta,
  selectSchemaName,
} from "../store/selectors/formSelectors";
import { setMode } from "../store/slices/modeSlice";
import {
  selectOriginalSaid,
  selectRecordVersion,
  selectIsVersionOf,
  selectVersionNotes,
  selectIsPublished,
  selectLoadedSchemaId,
  selectUpgradeContext,
  setVersionNotes,
} from "../store/slices/uploadFileSlice";
import {
  KNOWN_SCHEMA_MANIFEST,
  ROUTE_MAP,
  getSchemaPluginOutdatedStatus,
  normalizeVersion,
} from "../utils/schemaRegistry";
import canonicalize from "../utils/canonicalize";
import { getContextUrl, getSchemaId } from "../utils/schemaMapping";
import { checkIsIframe } from "../utils/iframeUtils";
import { deepClone, unflattenFormData } from "../utils/formStateFlatten";
import { loadSchemaIntoStore } from "../utils/loadSchemaIntoStore";
import {
  isSafeDataUrl,
  safePostMessage,
  safeSessionGet,
} from "../utils/postMessageSecurity";
import { useNotification } from "../components/Stateless/NotificationContext";

function ViewPage() {
  const { t, lang } = useTranslation();
  const { notify } = useNotification();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const dispatch = useDispatch();
  const [updating, setUpdating] = useState(false);

  const buttonLabelParam = searchParams.get("buttonLabel");
  const isIframeMode = checkIsIframe(searchParams);

  const schema = useSelector(selectSchemaName);
  const isUploadedJson = useSelector(selectHasFormData);
  const hasFormChanges = useSelector(selectHasFormChanges);
  const flatFormState = useSelector(selectAllFormValues);
  const jsonSchema = useSelector(selectFields);
  const loadedSchemaMeta = useSelector(selectLoadedSchemaMeta);

  const originalSaid = useSelector(selectOriginalSaid);
  const savedRecordVersion = useSelector(selectRecordVersion);
  const isVersionOfPrior = useSelector(selectIsVersionOf);
  const savedVersionNotes = useSelector(selectVersionNotes);
  const isPublishedRedux = useSelector(selectIsPublished);
  const loadedSchemaId = useSelector(selectLoadedSchemaId);
  const upgradeContext = useSelector(selectUpgradeContext);

  const isPublishedFromParam = searchParams.get("isPublished");
  const isPublishedSession = safeSessionGet("contexthub_is_published");

  const isPublished =
    isPublishedFromParam !== null
      ? isPublishedFromParam === "true"
      : isPublishedSession !== null
        ? isPublishedSession === "true"
        : Boolean(isPublishedRedux);

  const resourceVersion = savedRecordVersion || "1.0.0";
  const isDataset =
    schema === "dataset_catalogue_record" ||
    schema === "ContextHub_dataset_catalogue_record" ||
    String(schema || "").toLowerCase().includes("dataset");
  const [currentNotes, setCurrentNotesState] = useState(savedVersionNotes || "");

  // Re-extract schema labels/pages if user switches EN/FR while on ViewPage
  useEffect(() => {
    if (
      !schema ||
      !Array.isArray(jsonSchema) ||
      !loadedSchemaMeta?.lang ||
      loadedSchemaMeta.lang === lang
    ) {
      return;
    }
    loadSchemaIntoStore(dispatch, {
      schema,
      exactSaid: loadedSchemaMeta.exactSaid || loadedSchemaId || null,
      lang,
      preserveUiState: true,
    }).catch((err) => console.warn("Could not re-localize schema:", err));
  }, [schema, jsonSchema, loadedSchemaMeta?.lang, loadedSchemaMeta?.exactSaid, loadedSchemaId, lang, dispatch]);

  const handleNotesChange = (e) => {
    const val = e.target.value;
    setCurrentNotesState(val);
    dispatch(setVersionNotes(val));
  };

  // Memoize unflatten so typing in Revision Notes doesn't recompute the entire tree every keystroke
  const formState = useMemo(
    () => unflattenFormData(flatFormState),
    [flatFormState]
  );

  const storedDataUrl = safeSessionGet("dataUrl");
  const canPostToDataUrl =
    !isIframeMode &&
    !buttonLabelParam &&
    Boolean(storedDataUrl) &&
    !storedDataUrl.startsWith("data:") &&
    isSafeDataUrl(storedDataUrl);

  const injectDcatNamespace = (context) => {
    const dcatNamespace = { dcat: "http://www.w3.org/ns/dcat#" };
    if (!context) return dcatNamespace;
    if (Array.isArray(context)) {
      const hasDcat = context.some(
        (item) => typeof item === "object" && item !== null && "dcat" in item
      );
      if (hasDcat) return context;
      return [...context, dcatNamespace];
    }
    if (typeof context === "object") {
      if ("dcat" in context) return context;
      return { ...context, ...dcatNamespace };
    }
    return [context, dcatNamespace];
  };

  const generateCatalogueRecord = (jsonData) => {
    const dataForSaid = deepClone(jsonData);

    const cleanKeys = [
      "catalogue_id",
      "d",
      "@context",
      "@schema_id",
      "@schema_version",
      "@type",
    ];
    cleanKeys.forEach((key) => {
      if (key in dataForSaid) delete dataForSaid[key];
    });

    const canonicalizedState = canonicalize(dataForSaid);
    const formData = JSON.parse(canonicalizedState);

    const semVer = isDataset
      ? resourceVersion || "1.0.0"
      : normalizeVersion(resourceVersion, "1.0.0");
    const timestamp = new Date().toISOString();

    const existingDcterms =
      formData.dcterms && typeof formData.dcterms === "object"
        ? formData.dcterms
        : {};

    const updatedDcterms = {
      ...existingDcterms,
      version: semVer,
      modified: timestamp,
    };

    if (isPublished && originalSaid) {
      updatedDcterms.isVersionOf = originalSaid;
    } else if (isPublished && isVersionOfPrior) {
      updatedDcterms.isVersionOf = isVersionOfPrior;
    }

    if (currentNotes && currentNotes.trim()) {
      updatedDcterms["adms:versionNotes"] = currentNotes.trim();
    }

    formData.dcterms = updatedDcterms;
    if (isDataset) {
      formData.datasetVersion = semVer;
      formData.version = semVer;
    }

    const contextUrl = getContextUrl(schema);
    const schemaId =
      (upgradeContext.isUpgradeMode && upgradeContext.targetSchemaId) ||
      getSchemaId(schema);
    const schemaMeta = KNOWN_SCHEMA_MANIFEST[schemaId];
    const schemaPluginVersion =
      (upgradeContext.isUpgradeMode && upgradeContext.targetSchemaVersion) ||
      schemaMeta?.version ||
      "1.0.0";
    const finalContext = injectDcatNamespace(contextUrl);

    const formDataWithId = {
      "@context": finalContext,
      "@type": "dcat:CatalogRecord",
      "@schema_id": schemaId,
      "@schema_version": schemaPluginVersion,
      d: "",
      ...formData,
    };

    const [, objWithSaid] = saidifyUrn(formDataWithId, "d");
    return objWithSaid;
  };

  const downloadJson = (jsonData) => {
    const objWithSaid = generateCatalogueRecord(jsonData);
    const content = JSON.stringify(objWithSaid, null, 2);
    const blob = new Blob([content], { type: "application/ld+json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `catalogue-${objWithSaid.d || "export"}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const postMessageToParent = (jsonData) => {
    const objWithSaid = generateCatalogueRecord(jsonData);
    const payload = {
      type: "CATALOGUE_RECORD",
      record: objWithSaid,
      isUpgrade: Boolean(upgradeContext.isUpgradeMode),
      sourceSchemaId: upgradeContext.sourceSchemaId || loadedSchemaId || null,
      targetSchemaId: objWithSaid["@schema_id"] || null,
    };

    let delivered = false;
    if (window.parent && window.parent !== window) {
      delivered = safePostMessage(window.parent, payload, {
        allowWildcardFallback: false,
      });
    } else if (window.opener && !window.opener.closed) {
      delivered = safePostMessage(window.opener, payload, {
        allowWildcardFallback: false,
      });
    }

    if (delivered) {
      if (window.opener && window.opener !== window) {
        notify(t("viewpage.updated_in_contexthub_tab"), "success");
        try {
          window.close();
        } catch {
          // Window closing may be blocked by browser
        }
      }
    } else {
      notify(t("viewpage.contexthub_fallback_download"), "warning", 7000);
      downloadJson(jsonData);
    }
  };

  const updateContextHub = async (jsonData) => {
    setUpdating(true);
    try {
      const dataUrl = safeSessionGet("dataUrl");
      if (!dataUrl || !isSafeDataUrl(dataUrl)) {
        throw new Error("No valid ContextHub data source URL found in session.");
      }

      const objWithSaid = generateCatalogueRecord(jsonData);

      const response = await fetch(dataUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(objWithSaid),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(
          errorData?.error?.message || `HTTP error! status: ${response.status}`
        );
      }

      notify(t("viewpage.contexthub_update_success"), "success");
    } catch (err) {
      console.error("Failed to update ContextHub:", err);
      notify(`${t("viewpage.contexthub_update_failed")} ${err.message}`, "error");
    } finally {
      setUpdating(false);
    }
  };

  if (!jsonSchema) {
    return (
      <Box component="main" sx={{ textAlign: "center", p: 6 }}>
        <Typography>{t("viewpage.loading")}</Typography>
      </Box>
    );
  }

  if (!isUploadedJson) {
    return (
      <Box component="main" sx={{ textAlign: "center", p: 6 }}>
        <Typography sx={{ mb: 2 }}>{t("viewpage.no_catalogue")}</Typography>
        <Button
          component={RouterLink}
          to="/"
          variant="contained"
          sx={{ backgroundColor: theme.primaryColor }}
        >
          {t("formpage.go_home")}
        </Button>
      </Box>
    );
  }

  const handleEditClick = () => {
    dispatch(setMode("edit"));
    const params = new URLSearchParams(window.location.search);
    if (!params.get("schema") && schema) {
      params.set("schema", schema);
    }
    const baseRoute = ROUTE_MAP[schema] || "/form";
    navigate({
      pathname: baseRoute,
      search: params.toString() ? `?${params.toString()}` : "",
    });
  };

  const currentSchemaId = loadedSchemaId || getSchemaId(schema);
  const outdatedInfo = upgradeContext.isUpgradeMode
    ? null
    : getSchemaPluginOutdatedStatus(currentSchemaId);
  const isUnchangedPublishedEdit =
    isPublished &&
    Boolean(originalSaid) &&
    !upgradeContext.isUpgradeMode &&
    !hasFormChanges &&
    !currentNotes.trim();

  return (
    <div className="ViewPage">
      <PageHeaders
        page_heading={
          !isUploadedJson ? t("viewpage.review") : t("viewpage.view")
        }
        tooltip_description={
          !isUploadedJson
            ? t("viewpage.review_tooltip")
            : t("viewpage.view_tooltip")
        }
        help_button_redirect={() => navigate("/view-help")}
      />

      <Box
        component="main"
        id="main-content"
        sx={{ maxWidth: 1000, margin: "auto", padding: { xs: 2, sm: 4, md: 5 } }}
      >
        {/* Versioning & Revision Lineage Control Panel */}
        <Box
          sx={{
            mb: 3,
            p: 2.5,
            border: "1px solid #d0d7de",
            borderRadius: 2,
            backgroundColor: "#f6f8fa",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          }}
        >
          {upgradeContext.isUpgradeMode ? (
            <Alert severity="success" sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                {t("viewpage.upgraded_title")}
              </Typography>
              <Typography variant="body2" sx={{ fontSize: "0.85rem" }}>
                {t("viewpage.upgraded_body_prefix")}{" "}
                <strong>
                  {upgradeContext.targetFamily || schema} (v
                  {upgradeContext.sourceSchemaVersion || "1.0.0"})
                </strong>{" "}
                {t("viewpage.upgraded_body_to")}{" "}
                <strong>v{upgradeContext.targetSchemaVersion || "latest"}</strong>.
                {originalSaid && ` ${t("viewpage.upgraded_lineage_note")}`}
              </Typography>
            </Alert>
          ) : outdatedInfo?.isOutdated ? (
            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                {t("homepage.outdated_title")}
              </Typography>
              <Typography variant="body2" sx={{ fontSize: "0.85rem" }}>
                {t("homepage.outdated_body_prefix")}{" "}
                <strong>{outdatedInfo.family}</strong>{" "}
                {t("homepage.outdated_body_mid")} (v{outdatedInfo.currentVersion}).{" "}
                {t("homepage.outdated_body_suffix")} v{outdatedInfo.latestVersion}.
              </Typography>
            </Alert>
          ) : null}

          <Stack
            direction={{ xs: "column", sm: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", sm: "center" }}
            spacing={2}
            sx={{ mb: isPublished ? 2 : 1 }}
          >
            <Box>
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 600, color: theme.primaryColor }}
              >
                {isPublished
                  ? t("viewpage.lineage_version_title")
                  : t("viewpage.version_title")}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {t("viewpage.version_subtitle")}
              </Typography>
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography
                variant="body2"
                sx={{ fontWeight: 600, color: "text.secondary" }}
              >
                {t("viewpage.resource_version")}
              </Typography>
              <Chip
                label={
                  isDataset
                    ? resourceVersion || "1.0.0"
                    : resourceVersion?.startsWith("v")
                      ? resourceVersion
                      : `v${resourceVersion}`
                }
                size="small"
                color="primary"
                sx={{ fontWeight: 700, px: 0.5 }}
              />
            </Box>
          </Stack>

          {isPublished && (
            <Stack
              direction="row"
              spacing={1.5}
              alignItems="center"
              flexWrap="wrap"
              useFlexGap
              sx={{ mb: 1.5 }}
            >
              {originalSaid ? (
                <Chip
                  label={`${t("viewpage.revises")} ${originalSaid.slice(0, 24)}...`}
                  color="info"
                  variant="outlined"
                  size="small"
                  title={`Previous Record SAID: ${originalSaid}`}
                />
              ) : (
                <Chip
                  label={t("viewpage.initial_record")}
                  color="success"
                  variant="outlined"
                  size="small"
                />
              )}

              <Chip
                label={`${t("viewpage.schema_label")} ${schema || "Default"} (${(getSchemaId(schema) || "").slice(0, 16)}...)`}
                variant="outlined"
                size="small"
              />
            </Stack>
          )}

          {isPublished && originalSaid && (
            <Alert severity="info" sx={{ mb: 1.5, py: 0.5, fontSize: "0.85rem" }}>
              {t("viewpage.immutable_revision_notice")}
            </Alert>
          )}

          <TextField
            fullWidth
            size="small"
            label={t("viewpage.revision_notes_label")}
            placeholder={t("viewpage.revision_notes_placeholder")}
            value={currentNotes}
            onChange={handleNotesChange}
            helperText={t("viewpage.revision_notes_helper")}
            FormHelperTextProps={{
              sx: { fontSize: "0.78rem", color: "text.secondary", mt: 0.5 },
            }}
            sx={{ backgroundColor: "#fff" }}
          />
        </Box>

        <DynamicForm language={lang} />

        {isUnchangedPublishedEdit && (
          <Alert severity="info" sx={{ mt: 2.5, borderRadius: 2 }}>
            <Typography variant="body2">
              {t("viewpage.no_changes_notice")}
            </Typography>
          </Alert>
        )}

        <Stack
          direction="row"
          spacing={1.5}
          useFlexGap
          flexWrap="wrap"
          sx={{ mt: 3 }}
        >
          <Button
            variant="contained"
            sx={{
              backgroundColor: theme.primaryColor,
              transition: "filter 0.15s ease",
              "&:hover": {
                backgroundColor: theme.primaryColor,
                filter: "brightness(0.93)",
              },
            }}
            onClick={handleEditClick}
            startIcon={<EditIcon />}
          >
            {t("viewpage.edit")}
          </Button>

          <Button
            variant="contained"
            sx={{
              backgroundColor: theme.primaryColor,
              transition: "filter 0.15s ease",
              "&:hover": {
                backgroundColor: theme.primaryColor,
                filter: "brightness(0.93)",
              },
            }}
            onClick={() => downloadJson(formState)}
            startIcon={<FileDownloadIcon />}
          >
            {t("viewpage.download")}
          </Button>

          {(isIframeMode || buttonLabelParam) && (
            <Button
              variant="contained"
              disabled={isUnchangedPublishedEdit}
              sx={{
                backgroundColor: theme.primaryColor,
                transition: "filter 0.15s ease",
                "&:hover": {
                  backgroundColor: theme.primaryColor,
                  filter: "brightness(0.93)",
                },
              }}
              onClick={() => postMessageToParent(formState)}
              startIcon={<SendIcon />}
            >
              {buttonLabelParam || t("viewpage.update_to_contexthub")}
            </Button>
          )}

          {canPostToDataUrl && (
            <Button
              variant="contained"
              disabled={updating || isUnchangedPublishedEdit}
              sx={{
                backgroundColor: theme.primaryColor,
                transition: "filter 0.15s ease",
                "&:hover": {
                  backgroundColor: theme.primaryColor,
                  filter: "brightness(0.93)",
                },
              }}
              onClick={() => updateContextHub(formState)}
              startIcon={updating ? null : <SaveIcon />}
            >
              {updating ? t("viewpage.updating") : t("viewpage.update_contexthub")}
            </Button>
          )}
        </Stack>
      </Box>
      <Footer powered_by={t("powered_by")} supported_by={t("supported_by")} />
    </div>
  );
}

export default ViewPage;
