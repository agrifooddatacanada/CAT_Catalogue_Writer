import React from "react";
import { Box } from "@mui/system";
import { useTranslation } from "../utils/OpenAIRE/TranslationContext";
import Footer from "../components/Stateless/Footer";
import PageHeaders from "../components/Stateless/PageHeaders";
import { useSelector } from "react-redux";
import { selectHasFormData } from "../store/selectors/formSelectors";

function ViewHelpPage() {
  const { t } = useTranslation(); // use translation function

  const isUploadedJson = useSelector(selectHasFormData);

  return (
    <div className="FormHelpPage">
      <PageHeaders
        page_heading={
          isUploadedJson ? t("formhelppage.edit") : t("formhelppage.write")
        }
      />

      <Box sx={{ maxWidth: 1000, margin: "auto", padding: 5 }}>
        {t("formhelppage.under_development")}
      </Box>
      <Footer powered_by={t("powered_by")} supported_by={t("supported_by")} />
    </div>
  );
}

export default ViewHelpPage;
