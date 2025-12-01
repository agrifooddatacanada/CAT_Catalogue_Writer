import React, { useState, useEffect } from "react";
import { Box } from "@mui/system";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@mui/material";
import { useTranslation } from "../utils/OpenAIRE/TranslationContext";
import Footer from "../components/Stateless/Footer";
import DynamicForm from "../components/Stateful/DynamicForm"
import EditIcon from '@mui/icons-material/Edit';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import PageHeaders from "../components/Stateless/PageHeaders";
// import canonicalize from "../utils/canonicalize";
import { 
  saidify,
  //verify
 } from 'saidify'
 import theme from "../theme";

function ViewPage() {
  const { t, lang } = useTranslation();  // use translation function

  const location = useLocation();
  const navigate = useNavigate();
  
  const uploadedJson = location.state?.jsonContent || null;
  const isModified = location.state?.isModified || false;

  const [jsonSchema, setJsonSchema] = useState(null);

  const downloadJson = (jsonData) => {
    console.log(jsonData);
    const [ , objWithSaid] = saidify(jsonData, 'catalogue_id');

    // console.log(typeof objWithSaid);
    // const computedSAID = 'ENvDUtgMxBzjgINNzJTfaMLRNumaVchQT83fyTjZIy4y'
    // const doesVerify = verify(objWithSaid, computedSAID, label)
    // console.log(doesVerify);

    // objWithSaid should be a string or object; if it’s a string, use it directly; if it’s an object, stringify it
    // const content = typeof objWithSaid === 'string' ? objWithSaid : JSON.stringify(objWithSaid, null, 2);

    const content = JSON.stringify(objWithSaid, null, 2);

    const blob = new Blob([content], { type: 'application/ld+json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `catalogue-${objWithSaid.catalogue_id || 'export'}.json`;
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
      <PageHeaders
        page_heading={ isModified ? t("viewpage.review"): t("viewpage.view") }
        tooltip_description={ isModified ? t("viewpage.review_tooltip") : t("viewpage.view_tooltip") }
        help_button_redirect={() => navigate("/view-help", { state: { isModified: isModified } })}
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
            mr: "10px"
          }}
          onClick={() => navigate("/form", { state: { jsonContent: uploadedJson } })}
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
            mr: "10px"
          }}
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
