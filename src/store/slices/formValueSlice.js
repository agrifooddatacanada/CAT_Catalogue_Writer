import { createSlice } from "@reduxjs/toolkit";

const formValueSlice = createSlice({
  name: "formValueSlice",
  initialState: {
    formState: {},
  },
  reducers: {
    // Use ONLY for initial load or full reset
    setInitialFormState: (state, action) => {
      state.formState = action.payload || {};
    },
    // Replace entire form (if you really need it)
    setFormState: (state, action) => {
      state.formState = action.payload || {};
    },
    // Set or overwrite a single field
    setFieldValue: (state, action) => {
      const { path, value } = action.payload;
      state.formState[path] = value;
    },
    // Patch multiple fields at once
    patchFormValues: (state, action) => {
      const updates = action.payload || {};
      Object.keys(updates).forEach((path) => {
        state.formState[path] = updates[path];
      });
    },
    // Remove a single field
    removeFieldValue: (state, action) => {
      const path = action.payload;
      delete state.formState[path];
    },
    // Optional: clear everything
    clearFormValues: (state) => {
      state.formState = {};
    },
    // Mark field as touched (user interacted)
    setFieldTouched: (state, action) => {
      const { path } = action.payload;
      state.touched = state.touched || {};
      state.touched[path] = true;
    },
  },
});

export const {
  setInitialFormState,
  setFormState,
  setFieldValue,
  patchFormValues,
  removeFieldValue,
  clearFormValues,
  setFieldTouched,
} = formValueSlice.actions;

export default formValueSlice.reducer;
