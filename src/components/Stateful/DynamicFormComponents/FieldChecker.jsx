import React from "react";
import FormInputMultiple from "./FormInputMultiple";
// import FormInputGroup from "./FormInputGroup";
import FormInputSingle from "./FormInputSingle";
import { Box, Typography } from "@mui/material";
import FormInputMultipleChildren from "./FormInputMultipleChildren";
import { removeIndices } from "../../../utils/removeIndices";
import { useSelector } from "react-redux";
import { selectFieldByPath } from "../../../store/selectors/formSelectors";
import { selectMode } from "../../../store/slices/modeSlice";
// import { Button } from "@mui/material";
// import AddIcon from "@mui/icons-material/Add";
import { useDispatch } from "react-redux";
import {
  selectActivePage,
  // setActivePage,
} from "../../../store/slices/activePageSlice";
// import { setCurrentPage } from "../../../store/slices/formUiSlice";
import { selectPages } from "../../../store/selectors/formSelectors";
// import theme from "../../../theme";
// import { setChildFormNavigation } from "../../../store/slices/childFormNavigationSlice";
import { upsertChildPageMeta } from "../../../store/slices/fieldSchemaSlice";
import FieldDescription from "./FieldDescription";
import FormInputChildren from "./FormInputChildren";

const FieldChecker = ({ valuePath, depth = 0 }) => {
  const dispatch = useDispatch();

  const fieldPath = removeIndices(valuePath);
  const field = useSelector(selectFieldByPath(fieldPath));

  const pages = useSelector(selectPages);

  const mode = useSelector(selectMode);
  const readOnly = mode === "view";

  const { name, label, required, multiple, children, categories } = field;

  const childFieldNames = (field.children || [])
    .map((child) => child.name)
    .sort();

  const activePage = useSelector(selectActivePage);

  const linkedChildPageIndex =
    childFieldNames.length > 0
      ? pages.findIndex((page) => {
          const pageFieldNames = (page.items || [])
            .flatMap((item) => {
              if (item.type === "section") {
                return (item.fields || []).map((f) => f.name);
              }
              if (item.type === "field" && item.field) {
                return [item.field.name];
              }
              return [];
            })
            .sort();

          return (
            pageFieldNames.length === childFieldNames.length &&
            pageFieldNames.every((name, idx) => name === childFieldNames[idx])
          );
        })
      : -1;

  // const handleOpenChildPage = () => {
  //   dispatch(
  //     setChildFormNavigation({
  //       nextValuePath: valuePath,
  //       parentPageIndex: activePage,
  //       childPageIndex: linkedChildPageIndex >= 0 ? linkedChildPageIndex : null,
  //       isEdit: true,
  //       fallbackLabel: label || name,
  //       fallbackFieldPath: fieldPath,
  //       useGeneratedPage: linkedChildPageIndex < 0,
  //     }),
  //   );

  //   if (linkedChildPageIndex >= 0) {
  //     dispatch(setActivePage(linkedChildPageIndex));
  //   }

  //   dispatch(setCurrentPage(1));
  // };

  React.useEffect(() => {
    if (linkedChildPageIndex >= 0) {
      dispatch(
        upsertChildPageMeta({
          childPageIndex: linkedChildPageIndex,
          parentFieldPath: fieldPath, // here you probably want removeIndices(valuePath)
          parentPageIndex: activePage,
          label: label || name,
        }),
      );
    }
  }, [linkedChildPageIndex, fieldPath, activePage, label, name, dispatch]);

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

          <FormInputChildren valuePath={valuePath} />

          {/* {!readOnly && (
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              sx={{
                color: theme.primaryColor,
                borderColor: theme.primaryColor,
                "&:hover": {
                  borderColor: theme.primaryColor,
                  backgroundColor: theme.backgroundColor,
                },
                mt: 1,
              }}
              onClick={handleOpenChildPage}
            >
              Add {label || name}
            </Button>
          )} */}

          {/* {!readOnly && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<AddIcon />}
              sx={{ mt: 1 }}
              onClick={handleOpenLinkedPage}
            >
              Add {label || name}
            </Button>
          )} */}
        </Box>
        {/* <FormInputGroup valuePath={valuePath} /> */}
      </>
    );
  }

  // multiple, categories → multi select checkbox
  if (multiple && categories && categories.length > 0) {
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
        <FieldDescription valuePath={valuePath} />
        <FormInputSingle valuePath={valuePath} depth={depth} />
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
        <FieldDescription valuePath={valuePath} />
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
