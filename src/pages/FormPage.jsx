import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Stack, Box } from "@mui/system";
import { Button } from "@mui/material";
import DynamicForm from "../components/Stateful/DynamicForm";
import SelectLanguage from "../components/Stateful/LanguageSelector";
import { useTranslation } from "../utils/OpenAIRE/TranslationContext";
import Footer from "../components/Stateless/Footer";

function FormPage() {
  const { t, lang } = useTranslation();  // use translation function

  const location = useLocation();
  const navigate = useNavigate();

  const uploadedJson = location.state?.jsonContent || null;

  const handleSave = (formData, isModified) => {
    navigate("/view", { state: { jsonContent: formData, isModified: isModified } });
  };

  const [jsonSchema, setJsonSchema] = useState(null);

  useEffect(() => {
    console.log("FormPage jsonSchema:", jsonSchema);
  }, [jsonSchema]);


  useEffect(() => {
    fetch("./OpenAIRE_OCA_package.json")
      .then((res) => res.json())
      .then(setJsonSchema)
      .catch((err) => console.error(err));
  }, []);

  if (!jsonSchema) return <div>Loading...</div>;

  return (
    <div className="FormPage">
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
              { uploadedJson ? t("formpage.edit_header") : t("formpage.write_header") }
            </p>
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
      </div>
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
