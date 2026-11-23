import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import apiClient from "../../api/apiClient";

export const fetchPlannerData = createAsyncThunk(
  "planner/fetchData",
  async (_, { rejectWithValue }) => {
    try {
      const [sitesRes, crsRes, execRes] = await Promise.all([
        apiClient.get("/topology/sites"),
        apiClient.get("/crs"),
        apiClient.get("/planner/executions"),
      ]);
      return {
        sites: sitesRes.data || [],
        crs: crsRes.data || [],
        executions: execRes.data || [],
      };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  },
);

export const fetchRacksBySite = createAsyncThunk(
  "planner/fetchRacksBySite",
  async (siteId, { rejectWithValue }) => {
    try {
      const { data } = await apiClient.get(`/topology/sites/${siteId}/racks`);
      return data || [];
    } catch (err) {
      return rejectWithValue(err.message);
    }
  },
);

export const fetchNodesByRack = createAsyncThunk(
  "planner/fetchNodesByRack",
  async ({ rackId, nodeType }, { rejectWithValue }) => {
    try {
      const params = nodeType && nodeType !== "ALL" ? { nodeType } : {};
      const { data } = await apiClient.get(`/topology/racks/${rackId}/nodes`, {
        params,
      });
      return data || [];
    } catch (err) {
      return rejectWithValue(err.message);
    }
  },
);

export const scheduleNewCr = createAsyncThunk(
  "planner/scheduleNewCr",
  async (payload, { dispatch, rejectWithValue }) => {
    try {
      const { data } = await apiClient.post("/crs", payload);
      dispatch(fetchPlannerData());
      return data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  },
);

export const updateExecutionStage = createAsyncThunk(
  "planner/updateExecution",
  async (
    {
      executionId,
      stage,
      status,
      overrideGuard = false,
      reason,
      performedBy = "Operations Engineer",
    },
    { dispatch, rejectWithValue },
  ) => {
    try {
      const payload = {
        preCheckStatus: stage === "PRE_CHECK" ? status : null,
        upgradeStatus: stage === "UPGRADE" ? status : null,
        postCheckStatus: stage === "POST_CHECK" ? status : null,
        overrideGuard,
        reason,
        performedBy,
      };

      const { data } = await apiClient.patch(
        `/planner/executions/${executionId}`,
        payload,
      );
      dispatch(fetchPlannerData());
      return data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  },
);

export const updateCrStatusAndLog = createAsyncThunk(
  "planner/updateCrStatus",
  async (
    { crId, status, reason, performedBy = "Operations Engineer" },
    { dispatch, rejectWithValue },
  ) => {
    try {
      const { data } = await apiClient.patch(`/crs/${crId}/status`, {
        status,
        reason,
        performedBy,
      });
      dispatch(fetchPlannerData());
      return data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  },
);

export const raiseServiceRequest = createAsyncThunk(
  "planner/raiseSr",
  async (srPayload, { dispatch, rejectWithValue }) => {
    try {
      const { data } = await apiClient.post("/srs", srPayload);
      dispatch(fetchPlannerData());
      return data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  },
);

const plannerSlice = createSlice({
  name: "planner",
  initialState: {
    sites: [],
    modalRacks: [],
    modalNodes: [],
    loadingTopology: false,
    crs: [],
    executions: [],
    selectedDate: new Date().toISOString().slice(0, 10),
    filters: {
      site: "ALL",
      rack: "ALL",
      nodeType: "ALL",
      status: "ALL",
      search: "",
      filterByDate: false,
    },
    loading: false,
    submitting: false,
    banner: null,
  },
  reducers: {
    setSelectedDate: (state, action) => {
      state.selectedDate = action.payload;
      state.filters.filterByDate = true;
    },
    clearDateFilter: (state) => {
      state.filters.filterByDate = false;
    },
    setPlannerFilter: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    dismissPlannerBanner: (state) => {
      state.banner = null;
    },
    clearModalTopology: (state) => {
      state.modalRacks = [];
      state.modalNodes = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPlannerData.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchPlannerData.fulfilled, (state, action) => {
        state.loading = false;
        state.sites = action.payload.sites;
        state.crs = action.payload.crs;
        state.executions = action.payload.executions;
      })
      .addCase(fetchPlannerData.rejected, (state, action) => {
        state.loading = false;
        state.banner = { type: "error", text: action.payload };
      })
      .addCase(fetchRacksBySite.pending, (state) => {
        state.loadingTopology = true;
        state.modalRacks = [];
        state.modalNodes = [];
      })
      .addCase(fetchRacksBySite.fulfilled, (state, action) => {
        state.loadingTopology = false;
        state.modalRacks = action.payload;
      })
      .addCase(fetchRacksBySite.rejected, (state) => {
        state.loadingTopology = false;
      })
      .addCase(fetchNodesByRack.pending, (state) => {
        state.loadingTopology = true;
        state.modalNodes = [];
      })
      .addCase(fetchNodesByRack.fulfilled, (state, action) => {
        state.loadingTopology = false;
        state.modalNodes = action.payload;
      })
      .addCase(fetchNodesByRack.rejected, (state) => {
        state.loadingTopology = false;
      })
      .addCase(scheduleNewCr.pending, (state) => {
        state.submitting = true;
      })
      .addCase(scheduleNewCr.fulfilled, (state, action) => {
        state.submitting = false;
        state.banner = {
          type: "success",
          text: `CR ${action.payload.crNumber || ""} scheduled successfully.`,
        };
      })
      .addCase(scheduleNewCr.rejected, (state, action) => {
        state.submitting = false;
        state.banner = { type: "error", text: action.payload };
      })
      .addCase(updateExecutionStage.fulfilled, (state) => {
        state.banner = {
          type: "success",
          text: "Node execution stage updated.",
        };
      })
      .addCase(updateCrStatusAndLog.fulfilled, (state) => {
        state.banner = {
          type: "success",
          text: "CR status & audit log updated.",
        };
      })
      .addCase(raiseServiceRequest.fulfilled, (state, action) => {
        state.banner = {
          type: "success",
          text: `Service Request ${action.payload.srNumber || ""} raised and linked.`,
        };
      });
  },
});

export const {
  setSelectedDate,
  clearDateFilter,
  setPlannerFilter,
  dismissPlannerBanner,
  clearModalTopology,
} = plannerSlice.actions;

export default plannerSlice.reducer;
