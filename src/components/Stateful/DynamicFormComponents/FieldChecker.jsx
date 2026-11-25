import React, { useEffect, useMemo } from "react";
import FormInputMultiple from "./FormInputMultiple";
import FormInputSingle from "./FormInputSingle";
import { Box, Typography } from "@mui/material";
import FormInputMultipleChildren from "./FormInputMultipleChildren";
import { removeIndices } from "../../../utils/removeIndices";
import { useSelector, useDispatch } from "react-redux";
import { selectFieldByPath, selectPages } from "../../../store/selectors/formSelectors";
import { selectMode } from "../../../store/slices/modeSlice";
import { selectActivePage } from "../../../store/slices/activePageSlice";
import { upsertChildPageMeta } from "../../../store/slices/fieldSchemaSlice";
import FieldDescription from "./FieldDescription";
import { findLinkedChildPageIndex } from "../../../utils/fieldTreeUtils";

const FieldChecker = ({ valuePath, depth = 0, parentPageIndex }) => {
  const dispatch = useDispatch();

  const fieldPath = removeIndices(valuePath);
  const field = useSelector(selectFieldByPath(fieldPath));
  const pages = useSelector(selectPages);
  const mode = useSelector(selectMode);
  const activePage = useSelector(selectActivePage);

  const readOnly = mode === "view";
  const resolvedParentPageIndex =
    parentPageIndex !== undefined ? parentPageIndex : activePage;

  const linkedChildPageIndex = useMemo(
    () => findLinkedChildPageIndex(field, pages),
    [field, pages],
  );

  const name = field?.name;
  const label = field?.label;

  useEffect(() => {
    if (linkedChildPageIndex >= 0 && field) {
      dispatch(
        upsertChildPageMeta({
          childPageIndex: linkedChildPageIndex,
          parentFieldPath: fieldPath,
          parentPageIndex: resolvedParentPageIndex,
          label: label || name,
        }),
      );
    }
  }, [linkedChildPageIndex, field, fieldPath, resolvedParentPageIndex, label, name, dispatch]);

  if (!field) {
    return null;
  }

  const { required, multiple, children, categories } = field;

  // Composite object children (preserving existing card/sub-page flow for all schemas)
  if (children && children.length > 0) {
    return (
      <>
        <Box sx={readOnly ? { mt: 1 } : { mt: depth === 0 ? 3 : 1 }}>
          <Typography
            variant="subtitle1"
            component="div"
            sx={{ display: "block", fontWeight: 600 }}
          >
            {label || name}
            {required && !readOnly && (
              <span aria-hidden="true" style={{ color: "red", marginLeft: 4 }}>*</span>
            )}
          </Typography>
        </Box>
        <FormInputMultipleChildren
          valuePath={valuePath}
          parentPageIndex={resolvedParentPageIndex}
        />
      </>
    );
  }

  // Multiple categories -> multi-select checkbox group
  if (multiple && categories && categories.length > 0) {
    return (
      <>
        <Box sx={readOnly ? { mt: 1 } : { mt: depth === 0 ? 3 : 1 }}>
          <Typography
            variant="subtitle1"
            component="div"
            sx={{ display: "block", fontWeight: 600 }}
          >
            {label || name}
            {required && !readOnly && (
              <span aria-hidden="true" style={{ color: "red", marginLeft: 4 }}>*</span>
            )}
          </Typography>
        </Box>
        <FieldDescription valuePath={valuePath} />
        <FormInputSingle valuePath={valuePath} depth={depth} />
      </>
    );
  }

  // Multiple primitive values -> repeatable list using indexed valuePath so nested parents never collide
  if (multiple) {
    return (
      <>
        <Box sx={readOnly ? { mt: 1 } : { mt: depth === 0 ? 3 : 1 }}>
          <Typography
            variant="subtitle1"
            component="div"
            sx={{ display: "block", fontWeight: 600 }}
          >
            {label || name}
            {required && !readOnly && (
              <span aria-hidden="true" style={{ color: "red", marginLeft: 4 }}>*</span>
            )}
          </Typography>
        </Box>
        <FieldDescription valuePath={valuePath} />
        <FormInputMultiple valuePath={valuePath} depth={depth} />
      </>
    );
  }

  // Leaf field
  return <FormInputSingle valuePath={valuePath} depth={depth} />;
};

export default FieldChecker;
