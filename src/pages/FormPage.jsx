import React, { useEffect, useState } from "react";
import { Stack, Box } from "@mui/system";
//import { useLocation } from "react-router-dom";
import {
  Button,
  MenuItem,
  FormControl,
  Select,
  FormHelperText,
} from "@mui/material";
//import { extractAttributes } from "../utils/extractAttributes";
import DynamicForm from "../components/Stateful/DynamicForm";
//import SelectLanguage from "../components/Stateful/LanguageSelector";

function FormPage() {
  //const location = useLocation();
  //const { jsonContent } = location.state || {};

  const [language, setLanguage] = React.useState("eng");
  const [jsonData, setJsonData] = useState(null);

  const handleChange = (e) => {
    setLanguage(e.target.value);
  };

  //const [fields, setFields] = useState([]);

  useEffect(() => {
    fetch("./OpenAIRE_OCA_package.json")
      .then((res) => res.json())
      .then(setJsonData)
      .catch((err) => console.error(err));
  }, []);

  if (!jsonData) return <div>Loading...</div>;

  return (
    <div className="FormPage">
      <div className="Header">
        <Stack
          direction={"row"}
          spacing={2}
          alignItems="center"
          justifyContent={{ xs: "space-around", sm: "space-between" }}
          sx={{
            padding: { sm: "0px 16px", md: "0px 32px" },
            //backgroundColor: "rgba(70, 160, 35, 1)",
            color: "rgba(70, 160, 35, 1)",
          }}
        >
          <Stack direction={"row"} alignItems={"center"}>
            <Box
              component="a"
              href="https://agrifooddatacanada.ca/"
              target="_blank"
              rel="noreferrer"
              sx={{
                marginLeft: "0px !important",
                "& img": {
                  maxWidth: "100px",
                },
              }}
            >
              <img
                src="/assets/images/semantic-engine-logo.png"
                alt="Agri-Food Data Canada at UoG White Logo"
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
                color: "rgba(70, 160, 35, 1)",
                fontSize: "25px",
                fontWeight: "700",
                margin: "0px",
              }}
            >
              Write Catalogue Record
            </p>
          </Stack>
          <Button
            variant="contained"
            //onClick={handleViewClick}
            sx={{
              display: "inline-block",
              marginTop: "16px !important",
              marginBottom: "16px !important",
              marginRight: "16px !important",
              marginLeft: "0px !important",
              padding: "8px 40px",
              backgroundColor: "rgba(70, 160, 35, 1)",
              color: "white",
              boxShadow: "none",
              cursor: "pointer",
            }}
          >
            Help with this page
          </Button>
          <Box>
            <FormControl sx={{ maxWidth: 90 }}>
              <FormHelperText
                sx={{
                  color: "rgba(70, 160, 35, 1)",
                  fontSize: { xs: "7.5px", sm: "8.25px", lg: "9px" },
                  lineHeight: 1.2,
                  margin: "0px",
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
                  color: "rgba(70, 160, 35, 1)",
                  fontSize: { xs: "18px", sm: "21px", md: "24px" },
                  height: "25px",
                  marginTop: "2px",
                }}
                MenuProps={{
                  PaperProps: {
                    sx: {
                      backgroundColor: "rgba(235, 235, 235, 0.95)",
                      color: "rgba(70, 160, 35, 1)",
                    },
                  },
                }}
              >
                <MenuItem
                  value="eng"
                  sx={{
                    "&.Mui-selected": {
                      backgroundColor: "rgba(215, 215, 215, 1)",
                      color: "rgba(175, 175, 175, 1)",
                    },
                    "&:hover": {
                      backgroundColor: "rgba(255, 255, 255, 0.5)",
                    },
                  }}
                >
                  EN
                </MenuItem>
                <MenuItem
                  value="fre"
                  sx={{
                    "&.Mui-selected": {
                      backgroundColor: "rgba(215, 215, 215, 1)",
                      color: "rgba(175, 175, 175, 1)",
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
      {/* <pre>{JSON.stringify(fields, null, 2)}</pre> */}
      <Box sx={{ maxWidth: 600, margin: "auto", padding: 2 }}>
        <DynamicForm jsonData={jsonData} language={language} />
      </Box>
    </div>
  );
}

export default FormPage;
