import React, { useId } from "react";
import { MenuItem, FormControl, Select, FormHelperText } from "@mui/material";
import { useTranslation } from "../../utils/OpenAIRE/TranslationContext";

export default function SelectLanguage({
  helperText_color,
  select_bgColor,
  select_color,
  menu_bgColor,
  menu_color,
  selected_item_bgColor,
  selected_item_color,
}) {
  const selectId = useId();
  const translationContext = useTranslation();

  if (!translationContext) {
    return null;
  }

  const { lang, setLang, t } = translationContext;

  const handleChange = (e) => {
    setLang(e.target.value.toLowerCase());
  };

  return (
    <div>
      <FormControl sx={{ minWidth: 88, maxWidth: 140 }}>
        <FormHelperText
          id={`${selectId}-hint`}
          sx={{
            color: helperText_color,
            fontSize: "12px",
            lineHeight: 1.2,
            m: 0,
            mb: 0.25,
            whiteSpace: "nowrap",
          }}
        >
          {lang === "eng" ? "Français" : "English"}
        </FormHelperText>
        <Select
          id={selectId}
          value={lang}
          onChange={handleChange}
          displayEmpty
          inputProps={{
            "aria-label": t("common.select_language"),
            "aria-describedby": `${selectId}-hint`,
          }}
          sx={{
            "& .MuiOutlinedInput-notchedOutline": {
              border: "none",
            },
            backgroundColor: select_bgColor,
            "& .MuiSelect-select": {
              color: select_color,
              py: 0.5,
              minHeight: "24px",
              display: "flex",
              alignItems: "center",
            },
            "& .MuiSelect-icon": {
              color: select_color,
            },
            fontSize: { xs: "16px", sm: "18px", md: "20px" },
            minHeight: "34px",
            borderRadius: 1,
            "&.Mui-focused": {
              outline: "2px solid currentColor",
              outlineOffset: "2px",
            },
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
