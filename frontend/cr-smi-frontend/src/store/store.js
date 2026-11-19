import { configureStore } from "@reduxjs/toolkit";
import importReducer from "./slices/importSlice";

export const store = configureStore({
  reducer: {
    importData: importReducer,
    // Add planner, cr, sr, dashboard, topology reducers as each screen is built
  },
});
