import { configureStore } from "@reduxjs/toolkit";
import importReducer from "./slices/importSlice";
import plannerReducer from "./slices/plannerSlice";

export const store = configureStore({
  reducer: {
    importData: importReducer,
    planner: plannerReducer,
  },
});
