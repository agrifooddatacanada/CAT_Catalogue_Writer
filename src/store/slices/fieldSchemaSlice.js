import { createSlice } from "@reduxjs/toolkit";
import { buildFieldsByPathMap } from "../../utils/fieldTreeUtils";

const fieldSchema = createSlice({
  name: "fieldSchema",
  initialState: {
    schemaName: "",
    fields: {},
    fieldsByPath: {},
    formatPatterns: {},
    depFormatPatterns: {},
    pages: [],
    childPages: {},
    loadedSchemaMeta: {
      schemaKey: "",
      exactSaid: null,
      lang: "eng",
    },
  },
  reducers: {
    setSchemaName: (state, action) => {
      state.schemaName = action.payload;
    },
    setFields: (state, action) => {
      state.fields = action.payload;
      state.fieldsByPath = Array.isArray(action.payload)
        ? buildFieldsByPathMap(action.payload)
        : {};
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
    setLoadedSchemaMeta: (state, action) => {
      state.loadedSchemaMeta = {
        ...state.loadedSchemaMeta,
        ...(action.payload || {}),
      };
    },
    upsertChildPageMeta: (state, action) => {
      const { childPageIndex, parentFieldPath, parentPageIndex, label } =
        action.payload;
      if (childPageIndex === null || childPageIndex === undefined) return;

      const existing = state.childPages[childPageIndex];
      state.childPages[childPageIndex] = {
        parentFieldPath: parentFieldPath || existing?.parentFieldPath,
        parentPageIndex:
          existing?.parentPageIndex !== undefined
            ? existing.parentPageIndex
            : parentPageIndex,
        label: label || existing?.label,
      };
    },
    resetFieldSchemas: (state) => {
      state.schemaName = "";
      state.fields = {};
      state.fieldsByPath = {};
      state.formatPatterns = {};
      state.depFormatPatterns = {};
      state.pages = [];
      state.childPages = {};
      state.loadedSchemaMeta = {
        schemaKey: "",
        exactSaid: null,
        lang: "eng",
      };
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
  setLoadedSchemaMeta,
  upsertChildPageMeta,
  resetFieldSchemas,
} = fieldSchema.actions;
export default fieldSchema.reducer;
