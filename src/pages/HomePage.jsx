import React, { useEffect, useId, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Stack, Box } from "@mui/system";
import {
  Alert,
  Button,
  CircularProgress,
  FormControl,
  FormHelperText,
  MenuItem,
  Select,
  Typography,
} from "@mui/material";
import AccordionExpand from "../components/Stateless/Accordion";
import { useTranslation } from "../utils/OpenAIRE/TranslationContext";
import UploadButton from "../components/Stateful/UploadButton";
import Footer from "../components/Stateless/Footer";
import theme from "../theme";
import HomeHeader from "../components/Stateless/HomeHeader";
import HomeSubHeader from "../components/Stateless/HomeSubHeader";
import {
  setSchemaName,
  resetFieldSchemas,
} from "../store/slices/fieldSchemaSlice";
import { useDispatch, useSelector } from "react-redux";
import { setInitialFormState } from "../store/slices/formValueSlice";
import { buildInstanceCountsFromValues } from "../utils/instanceCounts";
import { setAllInstanceCounts } from "../store/slices/instanceCountsSlice";
import { setMode } from "../store/slices/modeSlice";
import { getSchemaFromId } from "../utils/schemaMapping";
import {
  resetUploaded,
  selectIsUploaded,
  setIsUploaded,
  setRecordMetadata,
  setUpgradeContext,
} from "../store/slices/uploadFileSlice";
import { selectSchemaName } from "../store/selectors/formSelectors";
import {
  ROUTE_MAP,
  SCHEMA_REGISTRY,
  getSchemaPluginOutdatedStatus,
  getLatestSchemaForFamily,
} from "../utils/schemaRegistry";
import { normalizeNestedFields } from "../utils/normalizeJson";
import { migrateRecordToSchema } from "../utils/schemaMigration";
import { flattenFormData } from "../utils/formStateFlatten";
import { loadSchemaIntoStore } from "../utils/loadSchemaIntoStore";
import {
  isSafeDataUrl,
  safeSessionRemove,
  safeSessionSet,
} from "../utils/postMessageSecurity";
import { useNotification } from "../components/Stateless/NotificationContext";

function HomePage() {
  const [uploadedFiles, setUploadedFiles] = useState(null);
  const [jsonContent, setJsonContent] = useState(null);
  const [isLoadingSchema, setIsLoadingSchema] = useState(false);

  const schema = useSelector(selectSchemaName);
  const isUploaded = useSelector(selectIsUploaded);
  const isSchemaSelected = !!schema;
  const hasUploadedFile = isUploaded;

  const [schemaLocked, setSchemaLocked] = useState(false);
  const [outdatedSchemaInfo, setOutdatedSchemaInfo] = useState(null);
  const [uploadedSchemaId, setUploadedSchemaId] = useState(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t, lang } = useTranslation();
  const { notify } = useNotification();
  const dispatch = useDispatch();
  const schemaSelectLabelId = useId();

  // RESET on mount/return to HomePage
  useEffect(() => {
    const dataUrl = searchParams.get("dataUrl");
    if (dataUrl) {
      if (!dataUrl.startsWith("data:") && isSafeDataUrl(dataUrl)) {
        safeSessionSet("dataUrl", dataUrl);
      } else {
        safeSessionRemove("dataUrl");
      }
      return;
    }

    dispatch(resetUploaded());
    dispatch(resetFieldSchemas());
    dispatch(setMode("write"));

    setJsonContent(null);
    setUploadedFiles(null);
    setSchemaLocked(false);
    setOutdatedSchemaInfo(null);
    setUploadedSchemaId(null);

    safeSessionRemove("dataUrl");
  }, [dispatch, searchParams]);

  // AUTO-LOAD from URL params (e.g. ?dataUrl=<url>&schema=<schemaName>)
  useEffect(() => {
    const dataUrl = searchParams.get("dataUrl");
    const schemaParam = searchParams.get("schema");
    if (!dataUrl || !schemaParam) return;

    if (!isSafeDataUrl(dataUrl)) {
      notify(`${t("homepage.url_load_failed")} Invalid URL protocol`, "error");
      return;
    }

    let cancelled = false;

    const loadFromUrl = async () => {
      setIsLoadingSchema(true);
      try {
        const response = await fetch(dataUrl);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const jsonData = await response.json();
        if (cancelled) return;

        const { canonicalName, enrichedFields } = await loadSchemaIntoStore(
          dispatch,
          { schema: schemaParam, lang }
        );
        if (cancelled) return;

        const normalizedJson = normalizeNestedFields(jsonData, enrichedFields);
        const formValues = flattenFormData(normalizedJson);

        dispatch(setInitialFormState(formValues));
        dispatch(setAllInstanceCounts(buildInstanceCountsFromValues(formValues)));
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
            originalSaid: jsonData.d || null,
            recordVersion: loadedVersion,
            isVersionOf: loadedIsVersionOf,
            schemaId: jsonData["@schema_id"] || null,
          })
        );

        const baseRoute = ROUTE_MAP[canonicalName] || "/form";
        navigate(`${baseRoute}?schema=${encodeURIComponent(canonicalName)}`);
      } catch (err) {
        console.error("Auto-load from URL failed:", err);
        if (!cancelled) {
          notify(`${t("homepage.url_load_failed")} ${err.message}`, "error");
        }
      } finally {
        if (!cancelled) setIsLoadingSchema(false);
      }
    };

    loadFromUrl();
    return () => {
      cancelled = true;
    };
  }, [searchParams, dispatch, navigate, lang, notify, t]);

  const handleSchemaSelect = (e) => {
    dispatch(setSchemaName(e.target.value));
    setSchemaLocked(false);
  };

  const handleFileSelect = (files) => {
    dispatch(setSchemaName(""));
    const file = files[0];
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const jsonData = JSON.parse(e.target.result);
        setJsonContent(jsonData);
        setUploadedFiles(files);
        dispatch(setIsUploaded(true));

        const schemaId = jsonData["@schema_id"];
        setUploadedSchemaId(schemaId || null);

        const outdatedInfo = getSchemaPluginOutdatedStatus(schemaId);
        setOutdatedSchemaInfo(outdatedInfo.isOutdated ? outdatedInfo : null);

        const detectedSchema = schemaId ? getSchemaFromId(schemaId) : null;

        if (detectedSchema) {
          dispatch(setSchemaName(detectedSchema));
          setSchemaLocked(true);
        } else {
          notify(t("homepage.file_select_no_schema_detected"), "warning");
          setSchemaLocked(false);
        }

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
            originalSaid: jsonData.d || null,
            recordVersion: loadedVersion,
            isVersionOf: loadedIsVersionOf,
            schemaId,
          })
        );
      } catch (err) {
        console.error(err);
        notify(t("homepage.file_select_invalid_json"), "error");
        setJsonContent(null);
        setUploadedFiles(null);
        dispatch(setSchemaName(""));
        setSchemaLocked(false);
        dispatch(setIsUploaded(false));
      }
    };

    reader.readAsText(file);
  };

  const handleCancelUpload = () => {
    setJsonContent(null);
    setUploadedFiles(null);
    dispatch(resetUploaded());
    dispatch(resetFieldSchemas());
    setSchemaLocked(false);
    setOutdatedSchemaInfo(null);
    setUploadedSchemaId(null);
  };

  const handleNavigate = async () => {
    if (!schema || isLoadingSchema) return;
    setIsLoadingSchema(true);
    try {
      const { canonicalName } = await loadSchemaIntoStore(dispatch, {
        schema,
        lang,
      });
      dispatch(setMode("write"));
      const baseRoute = ROUTE_MAP[canonicalName] || "/form";
      navigate(`${baseRoute}?schema=${encodeURIComponent(canonicalName)}`);
    } catch (err) {
      console.error("Failed to open form:", err);
      notify(t("homepage.schema_load_failed"), "error");
    } finally {
      setIsLoadingSchema(false);
    }
  };

  const handleViewClick = async () => {
    if (!jsonContent) {
      notify(t("homepage.view_click_no_content"), "warning");
      return;
    }
    if (!schema) {
      notify(t("homepage.view_click_no_schemaId"), "warning");
      return;
    }

    setIsLoadingSchema(true);
    try {
      const { enrichedFields } = await loadSchemaIntoStore(dispatch, {
        schema,
        exactSaid: uploadedSchemaId || null,
        lang,
      });

      const normalizedJson = normalizeNestedFields(jsonContent, enrichedFields);
      const formValues = flattenFormData(normalizedJson);
      dispatch(setInitialFormState(formValues));
      dispatch(setAllInstanceCounts(buildInstanceCountsFromValues(formValues)));
      dispatch(setMode("view"));
      navigate("/view");
    } catch (err) {
      console.error("Failed to view record:", err);
      notify(t("homepage.schema_load_failed"), "error");
    } finally {
      setIsLoadingSchema(false);
    }
  };

  const handleUpgradeClick = async () => {
    if (!jsonContent || !outdatedSchemaInfo?.latestSaid) return;

    setIsLoadingSchema(true);
    try {
      const latest = getLatestSchemaForFamily(
        uploadedSchemaId || outdatedSchemaInfo.family
      );
      const targetSaid = latest?.said || outdatedSchemaInfo.latestSaid;
      const targetName = latest?.name || outdatedSchemaInfo.family || schema;

      const { canonicalName, enrichedFields } = await loadSchemaIntoStore(
        dispatch,
        {
          schema: targetName,
          exactSaid: targetSaid,
          lang,
        }
      );

      const migration = migrateRecordToSchema(jsonContent, enrichedFields);

      dispatch(setInitialFormState(migration.formValues));
      dispatch(setAllInstanceCounts(migration.instanceCounts));
      dispatch(setMode("edit"));

      const loadedVersion =
        jsonContent.dcterms?.version ||
        jsonContent.version ||
        jsonContent["dcterms:version"] ||
        "1.0.0";
      dispatch(
        setRecordMetadata({
          originalSaid: jsonContent.d || null,
          recordVersion: loadedVersion,
          isVersionOf: jsonContent.dcterms?.isVersionOf || jsonContent.d || null,
          schemaId: uploadedSchemaId,
          isPublished: Boolean(jsonContent.d),
        })
      );
      dispatch(
        setUpgradeContext({
          isUpgradeMode: true,
          sourceSchemaId: uploadedSchemaId,
          sourceSchemaVersion: outdatedSchemaInfo.currentVersion,
          targetSchemaId: targetSaid,
          targetSchemaVersion: outdatedSchemaInfo.latestVersion,
          targetFamily: outdatedSchemaInfo.family,
          unmappedFields: migration.unmappedFields,
          missingRequiredFields: migration.missingRequiredFields,
          mappedFieldCount: migration.mappedCount,
        })
      );

      const baseRoute = latest?.route || ROUTE_MAP[canonicalName] || "/form";
      navigate(
        `${baseRoute}?schema=${encodeURIComponent(canonicalName)}&mode=upgrade&targetSchemaId=${encodeURIComponent(targetSaid)}`
      );
    } catch (err) {
      console.error("Upgrade failed:", err);
      notify(t("homepage.upgrade_load_failed"), "error");
    } finally {
      setIsLoadingSchema(false);
    }
  };

  const handleEditClick = async () => {
    if (!jsonContent) {
      notify(t("homepage.edit_click_no_content"), "warning");
      return;
    }
    if (!schema) {
      notify(t("homepage.edit_click_no_schemaId"), "warning");
      return;
    }

    setIsLoadingSchema(true);
    try {
      const { canonicalName, enrichedFields } = await loadSchemaIntoStore(
        dispatch,
        {
          schema,
          exactSaid: uploadedSchemaId || null,
          lang,
        }
      );

      const normalizedJson = normalizeNestedFields(jsonContent, enrichedFields);
      const formValues = flattenFormData(normalizedJson);
      dispatch(setInitialFormState(formValues));
      dispatch(setAllInstanceCounts(buildInstanceCountsFromValues(formValues)));
      dispatch(setMode("edit"));

      const baseRoute = ROUTE_MAP[canonicalName] || "/form";
      navigate(`${baseRoute}?schema=${encodeURIComponent(canonicalName)}`);
    } catch (err) {
      console.error("Failed to open edit form:", err);
      notify(t("homepage.schema_load_failed"), "error");
    } finally {
      setIsLoadingSchema(false);
    }
  };

  const accordionSummaryLines = useMemo(
    () => t("homepage.accordion_summary_1").split("\n"),
    [t]
  );

  return (
    <div className="HomePage">
      <HomeHeader
        semantic_engine={t("homepage.semantic_engine")}
        catalogue={t("homepage.records")}
      />
      <HomeSubHeader
        content_heading={t("homepage.content_heading")}
        content={t("homepage.content")}
      />

      <Box component="main" id="main-content">
        <Stack
          direction={{ sm: "column", md: "row" }}
          spacing={{ xs: 3, sm: 3, md: 4, lg: 8 }}
          alignItems={{ xs: "center", sm: "center", md: "flex-start" }}
          justifyContent="space-between"
          sx={{
            marginTop: "50px",
            mb: "60px",
            padding: {
              xs: "0px 16px",
              sm: "0px 50px",
              md: "0px 70px",
              lg: "0px 140px",
              xl: "0px 300px",
            },
          }}
        >
          <Box width={{ xs: "95%", sm: "75%", md: "50%" }}>
            <div className="MainContent" style={{ padding: "0px 10px" }}>
              <AccordionExpand
                accordion_question={t("homepage.accordion_question_1")}
                accordion_summary={accordionSummaryLines.map((line, i) => (
                  <React.Fragment key={i}>
                    {line}
                    {i < accordionSummaryLines.length - 1 && <br />}
                  </React.Fragment>
                ))}
              />
            </div>
          </Box>
          <Box
            width={{ xs: "95%", sm: "90%", md: "50%" }}
            pb={"40px"}
            alignItems="center"
            sx={{
              textAlign: "center",
              backgroundColor: theme.secondaryColor,
              borderRadius: 1,
            }}
          >
            <Typography
              component="h2"
              sx={{ fontSize: "1.5rem", fontWeight: 500, my: 2.5 }}
            >
              {t("homepage.quick_links")}
            </Typography>
            <Box sx={{ mb: "20px" }}>
              {!schemaLocked && (
                <FormHelperText
                  id={schemaSelectLabelId}
                  sx={{ textAlign: "center", fontSize: "15px" }}
                >
                  {t("homepage.select_schema")}
                </FormHelperText>
              )}

              <FormControl sx={{ width: "75%" }}>
                <Select
                  value={schema}
                  onChange={handleSchemaSelect}
                  displayEmpty
                  disabled={schemaLocked || isLoadingSchema}
                  inputProps={{
                    "aria-label": t("homepage.select_schema"),
                    "aria-labelledby": !schemaLocked ? schemaSelectLabelId : undefined,
                  }}
                >
                  <MenuItem value="" sx={{ color: "rgba(100, 100, 100, 1)" }}>
                    <em>{t("homepage.none")}</em>
                  </MenuItem>

                  {SCHEMA_REGISTRY.map((schemaItem) => (
                    <MenuItem key={schemaItem.name} value={schemaItem.name}>
                      {schemaItem.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {/* Accessible keyboard-navigable Write button (replaces Link without `to`) */}
            {isSchemaSelected && !hasUploadedFile && (
              <Button
                type="button"
                variant="text"
                disabled={isLoadingSchema}
                onClick={handleNavigate}
                startIcon={
                  isLoadingSchema ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : null
                }
                sx={{
                  fontSize: "1.25rem",
                  fontWeight: 600,
                  textTransform: "none",
                  color: theme.primaryTextColor,
                  textDecoration: "underline",
                  textUnderlineOffset: "3px",
                  textDecorationColor: theme.underlineColor,
                  "&:hover": {
                    textDecoration: "underline",
                    textDecorationColor: theme.primaryTextColor,
                    backgroundColor: theme.hoverUnselectedBgColor,
                  },
                }}
              >
                {isLoadingSchema
                  ? t("homepage.loading_schema")
                  : t("homepage.write")}
              </Button>
            )}

            <hr
              style={{
                width: "90%",
                border: 0,
                borderTop: `2px ${theme.primaryColor} solid`,
                marginTop: "20px",
              }}
            />

            <UploadButton
              onFileSelect={handleFileSelect}
              upload_file={
                hasUploadedFile
                  ? t("homepage.upload_different")
                  : t("homepage.upload_file")
              }
            />

            <Box
              sx={{
                width: "100%",
                mb: 2,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              {hasUploadedFile && outdatedSchemaInfo && (
                <Alert
                  severity="warning"
                  sx={{ mb: 1.5, textAlign: "left", width: "85%" }}
                >
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    {t("homepage.outdated_title")}
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: "0.85rem" }}>
                    {t("homepage.outdated_body_prefix")}{" "}
                    <strong>{outdatedSchemaInfo.family}</strong>{" "}
                    {t("homepage.outdated_body_mid")} (v
                    {outdatedSchemaInfo.currentVersion}).{" "}
                    {t("homepage.outdated_body_suffix")} v
                    {outdatedSchemaInfo.latestVersion}.
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ display: "block", mt: 0.5, color: "text.secondary" }}
                  >
                    {t("homepage.outdated_upgrade_hint")}
                  </Typography>
                  <Button
                    variant="contained"
                    size="small"
                    disabled={isLoadingSchema}
                    onClick={handleUpgradeClick}
                    sx={{
                      mt: 1.25,
                      backgroundColor: theme.primaryColor,
                      color: theme.primaryContrastText,
                      transition: "background-color 0.15s ease",
                      "&:hover": {
                        backgroundColor: theme.primaryHoverColor,
                      },
                      textTransform: "none",
                      fontWeight: 600,
                    }}
                  >
                    {t("homepage.upgrade_to")} v{outdatedSchemaInfo.latestVersion}
                  </Button>
                </Alert>
              )}

              {hasUploadedFile && uploadedFiles?.[0]?.name && (
                <Typography
                  sx={{
                    whiteSpace: "normal",
                    overflowWrap: "anywhere",
                    wordWrap: "break-word",
                    wordBreak: "break-word",
                    margin: 1,
                  }}
                >
                  {t("homepage.file_uploaded")}
                  {uploadedFiles[0].name}
                </Typography>
              )}
            </Box>

            {hasUploadedFile && (
              <Button
                variant="contained"
                onClick={handleCancelUpload}
                sx={{
                  mb: 1,
                  width: "50%",
                  backgroundColor: "#d32f2f",
                  transition: "background-color 0.15s ease",
                  "&:hover": {
                    backgroundColor: "#b71c1c",
                  },
                  cursor: "pointer",
                }}
              >
                {t("homepage.clear_upload")}
              </Button>
            )}

            {hasUploadedFile && isSchemaSelected && (
              <hr
                style={{
                  width: "80%",
                  border: 0,
                  borderTop: `2px ${theme.primaryColor} solid`,
                  marginBottom: 20,
                }}
              />
            )}

            {hasUploadedFile && isSchemaSelected && (
              <Stack
                direction="column"
                spacing={2}
                justifyContent="center"
                alignItems="center"
              >
                <Button
                  variant="contained"
                  disabled={!hasUploadedFile || !isSchemaSelected || isLoadingSchema}
                  onClick={handleViewClick}
                  sx={{
                    width: "75%",
                    backgroundColor: theme.primaryColor,
                    color: theme.primaryContrastText,
                    fontWeight: 600,
                    transition: "background-color 0.15s ease",
                    "&:hover": {
                      backgroundColor: theme.primaryHoverColor,
                    },
                  }}
                >
                  {t("homepage.view")}
                </Button>
                <Button
                  variant="contained"
                  disabled={!hasUploadedFile || !isSchemaSelected || isLoadingSchema}
                  onClick={handleEditClick}
                  sx={{
                    width: "75%",
                    backgroundColor: theme.primaryColor,
                    color: theme.primaryContrastText,
                    fontWeight: 600,
                    transition: "background-color 0.15s ease",
                    "&:hover": {
                      backgroundColor: theme.primaryHoverColor,
                    },
                  }}
                >
                  {t("homepage.edit")}
                </Button>
              </Stack>
            )}
          </Box>
        </Stack>
      </Box>
      <Footer powered_by={t("powered_by")} supported_by={t("supported_by")} />
    </div>
  );
}

export default HomePage;
