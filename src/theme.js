import { createTheme } from "@mui/material/styles";

/**
 * Brand palette for Catalogue Record Writer:
 * Fresh, warm golden yellow (`#E5B000`) with crisp white text on primary
 * surfaces and warm honey-gold (`#9A6E00`) for text/links on light backgrounds.
 */
const theme = {
  primaryColor: "#E5B000",
  primaryHoverColor: "#CFA000",
  primaryTextColor: "#9A6E00",
  primaryContrastText: "#FFFFFF",
  secondaryColor: "#FFF9E5",
  backgroundColor: "#FFFFFF",
  borderColor: "#E5B000",
  hoverUnselectedBgColor: "rgba(229, 176, 0, 0.14)",
  selectedMenuBgColor: "#F9ECC2",
  selectedMenuTextColor: "#7A5600",
  descriptionColor: "#595959",
  underlineColor: "rgba(154, 110, 0, 0.45)",
  linearGradient:
    "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,1) 24%)",
};

export const muiTheme = createTheme({
  palette: {
    primary: {
      main: theme.primaryColor,
      dark: theme.primaryHoverColor,
      light: theme.secondaryColor,
      contrastText: theme.primaryContrastText,
    },
    text: {
      primary: "#1C1917",
      secondary: theme.descriptionColor,
    },
    background: {
      default: theme.backgroundColor,
      paper: theme.backgroundColor,
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
  components: {
    MuiButton: {
      styleOverrides: {
        containedPrimary: {
          backgroundColor: theme.primaryColor,
          color: theme.primaryContrastText,
          fontWeight: 600,
          "&:hover": {
            backgroundColor: theme.primaryHoverColor,
          },
        },
        outlinedPrimary: {
          color: theme.primaryTextColor,
          borderColor: theme.borderColor,
          fontWeight: 600,
          "&:hover": {
            borderColor: theme.primaryHoverColor,
            backgroundColor: theme.hoverUnselectedBgColor,
          },
        },
      },
    },
  },
});

export default theme;
