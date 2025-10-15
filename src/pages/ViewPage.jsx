import React, { useState, useEffect } from "react";
import { Stack, Box } from "@mui/system";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Tooltip,
  Button,
  MenuItem,
  FormControl,
  Select,
  FormHelperText,
} from "@mui/material";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
//import SelectLanguage from "../components/Stateful/LanguageSelector";
import DynamicForm from "../components/Stateful/DynamicForm"
import EditIcon from '@mui/icons-material/Edit';
import FileDownloadIcon from '@mui/icons-material/FileDownload';

function ViewPage() {
  const location = useLocation();
  const navigate = useNavigate();
  
  const uploadedJson = location.state?.jsonContent || null;
  const isModified = location.state?.isModified || false;

  const [language, setLanguage] = React.useState("EN");
  const [jsonSchema, setJsonSchema] = useState(null);

  const downloadJson = (jsonData) => {
    const jsonLdString = JSON.stringify(jsonData, null, 2);
    const blob = new Blob([jsonLdString], { type: 'application/ld+json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `catalogue-${jsonData.catalogue_id || 'export'}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // LOAD FORM SCHEMA JSON ONCE
  useEffect(() => {
    fetch("./OpenAIRE_OCA_package.json")
      .then((res) => res.json())
      .then(setJsonSchema)
      .catch((err) => console.error(err));
  }, []);

  if (!jsonSchema) {
    return <div>Loading schema...</div>;
  }

  if (!uploadedJson) {
    return <p>No catalogue loaded. Please upload a file first and only then can you view it.</p>;
  }

  const handleChange = (e) => {
    setLanguage(e.target.value);
  };

  return (
    <div className="ViewPage">
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
              {isModified ? "Review": "View"} Catalogue Record
            </p>
            <Tooltip
              title="You can view your catalogue record in a human-readable form on this page."
              arrow
            >
              <HelpOutlineIcon
                sx={{
                  marginLeft: "15px",
                  fontSize: "15px",
                  color: "rgba(120,120,120,1)",
                }}
              />
            </Tooltip>
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
                  value="EN"
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
                  value="FR"
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
        {/* <div style={{ padding: "20px" }}>
          <pre style={{ whiteSpace: "pre-wrap", wordWrap: "break-word" }}>
            {JSON.stringify(jsonContent, null, 2)}
          </pre>
        </div> */}
      </div>

      <Box sx={{ maxWidth: 1000, margin: "auto", padding: 5 }}>
        <DynamicForm 
          jsonData={jsonSchema}
          language={language}
          initialData={uploadedJson}
          readOnly={true} // Prop for view mode
        />

        <Button 
          variant="contained"
          type="submit"
          sx={{ backgroundColor: "rgba(70, 160, 35, 1)", mt: "2px", mr: "10px" }}
          onClick={() => navigate("/form", { state: { jsonContent: uploadedJson } })}
          startIcon={<EditIcon />}
        >
          Edit
        </Button>
        <Button 
          variant="contained"
          type="submit"
          disabled={!isModified}
          sx={{ backgroundColor: "rgba(70, 160, 35, 1)", mt: "2px", ml: "10px" }}
          onClick={() => downloadJson(uploadedJson)}
          startIcon={<FileDownloadIcon />}
        >
          Download (.json)
        </Button>
      </Box>
      <hr
        style={{
          maxWidth: "100%",
          borderTop: "1px rgba(220, 220, 220, 1) solid",
          marginTop: "20px",
          marginBottom: "3px",
        }}
      />
      <div className="Footer" style={{ padding: "32px" }}>
        <p style={{ margin: "0px" }}>Powered by</p>
        <a
          href="https://agrifooddatacanada.ca/"
          target="_blank"
          rel="noreferrer"
        >
          <img
            src="/assets/images/agri-logo.png"
            alt="Agri-Food Data Canada at UoG Logo"
            style={{ width: "200px", marginBottom: "15px" }}
          />
        </a>
        <p style={{ margin: "0px" }}>Supported by</p>
        <a
          href="https://www.cfref-apogee.gc.ca/home-accueil-eng.aspx"
          target="_blank"
          rel="noreferrer"
        >
          <img
            src="/assets/images/research-excellent-fund.png"
            alt="Canada First Research Excellence Fund Logo"
            style={{ height: "120px" }}
          />
        </a>
      </div>
    </div>
  );
}

export default ViewPage;
