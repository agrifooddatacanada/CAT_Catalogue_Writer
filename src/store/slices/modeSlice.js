import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  mode: "write", // "write" | "edit" | "view"
};

const modeSlice = createSlice({
  name: "mode",
  initialState,
  reducers: {
    setMode: (state, action) => {
      state.mode = action.payload; // "write" | "edit" | "view"
    },
    // Toggle
    toggleMode: (state) => {
      state.mode = state.mode === "view" ? "edit" : "view";
    },
    // Reset to default
    resetMode: (state) => {
      state.mode = initialState.mode;
    },
  },
});

export const { setMode, toggleMode, resetMode } = modeSlice.actions;
export default modeSlice.reducer;

// Selectors
export const selectMode = (state) => state.mode.mode;
export const isEditMode = (state) => state.mode.mode === "edit";

