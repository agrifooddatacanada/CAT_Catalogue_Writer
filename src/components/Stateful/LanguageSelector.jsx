import * as React from "react";
import { MenuItem, FormControl, Select, FormHelperText } from "@mui/material";

export default function SelectLanguage() {
  const [language, setLanguage] = React.useState("EN");

  const handleChange = (e) => {
    setLanguage(e.target.value);
  };

  return (
    <div>
      <FormControl sx={{ maxWidth: 90 }}>
        <FormHelperText
          sx={{
            color: "white",
            fontSize: { xs: "7.5px", sm: "8.25px", lg: "9px" },
            lineHeight: 1.2,
          }}
        >
          Sélectionnez le Français ici
          {/*Select English here*/}
        </FormHelperText>
        <Select
          value={language}
          onChange={handleChange}
          displayEmpty
          sx={{
            "& .MuiOutlinedInput-notchedOutline": {
              border: "none",
            },
            backgroundColor: "rgba(70, 160, 35, 1)",
            color: "white",
            fontSize: { xs: "18px", sm: "21px", md: "24px" },
            height: "25px",
            marginTop: "2px",
          }}
          MenuProps={{
            PaperProps: {
              sx: {
                backgroundColor: "rgba(90, 175, 40, 0.95)",
                color: "white",
              },
            },
          }}
        >
          <MenuItem
            value="EN"
            sx={{
              "&.Mui-selected": {
                backgroundColor: "rgba(255, 255, 255, 0.2)",
                color: "rgba(225, 225, 225, 1)",
              },
              "&:hover": {
                backgroundColor: "rgba(255, 255, 255, 0.5)",
              },
            }}
          >
            EN
          </MenuItem>
          <MenuItem
            value="FR"
            sx={{
              "&.Mui-selected": {
                backgroundColor: "rgba(255, 255, 255, 0.2)",
                color: "rgba(225, 225, 225, 1)",
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
