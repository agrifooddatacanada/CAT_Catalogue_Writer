import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  mode: "", // "view" | "edit"
};

const modeSlice = createSlice({
  name: "mode",
  initialState,
  reducers: {
    setMode: (state, action) => {
      state.mode = action.payload; // "view" or "edit"
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
// export const isViewMode = (state) => state.mode.mode === "view";
// export const isEditMode = (state) => state.mode.mode === "edit";
