import { createSlice } from "@reduxjs/toolkit";

const instanceCountsSlice = createSlice({
  name: "instanceCounts",
  initialState: {
    instanceCounts: {},
  },
  reducers: {
    // Set counts of all
    setAllInstanceCounts: (state, action) => {
      state.instanceCounts = action.payload || {};
    },

    // Set count directly
    setInstanceCount: (state, action) => {
      const { path, count } = action.payload;
      state.instanceCounts[path] = count;
    },

    // Increment count for a path (create new instance)
    incrementInstanceCount: (state, action) => {
      const path = action.payload;
      const current = state.instanceCounts[path] || 0;
      state.instanceCounts[path] = current + 1;
    },

    // Decrement count for a path (remove instance, but not below 0)
    decrementInstanceCount: (state, action) => {
      const path = action.payload;
      const current = state.instanceCounts[path] || 0;
      state.instanceCounts[path] = Math.max(0, current - 1);
    },

    // Remove tracking for a path entirely
    clearInstanceCount: (state, action) => {
      const path = action.payload;
      delete state.instanceCounts[path];
    },

    // Reset all instance counts (e.g. on form reset)
    clearAllInstanceCounts: (state) => {
      state.instanceCounts = {};
    },
  },
});

export const {
  setAllInstanceCounts,
  setInstanceCount,
  incrementInstanceCount,
  decrementInstanceCount,
  clearInstanceCount,
  clearAllInstanceCounts,
} = instanceCountsSlice.actions;

export default instanceCountsSlice.reducer;
