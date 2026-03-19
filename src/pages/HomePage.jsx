import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Stack, Box } from "@mui/system";
import {
  Button,
  FormControl,
  FormHelperText,
  MenuItem,
  Select,
  Typography,
} from "@mui/material";
import AccordionExpand from "../components/Stateless/Accordion";
import { useTranslation } from "../utils/OpenAIRE/TranslationContext";
import { extractAttributes } from "../utils/extractAttributes";
import UploadButton from "../components/Stateful/UploadButton";
import Footer from "../components/Stateless/Footer";
import theme from "../theme";
import HomeHeader from "../components/Stateless/HomeHeader";
import HomeSubHeader from "../components/Stateless/HomeSubHeader";
// import HomeQuickStart from "../components/Stateless/HomeQuickStart";
import {
  setFields,
  setSchemaName,
  setDepFormatPatterns,
  setFormatPatterns,
  resetFieldSchemas,
} from "../store/slices/fieldSchemaSlice";
import { useDispatch, useSelector } from "react-redux";
import { extractJsonSchemaAsync } from "../utils/extractJsonSchema";
import { setInitialFormState } from "../store/slices/formValueSlice.js";
import { buildInstanceCountsFromValues } from "../utils/instanceCounts";
import {
  setAllInstanceCounts,
  setInstanceCount,
} from "../store/slices/instanceCountsSlice";
import { serializeRegexPatterns } from "../utils/regexUtils.js";
import { enrichFieldsWithPaths } from "../utils/enrichFieldsWithPaths.js";
import { setMode } from "../store/slices/modeSlice.js";
import { getSchemaFromId } from "../utils/schemaContextMapping.js";
import {
  resetUploaded,
  selectIsUploaded,
  setIsUploaded,
} from "../store/slices/uploadFileSlice.js";
import { selectSchemaName } from "../store/selectors/formSelectors.js";

function HomePage() {
  const [uploadedFiles, setUploadedFiles] = useState(null);
  const [jsonContent, setJsonContent] = useState(null);

  // const [schema, setSchema] = useState("");
  const schema = useSelector(selectSchemaName);
  const isUploaded = useSelector(selectIsUploaded);
  const isSchemaSelected = !!schema;
  // const hasUploadedFile = !!uploadedFiles;
  const hasUploadedFile = isUploaded;

  const [schemaLocked, setSchemaLocked] = useState(false); // true when schema came from @schema_id
  const navigate = useNavigate();
  const { t } = useTranslation(); // use translation function
  const dispatch = useDispatch();

  // RESET on mount/return to HomePage
  useEffect(() => {
    // Reset Redux upload state
    dispatch(resetUploaded());

    // Reset fieldSchema upload state
    dispatch(resetFieldSchemas());

    // Reset local state
    setJsonContent(null);
    setUploadedFiles(null);
    setSchemaLocked(false);
  }, [dispatch]); // empty deps = run once on mount

  //
  const handleSchemaSelect = (e) => {
    const value = e.target.value;

    // setSchema(value);
    dispatch(setSchemaName(value));

    // This is a manual schema choice, so it should not be "locked by file"
    setSchemaLocked(false);
  };

  //
  const handleFileSelect = (files) => {
    dispatch(setSchemaName(""));
    const file = files[0];
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const jsonData = JSON.parse(e.target.result);

        // Store file + content in all success cases
        setJsonContent(jsonData);
        setUploadedFiles(files);

        dispatch(setIsUploaded(true)); // mark as uploaded globally

        // 1) Read `@schema_id` from the uploaded JSON-LD
        const schemaId = jsonData["@schema_id"];

        // 2) Map it to internal schema name
        const detectedSchema = schemaId ? getSchemaFromId(schemaId) : null;

        if (detectedSchema) {
          // Case 1: file HAS @schema_id
          // setSchema(detectedSchema);
          dispatch(setSchemaName(detectedSchema));
          setSchemaLocked(true);
        } else {
          // Case 2: file has NO @schema_id
          alert(t("homepage.file_select_no_schema_detected"));
          // Do NOT touch existing schema; user might already have selected it
          setSchemaLocked(false); // user can choose schema from the menu
        }
      } catch (err) {
        console.error(err);
        alert(t("homepage.file_select_invalid_json"));
        setJsonContent(null);
        setUploadedFiles(null);
        // setSchema("");
        dispatch(setSchemaName(""));
        setSchemaLocked(false);
        dispatch(setIsUploaded(false));
      }
    };

    reader.readAsText(file);
  };

  //
  const handleCancelUpload = () => {
    // Clear content and file
    setJsonContent(null);
    setUploadedFiles(null);

    // Reset Redux upload state
    dispatch(resetUploaded());

    // Reset fieldSchema upload state
    dispatch(resetFieldSchemas());

    setSchemaLocked(false);
  };

  // FLATTEN NESTED OBJECT TO SINGLE LEVEL WITH DOT NOTATION KEYS
  function flatten(obj, parentKey = "", result = {}) {
    if (Array.isArray(obj)) {
      if (obj.length === 0) {
        // Always include the array path
        result[parentKey] = obj;
      } else {
        // Then recurse into elements
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
    // Object case
    for (const key in obj) {
      if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
      const value = obj[key];
      const newKey = parentKey ? `${parentKey}.${key}` : key;
      if (value !== null && typeof value === "object") {
        // Then recurse into children
        flatten(value, newKey, result);
      } else {
        // Primitive → set directly
        result[newKey] = value;
      }
    }
    return result;
  }

  // Form Routing
  const getFormRoute = async () => {
    const jsonSchema = await extractJsonSchemaAsync(schema);
    const { fields, formatPatterns, depFormatPatterns } =
      extractAttributes(jsonSchema);
    // Enrich fields with paths BEFORE dispatching
    const enrichedFields = enrichFieldsWithPaths(fields);

    dispatch(setFields(enrichedFields));
    dispatch(setFormatPatterns(serializeRegexPatterns(formatPatterns)));
    dispatch(setDepFormatPatterns(serializeRegexPatterns(depFormatPatterns)));

    // Return route WITH schema param
    const routeMap = {
      OpenAIRE: "/form",
      "Dublin Core (Repository-specific)": "/form-dublincore-repository",
      "Dublin Core (Project-specific)": "/form-dublincore-project",
      DataCite: "/form-datacite",
      "DCAT [Demo]": "/form-dcat-demo",
      "Project (RAiD-inspired)": "/form-project-raid-inspired",
    };

    const baseRoute = routeMap[schema] || "/form";
    return `${baseRoute}?schema=${encodeURIComponent(schema)}`;
  };

  //
  const handleNavigate = async () => {
    const route = await getFormRoute(); // Awaits schema extraction & dispatches
    dispatch(setMode("edit"));
    navigate(route);
  };

  //
  const handleViewClick = async () => {
    if (!jsonContent) {
      alert(t("homepage.view_click_no_content"));
      return;
    }
    if (!schema) {
      alert(t("homepage.view_click_no_schemaId"));
      return;
    }

    if (jsonContent) {
      const jsonSchema = await extractJsonSchemaAsync(schema);
      const formValues = flatten(jsonContent);
      dispatch(setInitialFormState(formValues));
      const { fields, formatPatterns, depFormatPatterns } =
        extractAttributes(jsonSchema);
      // Enrich fields with paths BEFORE dispatching
      const enrichedFields = enrichFieldsWithPaths(fields);
      dispatch(setFields(enrichedFields));
      dispatch(setFormatPatterns(serializeRegexPatterns(formatPatterns)));
      dispatch(setDepFormatPatterns(serializeRegexPatterns(depFormatPatterns)));

      const instanceCount = buildInstanceCountsFromValues(formValues);
      dispatch(setAllInstanceCounts(instanceCount));

      dispatch(setMode("view"));
      navigate("/view");
    }
  };

  //
  const handleEditClick = async () => {
    if (!jsonContent) {
      alert(t("homepage.edit_click_no_content"));
      return;
    }
    if (!schema) {
      alert(t("homepage.edit_click_no_schemaId"));
      return;
    }

    if (jsonContent) {
      const jsonSchema = await extractJsonSchemaAsync(schema);
      const formValues = flatten(jsonContent);
      dispatch(setInitialFormState(formValues));

      const { fields, formatPatterns, depFormatPatterns } =
        extractAttributes(jsonSchema);
      // Enrich fields with paths BEFORE dispatching
      const enrichedFields = enrichFieldsWithPaths(fields);
      dispatch(setFields(enrichedFields));
      dispatch(setFormatPatterns(serializeRegexPatterns(formatPatterns)));
      dispatch(setDepFormatPatterns(serializeRegexPatterns(depFormatPatterns)));

      const instanceCount = buildInstanceCountsFromValues(formValues);
      dispatch(setInstanceCount(instanceCount));

      dispatch(setMode("edit"));

      const route = await getFormRoute();
      navigate(route + `?schema=${encodeURIComponent(schema)}`);
    }
  };

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
      {/* <HomeQuickStart
        quick_start_heading={t("homepage.quick_start_heading")}
        step_1={t("homepage.step_1")}
        watch_tutorial_video={t("homepage.watch_tutorial_video")}
        or={t("homepage.or")}
        read_the_tutorial={t("homepage.read_the_tutorial")}
        instead={t("homepage.instead")}
        step_2={t("homepage.step_2")}
        step_3={t("homepage.step_3")}
        step_4={t("homepage.step_4")}
      /> */}

      <br />
      <Stack
        direction={{ sm: "column", md: "row" }}
        spacing={{ xs: 3, sm: 3, md: 4, lg: 8 }}
        alignItems={{ xs: "center", sm: "center", md: "flex-start" }}
        justifyContent="space-between"
        sx={{
          marginTop: "50px",
          mb: "60px",
          padding: {
            sm: "0px 50px",
            md: "0px 70px",
            lg: "0px 140px",
            xl: "0px 300px",
          },
        }}
      >
        <Box width={{ xs: "90%", sm: "75%", md: "50%" }}>
          <div className="MainContent" style={{ padding: "0px 10px" }}>
            <AccordionExpand
              accordion_question={t("homepage.accordion_question_1")}
              accordion_summary={
                // t("homepage.accordion_summary_1")}
                t("homepage.accordion_summary_1")
                  .split("\n")
                  .map((line, i) => (
                    <React.Fragment key={i}>
                      {line}
                      {i <
                        t("homepage.accordion_summary_1").split("\n").length -
                          1 && <br />}
                    </React.Fragment>
                  ))
              }
            />
            <br />
            {/* <AccordionExpand
              accordion_question={t("homepage.accordion_question_2")}
              accordion_summary={t("homepage.accordion_summary_2")}
            />
            <br />
            <AccordionExpand
              accordion_question={t("homepage.accordion_question_3")}
              accordion_summary={t("homepage.accordion_summary_3")}
            /> */}
          </div>
        </Box>
        <Box
          width={{ xs: "90%", sm: "90%", md: "50%" }}
          pb={"40px"}
          alignItems="center"
          style={{
            textAlign: "center",
            backgroundColor: theme.secondaryColor,
          }}
        >
          <p style={{ fontSize: "1.5rem", fontWeight: "500" }}>
            {t("homepage.quick_links")}
          </p>
          <Box sx={{ mb: "20px" }}>
            {!schemaLocked && (
              <FormHelperText sx={{ textAlign: "center", fontSize: "15px" }}>
                {t("homepage.select_schema")}
              </FormHelperText>
            )}

            {/* Schema Selection Menu */}
            <FormControl sx={{ width: "75%" }}>
              <Select
                value={schema}
                onChange={handleSchemaSelect}
                displayEmpty
                disabled={schemaLocked} // disabled only when file set the schema
              >
                <MenuItem value="" sx={{ color: "rgba(100, 100, 100, 1)" }}>
                  <em>None</em>
                </MenuItem>
                <MenuItem value="OpenAIRE">OpenAIRE</MenuItem>
                <MenuItem value="Dublin Core (Repository-specific)">
                  Dublin Core (Repository-specific)
                </MenuItem>
                <MenuItem value="Dublin Core (Project-specific)">
                  Dublin Core (Project-specific)
                </MenuItem>
                <MenuItem value="DataCite">DataCite</MenuItem>
                <MenuItem value="DCAT [Demo]">DCAT [Demo]</MenuItem>
                <MenuItem value="Project (RAiD-inspired)">
                  Project (RAiD-inspired)
                </MenuItem>
              </Select>
            </FormControl>
          </Box>

          {/* Write link - enabled when any schema is selected AND no uploaded file */}
          {isSchemaSelected && !hasUploadedFile && (
            <Box
              component={Link}
              onClick={handleNavigate}
              sx={{
                fontSize: "1.25rem",
                fontWeight: "500",
                color: schema ? theme.primaryColor : "rgba(100, 100, 100, 1)",
                textDecoration: "underline",
                textUnderlineOffset: "2px",
                textDecorationColor: theme.underlineColor,
                cursor: "pointer",
                "&:hover": {
                  textDecorationColor: theme.primaryColor,
                },
              }}
            >
              {t("homepage.write")}
            </Box>
          )}

          <hr
            style={{
              width: "90%",
              border: `1px ${theme.primaryColor} solid`,
              marginTop: "20px",
            }}
          />

          {/* Upload button - enabled when any schema is selected */}
          <UploadButton
            onFileSelect={handleFileSelect}
            upload_file={
              hasUploadedFile
                ? t("homepage.upload_different")
                : t("homepage.upload_file")
            }
          />

          <Box sx={{ width: "100%", mb: 2 }}>
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
                backgroundColor: "red",
                "&:hover": {
                  backgroundColor: "red",
                },
                boxShadow: undefined,
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
                border: `1px ${theme.primaryColor} solid`,
                marginBottom: 20,
              }}
            />
          )}

          {/* View and Edit buttons - only enabled when files uploaded */}
          {hasUploadedFile && isSchemaSelected && (
            <Stack
              direction="column"
              spacing={2}
              justifyContent="center"
              alignItems="center"
            >
              <Button
                variant="contained"
                disabled={!hasUploadedFile || !isSchemaSelected}
                onClick={handleViewClick}
                sx={{
                  width: "75%",
                  backgroundColor:
                    hasUploadedFile && isSchemaSelected
                      ? theme.primaryColor
                      : "rgba(255, 255, 255, 0.25)",
                  "&:hover": {
                    backgroundColor: theme.primaryColor,
                  },
                  color: hasUploadedFile && isSchemaSelected ? "white" : "gray",
                  boxShadow:
                    hasUploadedFile && isSchemaSelected ? undefined : "none",
                  cursor:
                    hasUploadedFile && isSchemaSelected ? "pointer" : "default",
                }}
              >
                {t("homepage.view")}
              </Button>
              <Button
                variant="contained"
                disabled={!hasUploadedFile || !isSchemaSelected}
                onClick={handleEditClick}
                sx={{
                  width: "75%",
                  backgroundColor:
                    hasUploadedFile && isSchemaSelected
                      ? theme.primaryColor
                      : "rgba(255, 255, 255, 0.25)",
                  "&:hover": {
                    backgroundColor: theme.primaryColor,
                  },
                  color: hasUploadedFile && isSchemaSelected ? "white" : "gray",
                  boxShadow:
                    hasUploadedFile && isSchemaSelected ? undefined : "none",
                  cursor:
                    hasUploadedFile && isSchemaSelected ? "pointer" : "default",
                }}
              >
                {t("homepage.edit")}
              </Button>
            </Stack>
          )}
        </Box>
      </Stack>
      <Footer powered_by={t("powered_by")} supported_by={t("supported_by")} />
    </div>
  );
}

export default HomePage;
