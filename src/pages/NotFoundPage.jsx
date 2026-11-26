import React from "react";
import { useNavigate } from "react-router-dom";
import { Box, Button, Paper, Typography } from "@mui/material";
import HomeIcon from "@mui/icons-material/Home";
import { useTranslation } from "../utils/OpenAIRE/TranslationContext";
import PageHeaders from "../components/Stateless/PageHeaders";
import Footer from "../components/Stateless/Footer";
import theme from "../theme";

function NotFoundPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="NotFoundPage">
      <PageHeaders page_heading={t("common.not_found_title")} />
      <Box
        component="main"
        id="main-content"
        sx={{
          minHeight: "55vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          p: 3,
        }}
      >
        <Paper
          elevation={2}
          sx={{ maxWidth: 480, width: "100%", p: 4, textAlign: "center", borderRadius: 2 }}
        >
          <Typography variant="h4" component="h2" gutterBottom sx={{ fontWeight: 700 }}>
            404
          </Typography>
          <Typography variant="h6" gutterBottom>
            {t("common.not_found_title")}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {t("common.not_found_body")}
          </Typography>
          <Button
            variant="contained"
            startIcon={<HomeIcon />}
            onClick={() => navigate("/")}
            sx={{
              backgroundColor: theme.primaryColor,
              color: theme.primaryContrastText,
              fontWeight: 600,
              "&:hover": {
                backgroundColor: theme.primaryHoverColor,
              },
            }}
          >
            {t("common.return_home")}
          </Button>
        </Paper>
      </Box>
      <Footer powered_by={t("powered_by")} supported_by={t("supported_by")} />
    </div>
  );
}

export default NotFoundPage;
