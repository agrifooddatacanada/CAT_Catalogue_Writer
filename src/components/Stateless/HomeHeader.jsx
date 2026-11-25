import React from "react";
import { useSearchParams } from "react-router-dom";
import { Stack, Box } from "@mui/system";
import SelectLanguage from "../Stateful/LanguageSelector";
import theme from "../../theme";
import { checkIsIframe } from "../../utils/iframeUtils";
import { useTranslation } from "../../utils/OpenAIRE/TranslationContext";

function HomeHeader({ semantic_engine, catalogue }) {
  const [searchParams] = useSearchParams();
  const isIframeMode = checkIsIframe(searchParams);
  const { t } = useTranslation();

  return (
    <header className="Header">
      <a href="#main-content" className="skip-to-content-link">
        {t("common.skip_to_content")}
      </a>
      <Stack
        direction={"row"}
        spacing={2}
        alignItems="center"
        justifyContent={{ xs: "space-around", sm: "space-between" }}
        sx={{
          padding: { xs: "8px 12px", sm: "6px 16px", md: "6px 32px" },
          backgroundColor: theme.primaryColor,
          color: "white",
        }}
      >
        <Box>
          <Box
            component="div"
            sx={{
              fontSize: { xs: "18px", sm: "29px", md: "40px" },
              lineHeight: "0.85",
              fontWeight: "700",
            }}
          >
            {semantic_engine}
          </Box>
          <Box
            component="div"
            sx={{
              marginTop: { xs: "2px", sm: "3px" },
              fontSize: { xs: "14px", sm: "18px", md: "22px" },
            }}
          >
            {catalogue}
          </Box>
        </Box>
        <Stack direction={"row"} spacing={2} alignItems="center">
          <Box>
            <SelectLanguage
              helperText_color="white"
              select_bgColor={theme.primaryColor}
              select_color="white"
              menu_bgColor={theme.primaryColor}
              menu_color="white"
              selected_item_bgColor="rgba(255, 255, 255, 0.25)"
              selected_item_color="rgba(225, 225, 225, 1)"
            />
          </Box>
          {!isIframeMode && (
            <Box
              component="a"
              href="https://agrifooddatacanada.ca/"
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                marginLeft: "0px !important",
                display: "inline-block",
                "& img": {
                  marginRight: {
                    sm: "0px",
                    md: "20px",
                  },
                  width: {
                    md: "250px",
                  },
                  maxHeight: {
                    xs: "70px",
                    sm: "70px",
                    md: "100px",
                  },
                },
              }}
            >
              <img
                src="/assets/images/agri-logo-white.png"
                alt="Agri-Food Data Canada at University of Guelph White Logo"
              />
            </Box>
          )}
        </Stack>
      </Stack>
    </header>
  );
}

export default HomeHeader;
