import { createSlice } from "@reduxjs/toolkit";

const initialState = {};

const fieldSchema = createSlice({
  name: "fieldSchema",
  initialState: {
    schemaName: "",
    fields: {},
    formatPatterns: {},
    depFormatPatterns: {},
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
    resetFieldSchemas: () => initialState,
  },
});

export const {
  setFields,
  setSchemaName,
  setDepFormatPatterns,
  setFormatPatterns,
} = fieldSchema.actions;
export default fieldSchema.reducer;
