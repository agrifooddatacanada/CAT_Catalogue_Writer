import React from "react";
import { Box } from "@mui/system";
import { useLocation } from "react-router-dom";
import { useTranslation } from "../utils/OpenAIRE/TranslationContext";
import Footer from "../components/Stateless/Footer";
import PageHeaders from "../components/Stateless/PageHeaders";

function ViewHelpPage() {
    const { t } = useTranslation();  // use translation function

    const location = useLocation();

    const uploadedJson = location.state?.uploadedJson || null;
    console.log("uploadedJson: ", uploadedJson);

    return (
        <div className="FormHelpPage">
            <PageHeaders
                page_heading={ uploadedJson ? t("formhelppage.edit"): t("formhelppage.write") }
            />

            <Box sx={{ maxWidth: 1000, margin: "auto", padding: 5 }}>
                {t("formhelppage.under_development")}
            </Box>
            <Footer
                powered_by={t("powered_by")}
                supported_by={t("supported_by")}
            />
        </div>
    );
}

export default ViewHelpPage;