import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  isUploaded: false,
  originalSaid: null,
  recordVersion: "1.0.0", // Can start from 1.0.0 or 0.1.0
  isVersionOf: null,
  versionNotes: "",
  schemaId: null,
};

const uploadFile = createSlice({
  name: "uploadFile",
  initialState,
  reducers: {
    setIsUploaded: (state, action) => {
      state.isUploaded = action.payload;
    },
    // Toggle
    toggleIsUploaded: (state) => {
      state.isUploaded = !state.isUploaded;
    },
    // Set revision metadata
    setRecordMetadata: (state, action) => {
      const { originalSaid, recordVersion, isVersionOf, versionNotes, schemaId } = action.payload || {};
      if (originalSaid !== undefined) state.originalSaid = originalSaid;
      if (recordVersion !== undefined) state.recordVersion = recordVersion;
      if (isVersionOf !== undefined) state.isVersionOf = isVersionOf;
      if (versionNotes !== undefined) state.versionNotes = versionNotes;
      if (schemaId !== undefined) state.schemaId = schemaId;
    },
    setRecordVersion: (state, action) => {
      state.recordVersion = action.payload || "1.0.0";
    },
    setVersionNotes: (state, action) => {
      state.versionNotes = action.payload || "";
    },
    setIsVersionOf: (state, action) => {
      state.isVersionOf = action.payload || null;
    },
    // Reset to default
    resetUploaded: (state) => {
      state.isUploaded = initialState.isUploaded;
      state.originalSaid = initialState.originalSaid;
      state.recordVersion = initialState.recordVersion;
      state.isVersionOf = initialState.isVersionOf;
      state.versionNotes = initialState.versionNotes;
      state.schemaId = initialState.schemaId;
    },
  },
});

export const {
  setIsUploaded,
  toggleIsUploaded,
  setRecordMetadata,
  setRecordVersion,
  setVersionNotes,
  setIsVersionOf,
  resetUploaded,
} = uploadFile.actions;

export default uploadFile.reducer;

// Selectors
export const selectIsUploaded = (state) => state.uploadFile.isUploaded;
export const selectOriginalSaid = (state) => state.uploadFile.originalSaid;
export const selectRecordVersion = (state) => state.uploadFile.recordVersion || "1.0.0";
export const selectIsVersionOf = (state) => state.uploadFile.isVersionOf;
export const selectVersionNotes = (state) => state.uploadFile.versionNotes;
export const selectLoadedSchemaId = (state) => state.uploadFile.schemaId;
