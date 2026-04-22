import React from "react";
import { Button, Box } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import {
  selectActivePage,
  setActivePage,
} from "../store/slices/activePageSlice";
import { selectPages } from "../store/selectors/formSelectors";
import { selectChildFormNavigation } from "../store/slices/childFormNavigationSlice";
import theme from "../../theme";

const NextPageButton = () => {
  const dispatch = useDispatch();

  const activePage = useSelector(selectActivePage);
  const pages = useSelector(selectPages);
  const childFormNavigation = useSelector(selectChildFormNavigation);

  const isInChildFlow =
    !!childFormNavigation?.nextValuePath &&
    childFormNavigation?.parentPageIndex !== null &&
    childFormNavigation?.parentPageIndex !== undefined;

  const isLastBasePage = activePage >= pages.length - 1;

  const handleNext = () => {
    if (!isLastBasePage && !isInChildFlow) {
      dispatch(setActivePage(activePage + 1));
    }
  };

  if (isInChildFlow || isLastBasePage) {
    return null;
  }

  return (
    <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
      <Button
        variant="contained"
        onClick={handleNext}
        sx={{
          backgroundColor: theme.primaryColor,
          "&:hover": {
            backgroundColor: theme.primaryColor,
          },
        }}
      >
        Next
      </Button>
    </Box>
  );
};

export default NextPageButton;
