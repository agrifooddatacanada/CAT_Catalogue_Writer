import * as React from "react";
import { MenuItem, FormControl, Select, FormHelperText } from "@mui/material";
import { useTranslation } from "../../utils/OpenAIRE/TranslationContext"; // Adjust path to your context

export default function SelectLanguage({
  helperText_color,
  select_bgColor,
  select_color,
  menu_bgColor,
  menu_color,
  selected_item_bgColor,
  selected_item_color
}) {
  const translationContext = useTranslation();

  if (!translationContext) {
    // context is not provided
    return null; // or fallback UI
  }

  const { lang, setLang } = translationContext;

  const handleChange = (e) => {
    setLang(e.target.value.toLowerCase());
  };

  return (
    <div>
      <FormControl sx={{ maxWidth: 90 }}>
        <FormHelperText
          sx={{
            color: helperText_color,
            fontSize: { xs: "7.5px", sm: "8.25px", lg: "9px" },
            lineHeight: 1.2,
          }}
        >
          {lang === "eng" ? "Sélectionnez le Français ici" : "Select English here"}
        </FormHelperText>
        <Select
          value={lang}
          onChange={handleChange}
          displayEmpty
          sx={{
            "& .MuiOutlinedInput-notchedOutline": {
              border: "none",
            },
            backgroundColor: select_bgColor,
            "& .MuiSelect-select": {
              color: select_color,
            },
            fontSize: { xs: "18px", sm: "21px", md: "24px" },
            height: "25px",
            marginTop: "2px",
          }}
          MenuProps={{
            PaperProps: {
              sx: {
                backgroundColor: menu_bgColor,
                color: menu_color,
              },
            },
          }}
        >
          <MenuItem
            value="eng"
            sx={{
              "&.Mui-selected": {
                backgroundColor: selected_item_bgColor,
                color: selected_item_color,
              },
              "&:hover": {
                backgroundColor: "rgba(255, 255, 255, 0.5)",
              },
            }}
          >
            EN
          </MenuItem>
          <MenuItem
            value="fra"
            sx={{
              "&.Mui-selected": {
                backgroundColor: selected_item_bgColor,
                color: selected_item_color,
              },
              "&:hover": {
                backgroundColor: "rgba(255, 255, 255, 0.5)",
              },
            }}
          >
            FR
          </MenuItem>
        </Select>
      </FormControl>
    </div>
  );
}
