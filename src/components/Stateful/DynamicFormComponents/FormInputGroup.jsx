import React from "react";
import { Box } from "@mui/material";
import { removeIndices } from "../../../utils/removeIndices";
import { useSelector } from "react-redux";
import { selectFieldByPath } from "../../../store/selectors/formSelectors";
import FieldChecker from "./FieldChecker";

const FormInputGroup = ({ valuePath, depth = 0 }) => {
  const fieldPath = removeIndices(valuePath);
  const field = useSelector(selectFieldByPath(fieldPath));
  return (
    <Box>
      {field.children?.map((child, idx) => {
        const childPath = `${valuePath}.${child.name}`;
        return <FieldChecker key={childPath} valuePath={childPath} depth={1} />;
      })}
    </Box>
  );
};

export default FormInputGroup;
