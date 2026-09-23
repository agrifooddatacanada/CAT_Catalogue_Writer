import React from "react";
import { useTranslation } from "../../utils/OpenAIRE/TranslationContext";
import SelectLanguage from "../Stateful/LanguageSelector";
import { Stack, Box } from "@mui/system";
import { Button, Tooltip, Typography } from "@mui/material";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import theme from "../../theme";

function PageHeaders({
  page_heading,
  tooltip_description,
  help_button_redirect,
}) {
  const { t } = useTranslation(); // use translation function

  return (
    <div className="Header" style={{ maxWidth: "100%", overflowX: "hidden" }}>
      <Stack
        direction={{ xs: "column", md: "row" }}
        alignItems={{ xs: "stretch", md: "center" }}
        justifyContent="space-between"
        sx={{
          minHeight: { xs: "auto", md: 72 },
          px: { xs: 1.5, sm: 2, md: 3 },
          py: { xs: 1, md: 0 },
          color: theme.primaryColor,
          gap: { xs: 1, md: 2 },
          maxWidth: "100%",
          boxSizing: "border-box",
        }}
      >
        {/* Left side for desktops OR 1st row for mobile/tablet/iframe */}
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
          {/* Logos */}
          <Stack
            direction="row"
            alignItems="center"
            sx={{
              flexShrink: 0,
              gap: { xs: 1, sm: 1.5 },
            }}
          >
            {/* Semantic Engine Logo */}
            <Box
              component="a"
              href="https://www.semanticengine.org/"
              target="_blank"
              rel="noreferrer"
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

            {/* Logo Divider */}
            <Box
              sx={{
                display: { xs: "none", sm: "block" },
                width: "1px",
                height: 36,
                bgcolor: "rgb(190, 190, 190)",
              }}
            />

            {/* Agri-Food Data Canada Logo */}
            <Box
              component="a"
              href="https://agrifooddatacanada.ca/"
              target="_blank"
              rel="noreferrer"
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
                alt="Agri-Food Data Canada at UoG White Logo"
              />
            </Box>
          </Stack>

          {/* Language Selector for mobile/compact screens */}
          <Box
            sx={{
              display: { xs: "block", md: "none" },
              ml: "auto",
              flexShrink: 0,
            }}
          >
            <SelectLanguage
              helperText_color={theme.primaryColor}
              select_bgColor="white"
              select_color={theme.primaryColor}
              menu_bgColor="rgba(235, 235, 235, 0.95)"
              menu_color={theme.primaryColor}
              selected_item_bgColor="rgba(215, 215, 215, 1)"
              selected_item_color="rgba(175, 175, 175, 1)"
            />
          </Box>
        </Stack>

        {/* 2nd row for mobile/compact OR right side for desktop */}
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{
            width: { xs: "100%", md: "auto" },
            flex: { xs: "none", md: 1 },
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
            {/* Page title */}
            <Typography
              component="h1"
              sx={{
                minWidth: 0,
                margin: 0,
                color: theme.primaryColor,
                fontSize: { xs: "16px", sm: "20px", md: "23px" },
                fontWeight: 700,
                lineHeight: 1.2,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {page_heading}
            </Typography>

            {/* Tooltip */}
            {tooltip_description && (
              <Tooltip
                title={tooltip_description}
                arrow
                enterTouchDelay={0}
                leaveTouchDelay={3000}
              >
                <HelpOutlineIcon
                  sx={{
                    flexShrink: 0,
                    ml: 1,
                    fontSize: { xs: 16, sm: 18 },
                    color: "rgba(120,120,120,1)",
                    cursor: "help",
                  }}
                />
              </Tooltip>
            )}
          </Stack>

          {/* Right Controls: Help Button & Desktop Language Selector */}
          <Stack
            direction="row"
            alignItems="center"
            spacing={1.5}
            sx={{ flexShrink: 0 }}
          >
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
                  color: "white",
                  boxShadow: "none",
                  whiteSpace: "nowrap",
                  textTransform: "none",
                  fontWeight: 600,
                  "&:hover": {
                    backgroundColor: theme.primaryColor,
                    boxShadow: "none",
                  },
                }}
                onClick={() => help_button_redirect()}
              >
                {t("page_help")}
              </Button>
            )}

            {/* Language selector for desktops */}
            <Box sx={{ display: { xs: "none", md: "block" }, flexShrink: 0 }}>
              <SelectLanguage
                helperText_color={theme.primaryColor}
                select_bgColor="white"
                select_color={theme.primaryColor}
                menu_bgColor="rgba(235, 235, 235, 0.95)"
                menu_color={theme.primaryColor}
                selected_item_bgColor="rgba(215, 215, 215, 1)"
                selected_item_color="rgba(175, 175, 175, 1)"
              />
            </Box>
          </Stack>
        </Stack>
      </Stack>

      {/* Header Divider */}
      <Box
        component="hr"
        sx={{
          m: 0,
          border: 0,
          borderTop: "1px solid rgba(195, 195, 195, 1)",
        }}
      />
    </div>
  );
}

export default PageHeaders;
