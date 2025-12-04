import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Box } from "@mui/system";
import DynamicForm from "../components/Stateful/DynamicForm";
import { useTranslation } from "../utils/OpenAIRE/TranslationContext";
import Footer from "../components/Stateless/Footer";
import PageHeaders from "../components/Stateless/PageHeaders";

function FormPage() {
  const { t, lang } = useTranslation();  // use translation function

  const location = useLocation();
  const navigate = useNavigate();

  const uploadedJson = location.state?.jsonContent || false;
  const schema = location.state?.schema || "OpenAIRE";

  const handleSave = (formData, isModified) => {
    navigate("/view", { state: { jsonContent: formData, isModified, schema } });
  };

  const [jsonSchema, setJsonSchema] = useState(null);

  useEffect(() => {
    if (!schema) return;

    // Map schema name -> file name
    const fileMap = {
      "OpenAIRE": "./OpenAIRE_OCA_package.json",
      "Dublin Core": "./Trial_Dublin_Core_OCA_package.json",
      "DataCite": "./Trial_DataCite_OCA_package.json"
    };

    const filePath = fileMap[schema] || fileMap.OpenAIRE;

    fetch(filePath)
      .then((res) => res.json())
      .then(setJsonSchema)
      .catch((err) => {
        console.error(`Failed to load schema for ${schema}:`, err);
      });
  }, [schema]);

  if (!jsonSchema) return <div>{t("formpage.loading")}</div>;

  return (
    <div className="FormPage">
      <PageHeaders
        page_heading={ uploadedJson ? t("formpage.edit_header") : t("formpage.write_header") }
        tooltip_description={ uploadedJson ? t("formpage.edit_tooltip") : t("formpage.write_tooltip") }
        help_button_redirect={() => navigate("/form-help", { state: { uploadedJson: uploadedJson } })}
      />

      {/* <pre>{JSON.stringify(fields, null, 2)}</pre> */}
      <Box sx={{ maxWidth: 1000, margin: "auto", padding: 5 }}>
        <DynamicForm 
          jsonData={jsonSchema}
          language={lang}
          initialData={uploadedJson}
          isEditMode={!!uploadedJson} // TRUE when editing existing data
          onSave={handleSave}
        />
      </Box>
      <Footer
        powered_by={t("powered_by")}
        supported_by={t("supported_by")}
      />
    </div>
  );
}

export default FormPage;
