import React, { useState, useEffect } from "react";
import { Stack, Box } from "@mui/system";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Tooltip,
  Button
} from "@mui/material";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import { useTranslation } from "../utils/OpenAIRE/TranslationContext";
import Footer from "../components/Stateless/Footer";
import SelectLanguage from "../components/Stateful/LanguageSelector";
import DynamicForm from "../components/Stateful/DynamicForm"
import EditIcon from '@mui/icons-material/Edit';
import FileDownloadIcon from '@mui/icons-material/FileDownload';

function ViewPage() {
  const { t, lang } = useTranslation();  // use translation function

  const location = useLocation();
  const navigate = useNavigate();
  
  const uploadedJson = location.state?.jsonContent || null;
  const isModified = location.state?.isModified || false;

   const [jsonSchema, setJsonSchema] = useState(null);

  const downloadJson = (jsonData) => {
    const jsonLdString = JSON.stringify(jsonData, null, 2);
    const blob = new Blob([jsonLdString], { type: 'application/ld+json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `catalogue-${jsonData.catalogue_id || 'export'}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // LOAD FORM SCHEMA JSON ONCE
  useEffect(() => {
    fetch("./OpenAIRE_OCA_package.json")
      .then((res) => res.json())
      .then(setJsonSchema)
      .catch((err) => console.error(err));
  }, []);

  if (!jsonSchema) {
    return <div>{t("viewpage.loading")}</div>;
  }

  if (!uploadedJson) {
    return <p>{t("viewpage.no_catalogue")}</p>;
  }

  return (
    <div className="ViewPage">
      <div className="Header">
        <Stack
          direction={"row"}
          spacing={2}
          alignItems="center"
          justifyContent={{ xs: "space-around", sm: "space-between" }}
          sx={{
            padding: { sm: "0px 16px", md: "0px 32px" },
            //backgroundColor: "rgba(70, 160, 35, 1)",
            color: "rgba(70, 160, 35, 1)",
          }}
        >
          <Stack direction={"row"} alignItems={"center"}>
            <Box
              component="a"
              href="https://agrifooddatacanada.ca/"
              target="_blank"
              rel="noreferrer"
              sx={{
                marginLeft: "0px !important",
                "& img": {
                  maxWidth: "100px",
                },
              }}
            >
              <img
                src="/assets/images/semantic-engine-logo.png"
                alt="Agri-Food Data Canada at UoG White Logo"
              />
            </Box>
            <div
              style={{
                width: "1px",
                height: "40px",
                backgroundColor: "rgb(163, 163, 163)",
                margin: "0px 10px",
              }}
            />
            <Box
              component="a"
              href="https://agrifooddatacanada.ca/"
              target="_blank"
              rel="noreferrer"
              sx={{
                marginRight: "20px !important",
                display: "block",
                "& img": {
                  width: {
                    xs: "100px",
                    sm: "150px",
                  },
                  maxWidth: "150px",
                },
              }}
            >
              <img
                src="/assets/images/agri-logo.png"
                alt="Agri-Food Data Canada at UoG White Logo"
              />
            </Box>
            <p
              style={{
                color: "rgba(70, 160, 35, 1)",
                fontSize: "25px",
                fontWeight: "700",
                margin: "0px",
              }}
            >
              {isModified ? t("viewpage.review"): t("viewpage.view")}
            </p>
            <Tooltip
              title="You can view your catalogue record in a human-readable form on this page."
              arrow
            >
              <HelpOutlineIcon
                sx={{
                  marginLeft: "15px",
                  fontSize: "15px",
                  color: "rgba(120,120,120,1)",
                }}
              />
            </Tooltip>
          </Stack>
          <Button
            variant="contained"
            //onClick={handleViewClick}
            sx={{
              display: "inline-block",
              marginTop: "16px !important",
              marginBottom: "16px !important",
              marginRight: "16px !important",
              marginLeft: "0px !important",
              padding: "8px 40px",
              backgroundColor: "rgba(70, 160, 35, 1)",
              color: "white",
              boxShadow: "none",
              cursor: "pointer",
            }}
          >
            {t("page_help")}
          </Button>
          <Box>
            <SelectLanguage
              helperText_color="rgba(70, 160, 35, 1)"
              select_bgColor="white"
              select_color="rgba(70, 160, 35, 1)"
              menu_bgColor="rgba(235, 235, 235, 0.95)"
              menu_color="rgba(70, 160, 35, 1)"
              selected_item_bgColor="rgba(215, 215, 215, 1)"
              selected_item_color="rgba(175, 175, 175, 1)"
            />
          </Box>
        </Stack>
        <hr
          style={{
            margin: "0px",
            maxWidth: "100%",
            borderTop: "1px rgba(195, 195, 195, 1) solid",
          }}
        />
        {/* <div style={{ padding: "20px" }}>
          <pre style={{ whiteSpace: "pre-wrap", wordWrap: "break-word" }}>
            {JSON.stringify(jsonContent, null, 2)}
          </pre>
        </div> */}
      </div>

      <Box sx={{ maxWidth: 1000, margin: "auto", padding: 5 }}>
        <DynamicForm 
          jsonData={jsonSchema}
          language={lang}
          initialData={uploadedJson}
          readOnly={true} // Prop for view mode
        />

        <Button 
          variant="contained"
          type="submit"
          sx={{ backgroundColor: "rgba(70, 160, 35, 1)", mt: "2px", mr: "10px" }}
          onClick={() => navigate("/form", { state: { jsonContent: uploadedJson } })}
          startIcon={<EditIcon />}
        >
          {t("viewpage.edit")}
        </Button>
        <Button 
          variant="contained"
          type="submit"
          disabled={!isModified}
          sx={{ backgroundColor: "rgba(70, 160, 35, 1)", mt: "2px", ml: "10px" }}
          onClick={() => downloadJson(uploadedJson)}
          startIcon={<FileDownloadIcon />}
        >
          {t("viewpage.download")}
        </Button>
      </Box>
      <Footer
        powered_by={t("powered_by")}
        supported_by={t("supported_by")}
      />
    </div>
  );
}

export default ViewPage;
