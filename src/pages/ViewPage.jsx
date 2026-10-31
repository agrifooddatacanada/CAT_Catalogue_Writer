import React, { useState } from "react";
import { Box } from "@mui/system";
import { useNavigate, useSearchParams } from "react-router-dom";
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
  selectFields,
  selectAllFormValues,
  selectSchemaName,
} from "../store/selectors/formSelectors";
import { setMode } from "../store/slices/modeSlice";
import {
  selectOriginalSaid,
  selectRecordVersion,
  selectIsVersionOf,
  selectVersionNotes,
  selectIsPublished,
  setVersionNotes,
} from "../store/slices/uploadFileSlice";
import {
  KNOWN_SCHEMA_MANIFEST,
  getSchemaPluginOutdatedStatus,
  normalizeVersion,
} from "../utils/schemaRegistry";
import canonicalize from "../utils/canonicalize";
import { getContextUrl, getSchemaId } from "../utils/schemaMapping";
import { unescapeKey } from "../utils/pathEncoding";
import { checkIsIframe } from "../utils/iframeUtils";

function ViewPage() {
  const { t, lang } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const dispatch = useDispatch();
  const [updating, setUpdating] = useState(false);

  const buttonLabelParam = searchParams.get("buttonLabel");
  const isIframeMode = checkIsIframe(searchParams);

  const schema = useSelector(selectSchemaName);
  const isUploadedJson = useSelector(selectHasFormData);
  const flatFormState = useSelector(selectAllFormValues);

  // Lineage & Version Redux State
  const originalSaid = useSelector(selectOriginalSaid);
  const savedRecordVersion = useSelector(selectRecordVersion);
  const isVersionOfPrior = useSelector(selectIsVersionOf);
  const savedVersionNotes = useSelector(selectVersionNotes);
  const isPublishedRedux = useSelector(selectIsPublished);

  const isPublishedFromParam = searchParams.get("isPublished");
  const isPublishedSession = (() => {
    try {
      return window.sessionStorage.getItem("contexthub_is_published");
    } catch {
      return null;
    }
  })();

  const isPublished = isPublishedFromParam !== null
    ? isPublishedFromParam === "true"
    : isPublishedSession !== null
      ? isPublishedSession === "true"
      : Boolean(isPublishedRedux);

  // The catalogue record version ALWAYS inherits the version of the resource it describes
  const resourceVersion = savedRecordVersion || "1.0.0";
  const [currentNotes, setCurrentNotesState] = useState(
    savedVersionNotes || ""
  );

  const handleNotesChange = (e) => {
    const val = e.target.value;
    setCurrentNotesState(val);
    dispatch(setVersionNotes(val));
  };

  function unflatten(flatObject) {
    const result = {};
    for (const [key, value] of Object.entries(flatObject)) {
      const path = parsePath(key);
      let current = result;
      for (let i = 0; i < path.length; i++) {
        const segment = path[i];
        const isLast = i === path.length - 1;
        const nextSegment = path[i + 1];
        if (isLast) {
          current[segment] = deepClone(value);
        } else {
          const isNextArrayIndex = typeof nextSegment === "number";
          if (typeof segment === "number") {
            if (!Array.isArray(current)) {
              current = [];
            }
            ensureIndex(current, segment);
            if (current[segment] == null) {
              current[segment] = isNextArrayIndex ? [] : {};
            }
            current = current[segment];
          } else {
            if (current[segment] == null) {
              current[segment] = isNextArrayIndex ? [] : {};
            }
            current = current[segment];
          }
        }
      }
    }
    return result;
  }

  function deepClone(value) {
    if (value === null || typeof value !== "object") {
      return value;
    }
    if (Array.isArray(value)) {
      return value.map(deepClone);
    }
    const cloned = {};
    for (const key in value) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        cloned[key] = deepClone(value[key]);
      }
    }
    return cloned;
  }

  function ensureIndex(arr, index) {
    while (arr.length <= index) {
      arr.push(null);
    }
  }

  function parsePath(path) {
    if (!path) return [];
    return path
      .split(/\.|\[/)
      .filter(Boolean)
      .map((segment) => {
        segment = segment.replace(/]$/, "");
        return /^\d+$/.test(segment)
          ? parseInt(segment, 10)
          : unescapeKey(segment);
      });
  }

  const formState = unflatten(flatFormState);
  const jsonSchema = useSelector(selectFields);

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

  /**
   * Generates a deterministic, immutable catalogue record with SAID.
   * Preserves lineage by injecting dcterms:isVersionOf, dcterms:version,
   * adms:versionNotes, and dcterms:modified.
   */
  const generateCatalogueRecord = (jsonData) => {
    const dataForSaid = deepClone(jsonData);

    // Clean existing identifiers that should not be hashed directly
    const cleanKeys = ["catalogue_id", "d", "@context", "@schema_id", "@type"];
    cleanKeys.forEach((key) => {
      if (key in dataForSaid) delete dataForSaid[key];
    });

    // Canonicalize
    const canonicalizedState = canonicalize(dataForSaid);
    const formData = JSON.parse(canonicalizedState);

    // Determine normalized SemVer (inherited from described resource) and timestamp
    const semVer = normalizeVersion(resourceVersion, "1.0.0");
    const timestamp = new Date().toISOString();

    // Preserve and enrich Dublin Core terms
    const existingDcterms =
      formData.dcterms && typeof formData.dcterms === "object"
        ? formData.dcterms
        : {};

    const updatedDcterms = {
      ...existingDcterms,
      version: semVer,
      modified: timestamp,
    };

    // Append-only revision tracking: Point to previous SAID if revising a published record
    if (isPublished && originalSaid) {
      updatedDcterms.isVersionOf = originalSaid;
    } else if (isPublished && isVersionOfPrior) {
      updatedDcterms.isVersionOf = isVersionOfPrior;
    }

    if (currentNotes && currentNotes.trim()) {
      updatedDcterms["adms:versionNotes"] = currentNotes.trim();
    }

    formData.dcterms = updatedDcterms;

    // Get context and schema ID
    const contextUrl = getContextUrl(schema);
    const schemaId = getSchemaId(schema);
    const schemaMeta = KNOWN_SCHEMA_MANIFEST[schemaId];
    const schemaPluginVersion = schemaMeta?.version || "1.0.0";
    const finalContext = injectDcatNamespace(contextUrl);

    // Build standard DCAT CatalogRecord structure
    // Embeds the schema plugin version so the system knows the form questionnaire version
    // without altering the content of the schema plugin file itself.
    const formDataWithId = {
      "@context": finalContext,
      "@type": "dcat:CatalogRecord",
      "@schema_id": schemaId,
      "@schema_version": schemaPluginVersion,
      d: "",
      ...formData,
    };

    // Deterministically calculate new SAID
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
    };

    let delivered = false;
    if (window.parent && window.parent !== window) {
      window.parent.postMessage(payload, "*");
      delivered = true;
    } else if (window.opener && !window.opener.closed) {
      try {
        window.opener.postMessage(payload, "*");
        delivered = true;
      } catch (err) {
        console.warn("Failed to post message to window.opener:", err);
      }
    }

    if (delivered) {
      if (window.opener && window.opener !== window) {
        alert("Catalogue record updated in ContextHub! You can close this tab.");
        try {
          window.close();
        } catch {
          // Window closing may be blocked by browser
        }
      }
    } else {
      alert(
        "Could not directly update ContextHub because the parent window could not be reached. The catalogue record file will now be downloaded so you can upload it to ContextHub."
      );
      downloadJson(jsonData);
    }
  };

  const updateContextHub = async (jsonData) => {
    setUpdating(true);
    try {
      const dataUrl = window.sessionStorage.getItem("dataUrl");
      if (!dataUrl) {
        throw new Error("No ContextHub data source URL found in session.");
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

      alert("Catalogue updated successfully on ContextHub as a new revision!");
    } catch (err) {
      console.error("Failed to update ContextHub:", err);
      alert(`Failed to update ContextHub: ${err.message}`);
    } finally {
      setUpdating(false);
    }
  };

  if (!jsonSchema) {
    return <div>{t("viewpage.loading")}</div>;
  }

  if (!isUploadedJson) {
    return <p>{t("viewpage.no_catalogue")}</p>;
  }

  const handleEditClick = () => {
    dispatch(setMode("edit"));
    const params = new URLSearchParams(window.location.search);
    if (!params.get("schema") && schema) {
      params.set("schema", schema);
    }
    navigate({
      pathname: "/form",
      search: params.toString() ? `?${params.toString()}` : "",
    });
  };

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

      <Box sx={{ maxWidth: 1000, margin: "auto", padding: 5 }}>
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
          {(() => {
            const currentSchemaId = getSchemaId(schema);
            const outdatedInfo = getSchemaPluginOutdatedStatus(currentSchemaId);
            if (!outdatedInfo.isOutdated) return null;
            return (
              <Alert
                severity="warning"
                sx={{ mb: 2 }}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  Form Questionnaire Outdated
                </Typography>
                <Typography variant="body2" sx={{ fontSize: "0.85rem" }}>
                  This catalogue record was created using an earlier version of the{" "}
                  <strong>{outdatedInfo.family}</strong> form questionnaire (v
                  {outdatedInfo.currentVersion}). A newer version of the form (v
                  {outdatedInfo.latestVersion}) is available.
                </Typography>
              </Alert>
            );
          })()}

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
                {isPublished ? "Catalogue Record Lineage & Version" : "Catalogue Record Version"}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Catalogue record versions inherit the version of the resource they describe.
              </Typography>
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, color: "text.secondary" }}>
                Resource Version:
              </Typography>
              <Chip
                label={`v${resourceVersion}`}
                size="small"
                color="primary"
                sx={{ fontWeight: 700, px: 0.5 }}
              />
            </Box>
          </Stack>

          {/* Lineage & Schema Badges (Only shown when revising a published record) */}
          {isPublished && (
            <Stack
              direction="row"
              spacing={1.5}
              alignItems="center"
              flexWrap="wrap"
              sx={{ mb: 1.5 }}
            >
              {originalSaid ? (
                <Chip
                  label={`Revises: ${originalSaid.slice(0, 24)}...`}
                  color="info"
                  variant="outlined"
                  size="small"
                  title={`Previous Record SAID: ${originalSaid}`}
                />
              ) : (
                <Chip
                  label="Initial Record (v1.0.0 or v0.1.0)"
                  color="success"
                  variant="outlined"
                  size="small"
                />
              )}

              <Chip
                label={`Schema: ${schema || "Default"} (${(getSchemaId(schema) || "").slice(0, 16)}...)`}
                variant="outlined"
                size="small"
              />
            </Stack>
          )}

          {isPublished && originalSaid && (
            <Alert severity="info" sx={{ mb: 1.5, py: 0.5, fontSize: "0.85rem" }}>
              Editing creates an immutable new revision linked via{" "}
              <code>dcterms:isVersionOf</code>. The original record remains unchanged.
            </Alert>
          )}

          {/* Version Notes */}
          <TextField
            fullWidth
            size="small"
            label="Revision Notes (optional)"
            placeholder="e.g. Initial draft 0.1.0, or corrected author description"
            value={currentNotes}
            onChange={handleNotesChange}
            helperText="Stored in the catalogue record JSON under dcterms['adms:versionNotes'] and synced to the Neo4j database as cat.versionNotes"
            FormHelperTextProps={{
              sx: { fontSize: "0.78rem", color: "text.secondary", mt: 0.5 },
            }}
            sx={{ backgroundColor: "#fff" }}
          />
        </Box>

        <DynamicForm language={lang} />

        <Box sx={{ mt: 3 }}>
          <Button
            variant="contained"
            sx={{
              backgroundColor: theme.primaryColor,
              "&:hover": {
                backgroundColor: theme.primaryColor,
              },
              mr: "10px",
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
              "&:hover": {
                backgroundColor: theme.primaryColor,
              },
              mr: "10px",
            }}
            onClick={() => downloadJson(formState)}
            startIcon={<FileDownloadIcon />}
          >
            {t("viewpage.download")}
          </Button>

          {(isIframeMode || buttonLabelParam) && (
            <Button
              variant="contained"
              sx={{
                backgroundColor: theme.primaryColor,
                "&:hover": {
                  backgroundColor: theme.primaryColor,
                },
                mr: "10px",
              }}
              onClick={() => postMessageToParent(formState)}
              startIcon={<SendIcon />}
            >
              {buttonLabelParam || "UPDATE TO CONTEXTHUB"}
            </Button>
          )}

          {!isIframeMode &&
            !buttonLabelParam &&
            window.sessionStorage.getItem("dataUrl") &&
            !window.sessionStorage.getItem("dataUrl")?.startsWith("data:") && (
            <Button
              variant="contained"
              disabled={updating}
              sx={{
                backgroundColor: theme.primaryColor,
                "&:hover": {
                  backgroundColor: theme.primaryColor,
                },
                mr: "10px",
              }}
              onClick={() => updateContextHub(formState)}
              startIcon={updating ? null : <SaveIcon />}
            >
              {updating ? "Updating..." : "Update ContextHub"}
            </Button>
          )}
        </Box>
      </Box>
      <Footer powered_by={t("powered_by")} supported_by={t("supported_by")} />
    </div>
  );
}

export default ViewPage;
