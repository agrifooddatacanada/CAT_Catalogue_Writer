import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  nextValuePath: null,
  parentPageIndex: null,
  childPageIndex: null,
  isEdit: false,
  fallbackLabel: null, // parent field label
  fallbackFieldPath: null,
  useGeneratedPage: false, // true when no schema page is defined in the schema
  previous: null, // linked list for nested sessions
};

const childFormNavigationSlice = createSlice({
  name: "childFormNavigation",
  initialState,
  reducers: {
    setChildFormNavigation(state, action) {
      const isPush = action.payload.push === true;
      if (isPush && state.nextValuePath) {
        state.previous = {
          nextValuePath: state.nextValuePath,
          parentPageIndex: state.parentPageIndex,
          childPageIndex: state.childPageIndex,
          isEdit: state.isEdit,
          fallbackLabel: state.fallbackLabel,
          fallbackFieldPath: state.fallbackFieldPath,
          useGeneratedPage: state.useGeneratedPage,
          previous: state.previous,
        };
      } else if (!isPush) {
        state.previous = null;
      }
      
      state.nextValuePath = action.payload.nextValuePath;
      state.parentPageIndex = action.payload.parentPageIndex;
      state.childPageIndex = action.payload.childPageIndex;
      state.isEdit = action.payload.isEdit;
      state.fallbackLabel = action.payload.fallbackLabel;
      state.fallbackFieldPath = action.payload.fallbackFieldPath;
      state.useGeneratedPage = action.payload.useGeneratedPage;
    },
    popChildFormNavigation(state) {
      if (state.previous) {
        const prev = state.previous;
        state.nextValuePath = prev.nextValuePath;
        state.parentPageIndex = prev.parentPageIndex;
        state.childPageIndex = prev.childPageIndex;
        state.isEdit = prev.isEdit;
        state.fallbackLabel = prev.fallbackLabel;
        state.fallbackFieldPath = prev.fallbackFieldPath;
        state.useGeneratedPage = prev.useGeneratedPage;
        state.previous = prev.previous;
      } else {
        state.nextValuePath = null;
        state.parentPageIndex = null;
        state.childPageIndex = null;
        state.isEdit = false;
        state.fallbackLabel = null;
        state.fallbackFieldPath = null;
        state.useGeneratedPage = false;
        state.previous = null;
      }
    },
    clearChildFormNavigation(state) {
      state.nextValuePath = null;
      state.parentPageIndex = null;
      state.childPageIndex = null;
      state.isEdit = false;
      state.fallbackLabel = null;
      state.fallbackFieldPath = null;
      state.useGeneratedPage = false;
      state.previous = null;
    },
  },
});

export const { setChildFormNavigation, popChildFormNavigation, clearChildFormNavigation } =
  childFormNavigationSlice.actions;

export default childFormNavigationSlice.reducer;
