import { createSlice } from "@reduxjs/toolkit";

// const initialState = {};

const fieldSchema = createSlice({
  name: "fieldSchema",
  initialState: {
    schemaName: "",
    fields: {},
    formatPatterns: {},
    depFormatPatterns: {},
    pages: [],
    childPages: {},
  },
  reducers: {
    setSchemaName: (state, action) => {
      state.schemaName = action.payload;
    },
    setFields: (state, action) => {
      state.fields = action.payload;
    },
    setFormatPatterns: (state, action) => {
      state.formatPatterns = action.payload;
    },
    setDepFormatPatterns: (state, action) => {
      state.depFormatPatterns = action.payload;
    },
    setPages: (state, action) => {
      state.pages = action.payload;
    },
    setChildPages: (state, action) => {
      state.childPages = action.payload || {};
    },
    upsertChildPageMeta: (state, action) => {
      const { childPageIndex, parentFieldPath, parentPageIndex, label } =
        action.payload;
      if (childPageIndex === null || childPageIndex === undefined) return;

      const existing = state.childPages[childPageIndex];
      state.childPages[childPageIndex] = {
        parentFieldPath: parentFieldPath || existing?.parentFieldPath,
        parentPageIndex: existing?.parentPageIndex !== undefined ? existing.parentPageIndex : parentPageIndex,
        label: label || existing?.label,
      };
    },
    resetFieldSchemas: (state) => {
      state.schemaName = "";
      state.fields = {};
      state.formatPatterns = {};
      state.depFormatPatterns = {};
      state.pages = [];
      state.childPages = {};
    },
  },
});

export const {
  setFields,
  setSchemaName,
  setDepFormatPatterns,
  setFormatPatterns,
  setPages,
  setChildPages,
  upsertChildPageMeta,
  resetFieldSchemas,
} = fieldSchema.actions;
export default fieldSchema.reducer;
