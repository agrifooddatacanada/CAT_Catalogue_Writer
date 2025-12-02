import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Stack, Box } from "@mui/system";
import { Button } from "@mui/material";
import AccordionExpand from "../components/Stateless/Accordion";
import { useTranslation } from "../utils/OpenAIRE/TranslationContext";
//import SelectLanguage from "../components/Stateful/LanguageSelector";
import UploadButton from "../components/Stateful/UploadButton";
import Footer from "../components/Stateless/Footer";
import theme from "../theme";
import HomeHeader from "../components/Stateless/HomeHeader";

function HomePage() {
  const [uploadedFiles, setUploadedFiles] = useState(null);
  const [jsonContent, setJsonContent] = useState(null);
  const navigate = useNavigate();

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

  const handleViewClick = () => {
    if (jsonContent) {
      navigate("/view", { state: { jsonContent } });
    }
  };

  // 
  const handleEditClick = () => {
    if (jsonContent) {
      navigate("/form", { state: { jsonContent } });
    }
  };

  const { t } = useTranslation();  // use translation function

  return (
    <div className="HomePage">
      <HomeHeader />
      <div
        className="Content"
        style={{
          textAlign: "center",
          backgroundColor: theme.primaryColor,
          padding: "15px 30px",
          color: "white",
        }}
      >
        <h1>{t("homepage.content_heading")}</h1>
        <p style={{ fontSize: "1.25rem" }}>
          {t("homepage.content")}
        </p>
      </div>
      <div
        className="Quick-Start_Content"
        style={{
          textAlign: "left",
          backgroundColor: theme.secondaryColor,
          padding: "80px 80px",
          color: "black",
        }}
      >
        <h3 style={{ marginBottom: "0px" }}>{t("homepage.quick_start_heading")}</h3>
        <p style={{ fontSize: "1rem", fontWeight: "500", marginTop: "0px" }}>
          {t("homepage.step_1")}
          <a
            href="https://agrifooddatacanada.ca/"
            target="_blank"
            rel="noreferrer"
            style={{
              color: theme.primaryColor,
              textDecoration: "underline",
              textUnderlineOffset: "2px",
              textDecorationColor: theme.underlineColor,
              cursor: "pointer",
              "&:hover": {
                textDecorationColor: theme.primaryColor,
              },
            }}
          >
            {t("homepage.watch_tutorial_video")}
          </a>
          {t("homepage.or")}
          <a
            href="https://agrifooddatacanada.ca/"
            target="_blank"
            rel="noreferrer"
            style={{
              color: theme.primaryColor,
              textDecoration: "underline",
              textUnderlineOffset: "2px",
              textDecorationColor: theme.underlineColor,
              cursor: "pointer",
              "&:hover": {
                textDecorationColor: theme.primaryColor,
              },
            }}
          >
            {t("homepage.read_the_tutorial")}
          </a>
          {t("homepage.instead")}
          <br />
          {t("homepage.step_2")}
          <br />
          {t("homepage.step_3")}
          <br />
          {t("homepage.step_4")}
        </p>
      </div>
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
          height={"425px"}
          alignItems="center"
          style={{
            textAlign: "center",
            backgroundColor: theme.secondaryColor,
          }}
        >
          <p style={{ fontSize: "1.5rem", fontWeight: "500" }}>{t("homepage.quick_links")}</p>
          <Box
            component={Link}
            to="/form"
            sx={{
              fontSize: "1.25rem",
              fontWeight: "500",
              color: theme.primaryColor,
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
          <hr
            style={{
              width: "90%",
              border: `1px ${theme.primaryColor} solid`,
              marginTop: "25px",
            }}
          />
          <UploadButton 
            onFileSelect={handleFileSelect}
            upload_file={t("homepage.upload_file")}
          />
          <Box
            sx={{
              width: "90%"
            }}
          >
            {uploadedFiles && <p>{t("homepage.file_uploaded")}{uploadedFiles[0].name}</p>}
          </Box>
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
                '&:hover': {
                  backgroundColor: theme.primaryColor
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
                '&:hover': {
                  backgroundColor: theme.primaryColor
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
      <Footer
        powered_by={t("powered_by")}
        supported_by={t("supported_by")}
      />
    </div>
  );
}

export default HomePage;
