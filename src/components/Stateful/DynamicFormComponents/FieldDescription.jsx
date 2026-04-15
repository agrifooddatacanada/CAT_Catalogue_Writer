import React, { useCallback, useEffect, useRef, useState } from "react";
import { Box, Link, Typography } from "@mui/material";
import { useTranslation } from "../../../utils/OpenAIRE/TranslationContext";
import theme from "../../../theme";
import { useSelector } from "react-redux";
import { selectFieldByPath } from "../../../store/selectors/formSelectors";
import { removeIndices } from "../../../utils/removeIndices";
import { selectMode } from "../../../store/slices/modeSlice";

const FieldDescription = ({ valuePath }) => {
  const { t } = useTranslation(); // use translation function

  const fieldPath = removeIndices(valuePath);
  const field = useSelector(selectFieldByPath(fieldPath));

  const { description } = field;

  const mode = useSelector(selectMode);
  const readOnly = mode === "view";

  const lines = 2;

  const [expanded, setExpanded] = useState(false);
  const [isClamped, setIsClamped] = useState(false);
  const descriptionRef = useRef(null);

  // Function to check if text is clamped
  const checkIfClamped = useCallback(() => {
    if (descriptionRef.current && description) {
      const element = descriptionRef.current;
      setIsClamped(element.scrollHeight > element.clientHeight);
    }
  }, [description]);

  // Check on mount and when description changes
  useEffect(() => {
    checkIfClamped();
    setExpanded(false);
  }, [description, checkIfClamped]);

  // Use ResizeObserver to detect when the element's size changes (including window resize)
  useEffect(() => {
    if (!descriptionRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      checkIfClamped();
    });

    resizeObserver.observe(descriptionRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [checkIfClamped]);

  // Check if text is clamped (overflows 2 lines)
  useEffect(() => {
    if (descriptionRef.current && description) {
      const element = descriptionRef.current;
      setIsClamped(element.scrollHeight > element.clientHeight);
    }
  }, [description]);

  const clampSx = expanded
    ? {}
    : {
        display: "-webkit-box",
        WebkitBoxOrient: "vertical",
        WebkitLineClamp: lines,
        overflow: "hidden",
        textOverflow: "ellipsis",
      };

  return (
    <Box>
      {!readOnly && (
        <Box sx={{ position: "relative", mb: 0.5 }}>
          <Typography
            ref={descriptionRef}
            component="div"
            sx={{
              color: theme.descriptionColor,
              pr: isClamped && !expanded ? 12 : 0,
              ...clampSx,
            }}
          >
            {description}
            {isClamped && !expanded && (
              <Box
                sx={{
                  position: "absolute",
                  right: 0,
                  bottom: 0,
                  display: "flex",
                  alignItems: "center",
                  pl: 2,
                  // fade so the button blends over truncated text
                  background: theme.linearGradient,
                }}
              >
                <Link
                  component="button"
                  type="button"
                  onClick={() => setExpanded((v) => !v)}
                  underline="none"
                >
                  {t("forminputsingle.show_more")}
                </Link>
              </Box>
            )}
            {!isClamped && expanded && (
              <Box>
                <Link
                  component="button"
                  type="button"
                  onClick={() => setExpanded((v) => !v)}
                  underline="none"
                >
                  {t("forminputsingle.show_less")}
                </Link>
              </Box>
            )}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default FieldDescription;
