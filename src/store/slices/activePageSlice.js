import { createSlice } from "@reduxjs/toolkit";

const activePageSlice = createSlice({
  name: "activePage",
  initialState: { index: 0 },
  reducers: {
    setActivePage: (state, action) => {
      state.index = action.payload;
    },
    resetActivePage: (state) => {
      state.index = 0;
    },
  },
});

export const { setActivePage, resetActivePage } = activePageSlice.actions;
export const selectActivePage = (state) => state.activePage.index;
export default activePageSlice.reducer;
