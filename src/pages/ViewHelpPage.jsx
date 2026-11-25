import React from "react";
import { useNavigate } from "react-router-dom";
import { Box } from "@mui/system";
import { Button, Paper, Stack, Typography } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useTranslation } from "../utils/OpenAIRE/TranslationContext";
import Footer from "../components/Stateless/Footer";
import PageHeaders from "../components/Stateless/PageHeaders";
import { useSelector } from "react-redux";
import { selectHasFormData } from "../store/selectors/formSelectors";
import theme from "../theme";

function ViewHelpPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isUploadedJson = useSelector(selectHasFormData);

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/");
    }
  };

  return (
    <div className="ViewHelpPage">
      <PageHeaders
        page_heading={
          !isUploadedJson ? t("viewhelppage.review") : t("viewhelppage.view")
        }
      />

      <Box
        component="main"
        id="main-content"
        sx={{ maxWidth: 900, margin: "auto", padding: { xs: 2.5, sm: 4, md: 5 } }}
      >
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={handleBack}
          sx={{
            mb: 3,
            color: theme.primaryColor,
            borderColor: theme.primaryColor,
            "&:hover": {
              borderColor: theme.primaryColor,
              backgroundColor: theme.hoverUnselectedBgColor,
            },
          }}
        >
          {t("viewhelppage.back_button")}
        </Button>

        <Typography variant="body1" sx={{ mb: 3 }}>
          {t("viewhelppage.intro")}
        </Typography>

        <Stack spacing={2.5}>
          {[
            { title: t("viewhelppage.step1_title"), body: t("viewhelppage.step1_body") },
            { title: t("viewhelppage.step2_title"), body: t("viewhelppage.step2_body") },
            { title: t("viewhelppage.step3_title"), body: t("viewhelppage.step3_body") },
          ].map((section) => (
            <Paper
              key={section.title}
              variant="outlined"
              sx={{ p: 2.5, borderRadius: 2 }}
            >
              <Typography variant="h6" component="h2" gutterBottom sx={{ fontSize: "1.05rem", fontWeight: 600 }}>
                {section.title}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {section.body}
              </Typography>
            </Paper>
          ))}
        </Stack>
      </Box>
      <Footer powered_by={t("powered_by")} supported_by={t("supported_by")} />
    </div>
  );
}

export default ViewHelpPage;
