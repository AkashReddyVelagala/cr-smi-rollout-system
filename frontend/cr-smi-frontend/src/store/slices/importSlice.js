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
      return { fileName: file.name, result: data };
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

export const fetchImportHistory = createAsyncThunk(
  "importData/fetchHistory",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await apiClient.get("/import/history");
      const list = Array.isArray(data) ? data : data?.content || [];

      return list.map((log) => {
        const rawNewState = log.newState ?? log.new_state;
        let parsedRows = [];
        if (
          typeof rawNewState === "string" &&
          rawNewState.trim().startsWith("[")
        ) {
          try {
            parsedRows = JSON.parse(rawNewState);
          } catch {
            parsedRows = [];
          }
        } else if (Array.isArray(rawNewState)) {
          parsedRows = rawNewState;
        }

        const createdAt = log.createdAt ?? log.created_at;
        return {
          id: log.id,
          timestamp: createdAt
            ? new Date(createdAt).toLocaleString()
            : "Just now",
          stage:
            log.action === "BULK_DATA_IMPORTED"
              ? "IMPORT_COMMIT"
              : "VALIDATION",
          fileName:
            log.previousState ?? log.previous_state ?? "import_batch.xlsx",
          summary: log.reason || "Completed",
          rows: parsedRows,
        };
      });
    } catch (err) {
      return rejectWithValue(err.message);
    }
  },
);

const importSlice = createSlice({
  name: "importData",
  initialState: {
    fileName: "",
    previewData: null,
    validating: false,
    committing: false,
    banner: null,
    historyLogs: [],
  },
  reducers: {
    resetImport: (state) => {
      state.fileName = "";
      state.previewData = null;
      state.banner = null;
    },
    dismissBanner: (state) => {
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
        state.fileName = action.payload.fileName;
        state.previewData = action.payload.result;
        state.historyLogs.unshift({
          id: Date.now(),
          timestamp: new Date().toLocaleString(),
          stage: "VALIDATION",
          fileName: action.payload.fileName,
          summary: `Total: ${action.payload.result.totalRows} | Valid: ${action.payload.result.validCount} | Warnings: ${action.payload.result.warningCount} | Errors: ${action.payload.result.errorCount}`,
          rows: action.payload.result.rows,
        });
      })
      .addCase(validateImportFile.rejected, (state, action) => {
        state.validating = false;
        state.previewData = null;
        state.banner = { type: "error", text: action.payload };
      })
      .addCase(commitImportRows.pending, (state) => {
        state.committing = true;
        state.banner = null;
      })
      .addCase(commitImportRows.fulfilled, (state, action) => {
        state.committing = false;
        const committedRows = state.previewData?.rows || [];
        const importedFileName = state.fileName;
        state.historyLogs.unshift({
          id: Date.now(),
          timestamp: new Date().toLocaleString(),
          stage: "IMPORT_COMMIT",
          fileName: importedFileName,
          summary: `Persisted ${action.payload.nodesPersisted} node(s) to PostgreSQL`,
          rows: committedRows,
        });
        state.previewData = null;
        state.fileName = "";
        state.banner = {
          type: "success",
          text: `Successfully imported ${action.payload.nodesPersisted} node(s).`,
        };
      })
      .addCase(commitImportRows.rejected, (state, action) => {
        state.committing = false;
        state.banner = { type: "error", text: action.payload };
      })
      .addCase(fetchImportHistory.fulfilled, (state, action) => {
        state.historyLogs = action.payload;
      });
  },
});

export const { resetImport, dismissBanner } = importSlice.actions;
export default importSlice.reducer;
