import React, { useCallback, useEffect, useRef, useState } from "react";
import { Box, Link, Typography } from "@mui/material";
import { useTranslation } from "../../../utils/OpenAIRE/TranslationContext";
import theme from "../../../theme";
import { useSelector } from "react-redux";
import { selectFieldByPath } from "../../../store/selectors/formSelectors";
import { removeIndices } from "../../../utils/removeIndices";
import { selectMode } from "../../../store/slices/modeSlice";

const FieldDescription = ({ valuePath, id }) => {
  const { t } = useTranslation();

  const fieldPath = removeIndices(valuePath);
  const field = useSelector(selectFieldByPath(fieldPath));
  const description = field?.description || "";

  const mode = useSelector(selectMode);
  const readOnly = mode === "view";

  const lines = 2;

  const [expanded, setExpanded] = useState(false);
  const [hasOverflow, setHasOverflow] = useState(false);
  const descriptionRef = useRef(null);

  // Only measure overflow while collapsed so expanded state never loses "Show less"
  const checkOverflow = useCallback(() => {
    const element = descriptionRef.current;
    if (element && description && !expanded) {
      setHasOverflow(element.scrollHeight > element.clientHeight + 1);
    }
  }, [description, expanded]);

  useEffect(() => {
    setExpanded(false);
  }, [description]);

  useEffect(() => {
    checkOverflow();
  }, [checkOverflow]);

  useEffect(() => {
    const element = descriptionRef.current;
    if (!element || !description || typeof ResizeObserver === "undefined") {
      return undefined;
    }

    const resizeObserver = new ResizeObserver(() => {
      checkOverflow();
    });

    resizeObserver.observe(element);
    return () => resizeObserver.disconnect();
  }, [checkOverflow, description]);

  if (readOnly || !description) {
    return null;
  }

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
    <Box id={id} sx={{ position: "relative", mb: 0.5 }}>
      <Typography
        ref={descriptionRef}
        component="div"
        sx={{
          fontSize: 13,
          color: theme.descriptionColor,
          pr: hasOverflow && !expanded ? 12 : 0,
          ...clampSx,
        }}
      >
        {description}
        {hasOverflow && !expanded && (
          <Box
            sx={{
              position: "absolute",
              right: 0,
              bottom: 0,
              display: "flex",
              alignItems: "center",
              pl: 2,
              background: theme.linearGradient,
            }}
          >
            <Link
              component="button"
              type="button"
              onClick={() => setExpanded(true)}
              underline="hover"
            >
              {t("forminputsingle.show_more")}
            </Link>
          </Box>
        )}
        {hasOverflow && expanded && (
          <Box sx={{ mt: 0.25 }}>
            <Link
              component="button"
              type="button"
              onClick={() => setExpanded(false)}
              underline="hover"
            >
              {t("forminputsingle.show_less")}
            </Link>
          </Box>
        )}
      </Typography>
    </Box>
  );
};

export default FieldDescription;
