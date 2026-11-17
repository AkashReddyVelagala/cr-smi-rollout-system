import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import apiClient from "../../api/apiClient";

export const validateImportFile = createAsyncThunk(
  "importData/validateFile",
  async (file, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      const { data } = await apiClient.post("/import/validate", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  },
);

export const commitImportRows = createAsyncThunk(
  "importData/commitRows",
  async (
    { rows, performedBy = "Operations Engineer" },
    { rejectWithValue },
  ) => {
    try {
      const { data } = await apiClient.post(
        `/import/commit?performedBy=${encodeURIComponent(performedBy)}`,
        rows,
      );
      return data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  },
);

const importSlice = createSlice({
  name: "importData",
  initialState: {
    previewData: null,
    validating: false,
    committing: false,
    banner: null,
  },
  reducers: {
    clearImportState: (state) => {
      state.previewData = null;
      state.banner = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(validateImportFile.pending, (state) => {
        state.validating = true;
        state.banner = null;
      })
      .addCase(validateImportFile.fulfilled, (state, action) => {
        state.validating = false;
        state.previewData = action.payload;
      })
      .addCase(validateImportFile.rejected, (state, action) => {
        state.validating = false;
        state.banner = { type: "error", text: action.payload };
      })
      .addCase(commitImportRows.pending, (state) => {
        state.committing = true;
      })
      .addCase(commitImportRows.fulfilled, (state, action) => {
        state.committing = false;
        state.previewData = null;
        state.banner = {
          type: "success",
          text: `Successfully imported ${action.payload.nodesPersisted} nodes.`,
        };
      })
      .addCase(commitImportRows.rejected, (state, action) => {
        state.committing = false;
        state.banner = { type: "error", text: action.payload };
      });
  },
});

export const { clearImportState } = importSlice.actions;
export default importSlice.reducer;
