import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  isUploaded: false,
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
      state.isUploaded = state.isUploaded === false ? true : false;
    },
    // Reset to default
    resetUploaded: (state) => {
      state.isUploaded = initialState.isUploaded;
    },
  },
});

export const { setIsUploaded, toggleIsUploaded, resetUploaded } =
  uploadFile.actions;
export default uploadFile.reducer;

// Selectors
export const selectIsUploaded = (state) => state.uploadFile.isUploaded;
export const isUploadedTrue = (state) => state.uploadFile.isUploaded === true;
export const isUploadedFalse = (state) => state.uploadFile.isUploaded === false;
