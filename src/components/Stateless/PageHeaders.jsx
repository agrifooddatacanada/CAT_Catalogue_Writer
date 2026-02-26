import React from "react";
import { useTranslation } from "../../utils/OpenAIRE/TranslationContext";
import SelectLanguage from "../Stateful/LanguageSelector";
import { Stack, Box } from "@mui/system";
import { Tooltip, Button } from "@mui/material";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import { useNavigate } from "react-router-dom";
import theme from "../../theme";

function PageHeaders({
  page_heading,
  tooltip_description,
  help_button_redirect,
}) {
  const { t } = useTranslation(); // use translation function

  const navigate = useNavigate();

  return (
    <div className="Header">
      <Stack
        direction={"row"}
        spacing={2}
        alignItems="center"
        justifyContent={{ xs: "space-around", sm: "space-between" }}
        sx={{
          padding: { sm: "0px 16px", md: "0px 32px" },
          color: theme.primaryColor,
        }}
      >
        <Stack direction={"row"} alignItems={"center"}>
          <Box
            component="a"
            href="/"
            sx={{
              cursor: "pointer",
              marginLeft: "0px !important",
              "& img": {
                maxWidth: "100px",
              },
            }}
          >
            <img
              src="/assets/images/semantic-engine-logo.png"
              alt="Semantic Engine Logo"
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
              color: theme.primaryColor,
              fontSize: "25px",
              fontWeight: "700",
              margin: "0px",
            }}
          >
            {page_heading}
          </p>
          {tooltip_description && (
            <Tooltip title={tooltip_description} arrow>
              <HelpOutlineIcon
                sx={{
                  marginLeft: "15px",
                  marginRight: "15px",
                  fontSize: "15px",
                  color: "rgba(120,120,120,1)",
                }}
              />
            </Tooltip>
          )}
        </Stack>
        {typeof help_button_redirect === "function" && (
          <Button
            variant="contained"
            sx={{
              display: "inline-block",
              margin: "16px !important",
              padding: "8px 40px",
              backgroundColor: theme.primaryColor,
              "&:hover": {
                backgroundColor: theme.primaryColor,
              },
              color: "white",
              boxShadow: "none",
              cursor: "pointer",
            }}
            onClick={() => help_button_redirect()}
          >
            {t("page_help")}
          </Button>
        )}
        <Box>
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
      <hr
        style={{
          margin: "0px",
          maxWidth: "100%",
          borderTop: "1px rgba(195, 195, 195, 1) solid",
        }}
      />
    </div>
  );
}

export default PageHeaders;
