import React from "react";
import FormInputMultiple from "./FormInputMultiple";
import FormInputGroup from "./FormInputGroup";
import FormInputSingle from "./FormInputSingle";
import { Box, Typography } from "@mui/material";
import FormInputMultipleChildren from "./FormInputMultipleChildren";
import { removeIndices } from "../../../utils/removeIndices";
import { useSelector } from "react-redux";
import { selectFieldByPath } from "../../../store/selectors/formSelectors";
import { selectMode } from "../../../store/slices/modeSlice";

const FieldChecker = ({ valuePath, depth = 0 }) => {
  const fieldPath = removeIndices(valuePath);
  const field = useSelector(selectFieldByPath(fieldPath));

  const mode = useSelector(selectMode);
  const readOnly = mode === "view";

  const { name, label, required, multiple, children } = field;

  // multiple + has children → composite multiple
  if (multiple && children && children.length > 0) {
    // console.log("Came to FIMC for:", name, "at", fieldPath, "|", valuePath);
    return (
      <>
        <Box sx={readOnly ? { mt: 1 } : { mt: depth === 0 ? 3 : 1 }}>
          <Typography variant="h6" component="label" sx={{ display: "block" }}>
            {label || name}
            {required && !readOnly && (
              <span style={{ color: "red", marginLeft: 4 }}>*</span>
            )}
          </Typography>
        </Box>
        <FormInputMultipleChildren valuePath={valuePath} />
      </>
    );
  }

  // not multiple, but has children → nested group
  if (children && children.length > 0) {
    // console.log("FIC");
    return (
      <>
        <Box sx={readOnly ? { mt: 1 } : { mt: depth === 0 ? 3 : 1 }}>
          <Typography variant="h6" component="label" sx={{ display: "block" }}>
            {label || name}
            {required && !readOnly && (
              <span style={{ color: "red", marginLeft: 4 }}>*</span>
            )}
          </Typography>
        </Box>
        <FormInputGroup valuePath={valuePath} />
      </>
    );
  }

  // multiple, no children → list of simple values
  if (multiple) {
    // console.log("Came to FIM for:", name, "at", fieldPath);
    return (
      <>
        <Box sx={readOnly ? { mt: 1 } : { mt: depth === 0 ? 3 : 1 }}>
          <Typography
            variant={depth === 0 ? "h6" : "h7"}
            component="label"
            sx={{ display: "block" }}
          >
            {label || name}
            {required && !readOnly && (
              <span style={{ color: "red", marginLeft: 4 }}>*</span>
            )}
          </Typography>
        </Box>
        <FormInputMultiple valuePath={fieldPath} depth={depth} />
      </>
    );
  }

  // leaf field
  // console.log("Came to FIS for:", name, "at", fieldPath, "|", valuePath);
  return (
    <>
      <FormInputSingle valuePath={valuePath} depth={depth} />
    </>
  );
};

export default FieldChecker;
