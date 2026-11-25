import { createSlice, createSelector } from "@reduxjs/toolkit";

const initialState = {
  isUploaded: false,
  originalSaid: null,
  recordVersion: "1.0.0", // Can start from 1.0.0 or 0.1.0
  isVersionOf: null,
  versionNotes: "",
  schemaId: null,
  isPublished: false,
  // Schema plugin upgrade metadata
  isUpgradeMode: false,
  sourceSchemaId: null,
  sourceSchemaVersion: null,
  targetSchemaId: null,
  targetSchemaVersion: null,
  targetFamily: null,
  unmappedFields: [],
  missingRequiredFields: [],
  mappedFieldCount: 0,
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
      const { originalSaid, recordVersion, isVersionOf, versionNotes, schemaId, isPublished } = action.payload || {};
      const published = isPublished !== undefined ? Boolean(isPublished) : state.isPublished;
      if (isPublished !== undefined) state.isPublished = published;
      if (originalSaid !== undefined) state.originalSaid = published ? originalSaid : null;
      if (recordVersion !== undefined) state.recordVersion = recordVersion;
      if (isVersionOf !== undefined) state.isVersionOf = isVersionOf;
      if (versionNotes !== undefined) state.versionNotes = versionNotes;
      if (schemaId !== undefined) state.schemaId = schemaId;
    },
    setUpgradeContext: (state, action) => {
      const {
        isUpgradeMode = true,
        sourceSchemaId = null,
        sourceSchemaVersion = null,
        targetSchemaId = null,
        targetSchemaVersion = null,
        targetFamily = null,
        unmappedFields = [],
        missingRequiredFields = [],
        mappedFieldCount = 0,
      } = action.payload || {};
      state.isUpgradeMode = Boolean(isUpgradeMode);
      state.sourceSchemaId = sourceSchemaId;
      state.sourceSchemaVersion = sourceSchemaVersion;
      state.targetSchemaId = targetSchemaId;
      state.targetSchemaVersion = targetSchemaVersion;
      state.targetFamily = targetFamily;
      state.unmappedFields = Array.isArray(unmappedFields) ? unmappedFields : [];
      state.missingRequiredFields = Array.isArray(missingRequiredFields) ? missingRequiredFields : [];
      state.mappedFieldCount = Number(mappedFieldCount) || 0;
    },
    clearUpgradeContext: (state) => {
      state.isUpgradeMode = false;
      state.sourceSchemaId = null;
      state.sourceSchemaVersion = null;
      state.targetSchemaId = null;
      state.targetSchemaVersion = null;
      state.targetFamily = null;
      state.unmappedFields = [];
      state.missingRequiredFields = [];
      state.mappedFieldCount = 0;
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
    setIsPublished: (state, action) => {
      state.isPublished = Boolean(action.payload);
      if (!state.isPublished) {
        state.originalSaid = null;
      }
    },
    // Reset to default
    resetUploaded: (state) => {
      state.isUploaded = initialState.isUploaded;
      state.originalSaid = initialState.originalSaid;
      state.recordVersion = initialState.recordVersion;
      state.isVersionOf = initialState.isVersionOf;
      state.versionNotes = initialState.versionNotes;
      state.schemaId = initialState.schemaId;
      state.isPublished = initialState.isPublished;
      state.isUpgradeMode = initialState.isUpgradeMode;
      state.sourceSchemaId = initialState.sourceSchemaId;
      state.sourceSchemaVersion = initialState.sourceSchemaVersion;
      state.targetSchemaId = initialState.targetSchemaId;
      state.targetSchemaVersion = initialState.targetSchemaVersion;
      state.targetFamily = initialState.targetFamily;
      state.unmappedFields = initialState.unmappedFields;
      state.missingRequiredFields = initialState.missingRequiredFields;
      state.mappedFieldCount = initialState.mappedFieldCount;
    },
  },
});

export const {
  setIsUploaded,
  toggleIsUploaded,
  setRecordMetadata,
  setUpgradeContext,
  clearUpgradeContext,
  setRecordVersion,
  setVersionNotes,
  setIsVersionOf,
  setIsPublished,
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
export const selectIsPublished = (state) => Boolean(state.uploadFile.isPublished);
export const selectIsUpgradeMode = (state) => Boolean(state.uploadFile.isUpgradeMode);
const selectUploadFileState = (state) => state.uploadFile;

export const selectUpgradeContext = createSelector(
  [selectUploadFileState],
  (uf) => ({
    isUpgradeMode: Boolean(uf.isUpgradeMode),
    sourceSchemaId: uf.sourceSchemaId,
    sourceSchemaVersion: uf.sourceSchemaVersion,
    targetSchemaId: uf.targetSchemaId,
    targetSchemaVersion: uf.targetSchemaVersion,
    targetFamily: uf.targetFamily,
    unmappedFields: uf.unmappedFields || [],
    missingRequiredFields: uf.missingRequiredFields || [],
    mappedFieldCount: uf.mappedFieldCount || 0,
  })
);
