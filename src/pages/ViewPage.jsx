import React, { useState, useEffect } from "react";
import { Box } from "@mui/system";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@mui/material";
import { useTranslation } from "../utils/OpenAIRE/TranslationContext";
import Footer from "../components/Stateless/Footer";
import DynamicForm from "../components/Stateful/DynamicForm";
import EditIcon from "@mui/icons-material/Edit";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import PageHeaders from "../components/Stateless/PageHeaders";
import { saidify } from "saidify";
import theme from "../theme";

function ViewPage() {
  const { t, lang } = useTranslation(); // use translation function
  const location = useLocation();
  const navigate = useNavigate();

  const uploadedJson = location.state?.jsonContent || null;
  const isModified = location.state?.isModified || false;
  const schema = location.state?.schema || "OpenAIRE"; // Get schema from navigation state

  const [jsonSchema, setJsonSchema] = useState(null);

  const downloadJson = (jsonData) => {
    const [, objWithSaid] = saidify(jsonData, "catalogue_id");
    const content = JSON.stringify(objWithSaid);
    const blob = new Blob([content], { type: "application/ld+json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `catalogue-${objWithSaid.catalogue_id || "export"}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // LOAD FORM SCHEMA JSON BASED ON SCHEMA
  useEffect(() => {
    // Map schema name -> file name
    const fileMap = {
      OpenAIRE: "./OpenAIRE_OCA_package.json",
      "Dublin Core (Repository) [Test]":
        "./Dublin_Core_Repository_OCA_package.json",
      "DataCite [Test]": "./Trial_DataCite_OCA_package.json",
    };

    const filePath = fileMap[schema] || fileMap.OpenAIRE;

    fetch(filePath)
      .then((res) => res.json())
      .then(setJsonSchema)
      .catch((err) => {
        console.error(`Failed to load schema for ${schema}:`, err);
      });
  }, [schema]);

  if (!jsonSchema) {
    return <div>{t("viewpage.loading")}</div>;
  }

  if (!uploadedJson) {
    return <p>{t("viewpage.no_catalogue")}</p>;
  }

  const handleEditClick = () => {
    // Pass schema back to form so it loads correct OCA package
    navigate("/form", {
      state: {
        jsonContent: uploadedJson,
        schema: schema,
      },
    });
  };

  return (
    <div className="ViewPage">
      <PageHeaders
        page_heading={isModified ? t("viewpage.review") : t("viewpage.view")}
        tooltip_description={
          isModified ? t("viewpage.review_tooltip") : t("viewpage.view_tooltip")
        }
        help_button_redirect={() =>
          navigate("/view-help", { state: { isModified: isModified } })
        }
      />

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
          sx={{
            backgroundColor: theme.primaryColor,
            "&:hover": {
              backgroundColor: theme.primaryColor,
            },
            mt: "2px",
            mr: "10px",
          }}
          onClick={handleEditClick}
          startIcon={<EditIcon />}
        >
          {t("viewpage.edit")}
        </Button>
        <Button
          variant="contained"
          type="submit"
          disabled={!isModified}
          sx={{
            backgroundColor: theme.primaryColor,
            "&:hover": {
              backgroundColor: theme.primaryColor,
            },
            mt: "2px",
            mr: "10px",
          }}
          onClick={() => downloadJson(uploadedJson)}
          startIcon={<FileDownloadIcon />}
        >
          {t("viewpage.download")}
        </Button>
      </Box>
      <Footer powered_by={t("powered_by")} supported_by={t("supported_by")} />
    </div>
  );
}

export default ViewPage;
