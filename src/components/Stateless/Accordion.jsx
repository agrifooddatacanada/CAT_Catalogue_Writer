import * as React from "react";
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import theme from "../../theme";

const borderColor = theme.primaryColor;

export default function AccordionExpand({ accordion_question, accordion_summary }) {
  return (
    <div>
      <Accordion
        sx={{
          boxShadow: "none",
          border: "none",
          borderRadius: "0 !important",
          "&:before": {
            display: "none",
          },
        }}
      >
        <AccordionSummary
          expandIcon={
            <ExpandMoreIcon sx={{ color: borderColor, fontSize: "40px" }} />
          }
          aria-controls="panel-content"
          id="panel-header"
          sx={{
            borderBottom: `3px solid ${borderColor}`,
            marginBottom: "20px",
          }}
        >
          <Typography
            component="span"
            sx={{
              fontFamily: '"Roboto", sans-serif',
              fontSize: "20px",
            }}
          >
            {accordion_question}
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography
            sx={{
              fontFamily: '"Roboto", sans-serif',
              fontSize: "16px",
            }}
          >
            {accordion_summary}
          </Typography>
        </AccordionDetails>
      </Accordion>
    </div>
  );
}
