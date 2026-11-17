import { configureStore } from "@reduxjs/toolkit";
import importReducer from "./sllices/importSlice";

export const store = configureStore({
  reducer: {
    importData: importReducer,
    // Add planner, cr, sr, dashboard, topology reducers as each screen is built
  },
});
