import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Stack, Box } from "@mui/system";
import { Button } from "@mui/material";
import AccordionExpand from "../components/Stateless/Accordion";
import SelectLanguage from "../components/Stateful/LanguageSelector";
import UploadButton from "../components/Stateful/UploadButton";

function HomePage() {
  const [uploadedFiles, setUploadedFiles] = useState(null);
  const [jsonContent, setJsonContent] = useState(null);
  const navigate = useNavigate();

  const handleFileSelect = (files) => {
    const file = files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const jsonData = JSON.parse(e.target.result);
        setJsonContent(jsonData);
        setUploadedFiles(files);
      } catch (e) {
        alert("Invalid JSON file");
      }
    };
    reader.readAsText(file);
  };

  const handleViewClick = () => {
    if (jsonContent) {
      navigate("/review", { state: { jsonContent } });
    }
  };

  // 
  const handleEditClick = () => {
    if (jsonContent) {
      navigate("/form", { state: { jsonContent } });
    }
  };

  return (
    <div className="HomePage">
      <div className="Header">
        <Stack
          direction={"row"}
          spacing={2}
          alignItems="center"
          justifyContent={{ xs: "space-around", sm: "space-between" }}
          sx={{
            padding: { sm: "0px 16px", md: "0px 32px" },
            backgroundColor: "rgba(70, 160, 35, 1)",
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
              Semantic Engine
            </Box>
            <Box
              component="div"
              sx={{
                marginTop: { xs: "0px", sm: "3px" },
                fontSize: { xs: "14px", sm: "18px", md: "22px" },
              }}
            >
              Catalogue
            </Box>
          </Box>
          <Stack direction={"row"} spacing={2} alignItems="center">
            <Box>
              <SelectLanguage />
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
      <div
        className="Content"
        style={{
          textAlign: "center",
          backgroundColor: "rgba(70, 160, 35, 1)",
          padding: "15px 30px",
          color: "white",
        }}
      >
        <h1>Catalogue your work</h1>
        <p style={{ fontSize: "1.25rem" }}>
          Make it easier for others to track your work and cite what you make
        </p>
      </div>
      <div
        className="Quick-Start_Content"
        style={{
          textAlign: "left",
          backgroundColor: "rgba(180, 230, 160, 0.3)",
          padding: "80px 80px",
          color: "black",
        }}
      >
        <h3 style={{ marginBottom: "0px" }}>Quick-Start:</h3>
        <p style={{ fontSize: "1rem", fontWeight: "500", marginTop: "0px" }}>
          1.{" "}
          <a
            href="https://agrifooddatacanada.ca/"
            target="_blank"
            rel="noreferrer"
            style={{
              color: "rgba(70, 160, 35, 1)",
              textDecoration: "underline",
              textUnderlineOffset: "2px",
              textDecorationColor: "rgba(0, 225, 0, 1)",
              cursor: "pointer",
              "&:hover": {
                textDecorationColor: "rgba(70, 160, 35, 1)",
              },
            }}
          >
            Watch our tutorial video on creating a catalogue.
          </a>{" "}
          Or{" "}
          <a
            href="https://agrifooddatacanada.ca/"
            target="_blank"
            rel="noreferrer"
            style={{
              color: "rgba(70, 160, 35, 1)",
              textDecoration: "underline",
              textUnderlineOffset: "2px",
              textDecorationColor: "rgba(0, 225, 0, 1)",
              cursor: "pointer",
              "&:hover": {
                textDecorationColor: "rgba(70, 160, 35, 1)",
              },
            }}
          >
            read the tutorial
          </a>{" "}
          instead.
          <br />
          2. Write your catalogue and generate a .json.
          <br />
          3. Use your catalogue here to view, and generate a JSON-LD for data
          input aligned with Open-AIRE metadata standards.
          <br />
          4. Store your catalogue files with your data, put them in a
          repository, or collaborate by sharing them with others.
        </p>
      </div>
      <br />
      <Stack
        direction={{ sm: "column", md: "row" }}
        spacing={{ xs: 3, sm: 3, md: 4, lg: 8 }}
        alignItems={{ xs: "center", sm: "center", md: "flex-start" }}
        justifyContent="space-between"
        sx={{
          marginTop: "50px",
          padding: {
            sm: "0px 50px",
            md: "0px 70px",
            lg: "0px 140px",
            xl: "0px 300px",
          },
        }}
      >
        <Box width={{ xs: "90%", sm: "75%", md: "50%" }}>
          <div className="MainContent" style={{ padding: "0px 10px" }}>
            <AccordionExpand />
            <br />
            <AccordionExpand />
            <br />
            <AccordionExpand />
          </div>
        </Box>
        <Box
          width={{ xs: "90%", sm: "90%", md: "50%" }}
          height={"425px"}
          alignItems="center"
          style={{
            textAlign: "center",
            backgroundColor: "rgba(180, 230, 160, 0.3)",
          }}
        >
          <p style={{ fontSize: "1.5rem", fontWeight: "500" }}>Quick Links</p>
          <Box
            component={Link}
            to="/form"
            sx={{
              fontSize: "1.25rem",
              fontWeight: "500",
              color: "rgba(70, 160, 35, 1)",
              textDecoration: "underline",
              textUnderlineOffset: "2px",
              textDecorationColor: "rgba(0, 225, 0, 1)",
              cursor: "pointer",
              "&:hover": {
                textDecorationColor: "rgba(70, 160, 35, 1)",
              },
            }}
          >
            Write a Catalogue
          </Box>
          <hr
            style={{
              width: "90%",
              borderTop: "2px rgba(70, 160, 35, 1) solid",
              marginTop: "25px",
            }}
          />
          <UploadButton onFileSelect={handleFileSelect} />
          {uploadedFiles && <p>File uploaded: {uploadedFiles[0].name}</p>}
          <Stack
            direction="column"
            spacing={2}
            justifyContent="center"
            alignItems="center"
          >
            <Button
              variant="contained"
              disabled={!uploadedFiles}
              onClick={handleViewClick}
              sx={{
                width: "75%",
                backgroundColor: uploadedFiles
                  ? "rgba(70, 160, 35, 1)"
                  : "rgba(125, 150, 125, 0.35)",
                color: uploadedFiles ? "white" : "gray",
                boxShadow: uploadedFiles ? undefined : "none",
                cursor: uploadedFiles ? "pointer" : "default",
              }}
            >
              View Catalogue
            </Button>
            <Button
              variant="contained"
              disabled={!uploadedFiles}
              onClick={handleEditClick}
              sx={{
                width: "75%",
                backgroundColor: uploadedFiles
                  ? "rgba(70, 160, 35, 1)"
                  : "rgba(125, 150, 125, 0.35)",
                color: uploadedFiles ? "white" : "gray",
                boxShadow: uploadedFiles ? undefined : "none",
                cursor: uploadedFiles ? "pointer" : "default",
              }}
            >
              Edit Catalogue
            </Button>
          </Stack>
        </Box>
      </Stack>
      <hr
        style={{
          maxWidth: "100%",
          borderTop: "1px rgba(220, 220, 220, 1) solid",
          marginTop: "80px",
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

export default HomePage;
