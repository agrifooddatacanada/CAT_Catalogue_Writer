import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Stack, Box } from "@mui/system";
import {
  Button,
  FormControl,
  FormHelperText,
  MenuItem,
  Select,
} from "@mui/material";
import AccordionExpand from "../components/Stateless/Accordion";
import { useTranslation } from "../utils/OpenAIRE/TranslationContext";
//import SelectLanguage from "../components/Stateful/LanguageSelector";
import UploadButton from "../components/Stateful/UploadButton";
import Footer from "../components/Stateless/Footer";
import theme from "../theme";
import HomeHeader from "../components/Stateless/HomeHeader";
import HomeSubHeader from "../components/Stateless/HomeSubHeader";
import HomeQuickStart from "../components/Stateless/HomeQuickStart";

function HomePage() {
  const [uploadedFiles, setUploadedFiles] = useState(null);
  const [jsonContent, setJsonContent] = useState(null);
  const [schema, setSchema] = useState(null);
  const navigate = useNavigate();
  const { t } = useTranslation(); // use translation function

  const isSchemaSelected = schema !== null && schema !== "";

  const handleSchemaSelect = (e) => {
    setSchema(e.target.value);
    // Reset files when schema changes to ensure schema-file match
    if (uploadedFiles) {
      setUploadedFiles(null);
      setJsonContent(null);
    }
  };

  const handleFileSelect = (files) => {
    const file = files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const jsonData = JSON.parse(e.target.result);
        setJsonContent(jsonData);
        setUploadedFiles(files);
      } catch (e) {
        alert("Invalid JSON file");
      }
    };
    reader.readAsText(file);
  };

  const getFormRoute = () => {
    switch (schema) {
      case "OpenAIRE":
        return "/form";
      case "Dublin Core (Repository) [Test]":
        return "/form-dublincore";
      case "DataCite [Test]":
        return "/form-datacite";
      default:
        return "/form";
    }
  };

  const handleViewClick = () => {
    if (jsonContent) {
      navigate("/view", { state: { jsonContent, schema } });
    }
  };

  //
  const handleEditClick = () => {
    if (jsonContent) {
      navigate(getFormRoute(), { state: { jsonContent, schema } });
    }
  };

  return (
    <div className="HomePage">
      <HomeHeader
        semantic_engine={t("homepage.semantic_engine")}
        catalogue={t("homepage.catalogue")}
      />
      <HomeSubHeader
        content_heading={t("homepage.content_heading")}
        content={t("homepage.content")}
      />
      <HomeQuickStart
        quick_start_heading={t("homepage.quick_start_heading")}
        step_1={t("homepage.step_1")}
        watch_tutorial_video={t("homepage.watch_tutorial_video")}
        or={t("homepage.or")}
        read_the_tutorial={t("homepage.read_the_tutorial")}
        instead={t("homepage.instead")}
        step_2={t("homepage.step_2")}
        step_3={t("homepage.step_3")}
        step_4={t("homepage.step_4")}
      />

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
              accordion_summary={t("homepage.accordion_summary_1")}
            />
            <br />
            <AccordionExpand
              accordion_question={t("homepage.accordion_question_2")}
              accordion_summary={t("homepage.accordion_summary_2")}
            />
            <br />
            <AccordionExpand
              accordion_question={t("homepage.accordion_question_3")}
              accordion_summary={t("homepage.accordion_summary_3")}
            />
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
            <FormHelperText sx={{ textAlign: "center", fontSize: "15px" }}>
              Select a Schema to Proceed
            </FormHelperText>
            <FormControl sx={{ width: "75%" }}>
              <Select value={schema} onChange={handleSchemaSelect} displayEmpty>
                <MenuItem value="" sx={{ color: "rgba(100, 100, 100, 1)" }}>
                  <em>None</em>
                </MenuItem>
                <MenuItem value="OpenAIRE">OpenAIRE</MenuItem>
                <MenuItem value="Dublin Core (Repository) [Test]">
                  Dublin Core (Repository) [Test]
                </MenuItem>
                <MenuItem value="DataCite [Test]">DataCite [Test]</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {/* Write link - enabled when any schema is selected */}
          {isSchemaSelected && (
            <Box
              component={Link}
              to={getFormRoute()}
              state={{ schema }}
              sx={{
                fontSize: "1.25rem",
                fontWeight: "500",
                color: isSchemaSelected
                  ? theme.primaryColor
                  : "rgba(100, 100, 100, 1)",
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
            upload_file={t("homepage.upload_file")}
            disabled={!isSchemaSelected}
          />
          <Box sx={{ width: "90%" }}>
            {uploadedFiles && (
              <p>
                {t("homepage.file_uploaded")}
                {uploadedFiles[0].name}
              </p>
            )}
          </Box>

          {/* View and Edit buttons - only enabled when files uploaded */}
          <Stack
            direction="column"
            spacing={2}
            justifyContent="center"
            alignItems="center"
          >
            <Button
              variant="contained"
              disabled={!uploadedFiles}
              onClick={handleViewClick}
              sx={{
                width: "75%",
                backgroundColor: uploadedFiles
                  ? theme.primaryColor
                  : "rgba(255, 255, 255, 0.25)",
                "&:hover": {
                  backgroundColor: theme.primaryColor,
                },
                color: uploadedFiles ? "white" : "gray",
                boxShadow: uploadedFiles ? undefined : "none",
                cursor: uploadedFiles ? "pointer" : "default",
              }}
            >
              {t("homepage.view")}
            </Button>
            <Button
              variant="contained"
              disabled={!uploadedFiles}
              onClick={handleEditClick}
              sx={{
                width: "75%",
                backgroundColor: uploadedFiles
                  ? theme.primaryColor
                  : "rgba(255, 255, 255, 0.25)",
                "&:hover": {
                  backgroundColor: theme.primaryColor,
                },
                color: uploadedFiles ? "white" : "gray",
                boxShadow: uploadedFiles ? undefined : "none",
                cursor: uploadedFiles ? "pointer" : "default",
              }}
            >
              {t("homepage.edit")}
            </Button>
          </Stack>
        </Box>
      </Stack>
      <Footer powered_by={t("powered_by")} supported_by={t("supported_by")} />
    </div>
  );
}

export default HomePage;
