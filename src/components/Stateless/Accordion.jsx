import React, { useId } from "react";
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
  const baseId = useId();
  const headerId = `${baseId}-header`;
  const contentId = `${baseId}-content`;

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
            <ExpandMoreIcon sx={{ color: theme.primaryTextColor, fontSize: "40px" }} />
          }
          aria-controls={contentId}
          id={headerId}
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
        <AccordionDetails id={contentId} aria-labelledby={headerId}>
          <Typography
            component="div"
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
