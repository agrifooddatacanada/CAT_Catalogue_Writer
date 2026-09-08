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
    <div className="Header">
      <Stack
        direction={{ xs: "column", sm: "row" }}
        alignItems={{ xs: "stretch", sm: "center" }}
        justifyContent="space-between"
        sx={{
          minHeight: { xs: "auto", sm: 72 },
          px: { xs: 1.5, sm: 2, md: 4 },
          py: { xs: 1, sm: 0 },
          color: theme.primaryColor,
          gap: { xs: 1, sm: 2 },
        }}
      >
        {/* Left side for desktops OR 1st row for mobile phones */}
        <Stack
          direction={"row"}
          alignItems={"center"}
          justifyContent="space-between"
          sx={{
            width: "100%",
            "@media (min-width: 600px)": {
              width: "auto",
            },
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
                width: { xs: 75, sm: 90, md: 100 },
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
              height: 40,
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
                width: { xs: 100, sm: 125, md: 150 },
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

        {/* Language Selector for mobile phones */}
        <Box
          sx={{
            display: { xs: "block", sm: "none" },
            ml: "auto",
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

      {/* 2nd row for mobile phones */}
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{
          width: "100%",
          gap: 1,
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          sx={{
            minWidth: 0,
            flex: 1,
          }}
        >
          {/* Page title */}
          <Typography
            component="h1"
            sx={{
              minWidth: 0,
              margin: 0,
              color: theme.primaryColor,
              fontSize: { xs: "18px", sm: "22px", md: "25px" },
              fontWeight: 700,
              lineHeight: 1.2,
              whiteSpace: { xs: "normal", sm: "nowrap" },
              overflow: { xs: "visible", sm: "hidden" },
              textOverflow: { xs: "clip", sm: "ellipsis" },
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

        {/* Right Side for desktops */}
        {typeof help_button_redirect === "function" && (
          <Button
            variant="contained"
            sx={{
              flexShrink: 0,
              minWidth: "auto",
              px: { xs: 1.5, sm: 3, md: 4 },
              py: { xs: 0.75, sm: 1 },
              fontSize: { xs: "12px", sm: "14px" },
              backgroundColor: theme.primaryColor,
              color: "white",
              boxShadow: "none",
              whiteSpace: "nowrap",
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
        <Box sx={{ display: { xs: "none", sm: "block" } }}>
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
