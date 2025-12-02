import { Stack, Box } from "@mui/system";
import { useTranslation } from "../../utils/OpenAIRE/TranslationContext";
import SelectLanguage from "../Stateful/LanguageSelector";
import theme from "../../theme";

function HomeHeader() {

  const { t } = useTranslation();  // use translation function

  return (
      <div className="Header">
        <Stack
          direction={"row"}
          spacing={2}
          alignItems="center"
          justifyContent={{ xs: "space-around", sm: "space-between" }}
          sx={{
            padding: { sm: "0px 16px", md: "0px 32px" },
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
              {t("homepage.semantic_engine")}
            </Box>
            <Box
              component="div"
              sx={{
                marginTop: { xs: "0px", sm: "3px" },
                fontSize: { xs: "14px", sm: "18px", md: "22px" },
              }}
            >
              {t("homepage.catalogue")}
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
            <Box
              component="a"
              href="https://agrifooddatacanada.ca/"
              target="_blank"
              rel="noreferrer"
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
                alt="Agri-Food Data Canada at UoG White Logo"
              />
            </Box>
          </Stack>
        </Stack>
      </div>
  );
}

export default HomeHeader;
