import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  viewMode: "mandatory",
  currentPage: 1,
  fieldsPerPage: 6,
};

const formUi = createSlice({
  name: "formUi",
  initialState,
  reducers: {
    setViewMode: (state, action) => {
      state.viewMode = action.payload;
      state.currentPage = 1;
    },
    setCurrentPage: (state, action) => {
      state.currentPage = action.payload;
    },
    resetFormUi: (state) => {
      state.viewMode = "mandatory";
      state.currentPage = 1;
      state.fieldsPerPage = 6;
    },
  },
});

export const { setViewMode, setCurrentPage, resetFormUi } = formUi.actions;
export default formUi.reducer;
