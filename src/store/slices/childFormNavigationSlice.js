import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  nextValuePath: null,
  parentPageIndex: null,
  childPageIndex: null,
  isEdit: false,
  fallbackLabel: null, // parent field label
  fallbackFieldPath: null,
  useGeneratedPage: false, // true when no schema page is defined in the schema
};

const childFormNavigationSlice = createSlice({
  name: "childFormNavigation",
  initialState,
  reducers: {
    setChildFormNavigation(state, action) {
      state.nextValuePath = action.payload.nextValuePath;
      state.parentPageIndex = action.payload.parentPageIndex;
      state.childPageIndex = action.payload.childPageIndex;
      state.isEdit = action.payload.isEdit;
      state.fallbackLabel = action.payload.fallbackLabel;
      state.fallbackFieldPath = action.payload.fallbackFieldPath;
      state.useGeneratedPage = action.payload.useGeneratedPage;
    },
    clearChildFormNavigation(state) {
      state.nextValuePath = null;
      state.parentPageIndex = null;
      state.childPageIndex = null;
      state.isEdit = false;
      state.fallbackLabel = null;
      state.fallbackFieldPath = null;
      state.useGeneratedPage = false;
    },
  },
});

export const { setChildFormNavigation, clearChildFormNavigation } =
  childFormNavigationSlice.actions;

export default childFormNavigationSlice.reducer;
