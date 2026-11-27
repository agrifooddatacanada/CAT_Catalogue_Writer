import React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "../../utils/OpenAIRE/TranslationContext";
import SelectLanguage from "../Stateful/LanguageSelector";
import { Stack, Box } from "@mui/system";
import { Button, IconButton, Tooltip, Typography } from "@mui/material";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import HomeIcon from "@mui/icons-material/Home";
import theme from "../../theme";
import { checkIsIframe } from "../../utils/iframeUtils";

function PageHeaders({
  page_heading,
  tooltip_description,
  help_button_redirect,
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isIframeMode = checkIsIframe(searchParams);

  return (
    <header className="Header" style={{ maxWidth: "100%", overflow: "visible" }}>
      <a href="#main-content" className="skip-to-content-link">
        {t("common.skip_to_content")}
      </a>
      <Stack
        direction={isIframeMode ? "row" : { xs: "column", md: "row" }}
        alignItems="center"
        justifyContent="space-between"
        sx={{
          minHeight: isIframeMode ? 52 : { xs: "auto", md: 72 },
          px: { xs: 1.5, sm: 2, md: 3 },
          py: isIframeMode ? 0.5 : { xs: 1, md: 0 },
          color: theme.primaryTextColor,
          gap: { xs: 1, md: 2 },
          maxWidth: "100%",
          boxSizing: "border-box",
          overflow: "visible",
        }}
      >
        {!isIframeMode && (
          <Stack
            direction={"row"}
            alignItems={"center"}
            justifyContent="space-between"
            sx={{
              width: { xs: "100%", md: "auto" },
              flexShrink: 0,
              gap: 1,
            }}
          >
            <Stack
              direction="row"
              alignItems="center"
              sx={{
                flexShrink: 0,
                gap: { xs: 1, sm: 1.5 },
              }}
            >
              <Box
                component="a"
                href="https://www.semanticengine.org/"
                target="_blank"
                rel="noopener noreferrer"
                sx={{
                  display: "flex",
                  alignItems: "center",
                  "& img": {
                    display: "block",
                    width: { xs: 75, sm: 85, md: 95 },
                    height: "auto",
                  },
                }}
              >
                <img
                  src="/assets/images/semantic-engine-logo.png"
                  alt="Semantic Engine Logo"
                />
              </Box>

              <Box
                aria-hidden="true"
                sx={{
                  display: { xs: "none", sm: "block" },
                  width: "1px",
                  height: 36,
                  bgcolor: "rgb(190, 190, 190)",
                }}
              />

              <Box
                component="a"
                href="https://agrifooddatacanada.ca/"
                target="_blank"
                rel="noopener noreferrer"
                sx={{
                  display: "flex",
                  alignItems: "center",
                  "& img": {
                    display: "block",
                    width: { xs: 100, sm: 120, md: 140 },
                    height: "auto",
                  },
                }}
              >
                <img
                  src="/assets/images/agri-logo.png"
                  alt="Agri-Food Data Canada at University of Guelph Logo"
                />
              </Box>
            </Stack>

            <Box
              sx={{
                display: { xs: "block", md: "none" },
                ml: "auto",
                flexShrink: 0,
              }}
            >
              <SelectLanguage
                helperText_color={theme.primaryTextColor}
                select_bgColor="white"
                select_color={theme.primaryTextColor}
                menu_bgColor={theme.secondaryColor}
                menu_color={theme.primaryTextColor}
                selected_item_bgColor={theme.selectedMenuBgColor}
                selected_item_color={theme.selectedMenuTextColor}
              />
            </Box>
          </Stack>
        )}

        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{
            width: isIframeMode ? "100%" : { xs: "100%", md: "auto" },
            flex: 1,
            minWidth: 0,
            gap: 1.5,
          }}
        >
          <Stack
            direction="row"
            alignItems="center"
            sx={{
              minWidth: 0,
              flex: 1,
              overflow: "hidden",
            }}
          >
            <Typography
              component="h1"
              sx={{
                minWidth: 0,
                margin: 0,
                color: theme.primaryTextColor,
                fontSize: { xs: "16px", sm: "18px", md: "22px" },
                fontWeight: 700,
                lineHeight: 1.2,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {page_heading}
            </Typography>

            {tooltip_description && (
              <Tooltip
                title={tooltip_description}
                arrow
                enterTouchDelay={0}
                leaveTouchDelay={3000}
              >
                <IconButton
                  size="small"
                  aria-label={tooltip_description}
                  sx={{
                    flexShrink: 0,
                    ml: 0.5,
                    color: theme.descriptionColor,
                  }}
                >
                  <HelpOutlineIcon sx={{ fontSize: { xs: 16, sm: 18 } }} />
                </IconButton>
              </Tooltip>
            )}
          </Stack>

          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
            sx={{ flexShrink: 0 }}
          >
            {!isIframeMode && (
              <Tooltip title={t("common.home")}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<HomeIcon fontSize="small" />}
                  onClick={() => navigate("/")}
                  sx={{
                    textTransform: "none",
                    fontSize: { xs: "12px", sm: "13px" },
                    fontWeight: 600,
                    color: theme.primaryTextColor,
                    borderColor: theme.borderColor,
                    px: { xs: 1, sm: 1.5 },
                    py: { xs: 0.5, sm: 0.65 },
                    whiteSpace: "nowrap",
                    "&:hover": {
                      borderColor: theme.primaryHoverColor,
                      backgroundColor: theme.hoverUnselectedBgColor,
                    },
                  }}
                >
                  {t("common.home")}
                </Button>
              </Tooltip>
            )}

            {typeof help_button_redirect === "function" && (
              <Button
                variant="contained"
                sx={{
                  flexShrink: 0,
                  minWidth: "auto",
                  px: { xs: 1.5, sm: 2.5, md: 3 },
                  py: { xs: 0.6, sm: 0.8 },
                  fontSize: { xs: "12px", sm: "13px" },
                  backgroundColor: theme.primaryColor,
                  color: theme.primaryContrastText,
                  boxShadow: "none",
                  whiteSpace: "nowrap",
                  textTransform: "none",
                  fontWeight: 600,
                  transition: "background-color 0.15s ease, box-shadow 0.15s ease",
                  "&:hover": {
                    backgroundColor: theme.primaryHoverColor,
                    boxShadow: "0 2px 6px rgba(0, 0, 0, 0.14)",
                  },
                }}
                onClick={() => help_button_redirect()}
              >
                {t("page_help")}
              </Button>
            )}

            <Box
              sx={{
                display: isIframeMode ? "block" : { xs: "none", md: "block" },
                flexShrink: 0,
              }}
            >
              <SelectLanguage
                helperText_color={theme.primaryTextColor}
                select_bgColor="white"
                select_color={theme.primaryTextColor}
                menu_bgColor={theme.secondaryColor}
                menu_color={theme.primaryTextColor}
                selected_item_bgColor={theme.selectedMenuBgColor}
                selected_item_color={theme.selectedMenuTextColor}
              />
            </Box>
          </Stack>
        </Stack>
      </Stack>

      <Box
        component="hr"
        sx={{
          m: 0,
          border: 0,
          borderTop: "1px solid rgba(195, 195, 195, 1)",
        }}
      />
    </header>
  );
}

export default PageHeaders;
