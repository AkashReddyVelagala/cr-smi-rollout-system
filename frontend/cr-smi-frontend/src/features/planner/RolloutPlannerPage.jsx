import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  CalendarPlus,
  Search,
  AlertCircle,
  Loader2,
  X,
  Clock,
  ExternalLink,
  Eye,
} from "lucide-react";
import {
  fetchPlannerData,
  setSelectedDate,
  clearDateFilter,
  setPlannerFilter,
  dismissPlannerBanner,
} from "../../store/slices/plannerSlice";
import apiClient from "../../api/apiClient";
import PlanCrModal from "./PlanCrModal";

export default function RolloutPlannerPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { crs, executions, selectedDate, filters, loading, banner } =
    useSelector((state) => state.planner);

  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);

  // CR History Popup State
  const [selectedCrHistory, setSelectedCrHistory] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    dispatch(fetchPlannerData());
  }, [dispatch]);

  useEffect(() => {
    if (!banner) return;
    const timer = setTimeout(() => {
      dispatch(dismissPlannerBanner());
    }, 4000);
    return () => clearTimeout(timer);
  }, [banner, dispatch]);

  const getCrDateStr = (item) => {
    const raw =
      item?.scheduledDate || item?.windowStart || item?.plannedStart || "";
    return String(raw).slice(0, 10);
  };

  // Open CR History Popup when CR Number is clicked
  const handleOpenCrHistory = async (row) => {
    const matchedCr =
      crs.find(
        (c) => String(c.id) === String(row.crId) || c.crNumber === row.crNumber,
      ) || {};

    const crId = matchedCr.id || row.crId;
    const crNodes = executions.filter((e) => e.crNumber === row.crNumber);

    setSelectedCrHistory({
      cr: { ...matchedCr, crNumber: row.crNumber, id: crId },
      nodes: crNodes,
      auditLogs: [],
    });

    if (crId) {
      setLoadingHistory(true);
      try {
        const { data } = await apiClient.get(`/crs/${crId}`);
        setSelectedCrHistory((prev) =>
          prev
            ? {
                ...prev,
                cr: { ...prev.cr, ...data },
                auditLogs: data.auditLogs || data.history || [],
              }
            : null,
        );
      } catch {
        // Keep basic CR & node history if detailed endpoint is unavailable
      } finally {
        setLoadingHistory(false);
      }
    }
  };

  // Navigate to SR Tracking screen with pre-filled failure context
  const handleRedirectToRaiseSr = (row) => {
    const failedStage =
      row.preCheckStatus === "FAIL"
        ? "PRE_CHECK"
        : row.upgradeStatus === "FAIL"
          ? "UPGRADE"
          : "POST_CHECK";

    navigate("/srs", {
      state: {
        action: "RAISE_SR",
        prefill: {
          crId: row.crId,
          crNumber: row.crNumber,
          nodeId: row.nodeId,
          nodeName: row.nodeName,
          siteName: row.siteName,
          rackName: row.rackName,
          executionId: row.executionId ?? row.id,
          summary: `${failedStage} failure on ${row.nodeName} (${row.siteName} / ${row.rackName})`,
        },
      },
    });
  };

  // Navigate to CR List screen to update CR / Node status
  const handleRedirectToCrUpdate = (rowOrCr) => {
    navigate("/crs", {
      state: {
        action: "UPDATE_CR",
        crId: rowOrCr.crId || rowOrCr.id,
        crNumber: rowOrCr.crNumber,
        executionId: rowOrCr.executionId ?? rowOrCr.id,
        nodeName: rowOrCr.nodeName,
      },
    });
  };

  // Build calendar days for the active month
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDayIdx = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells = [];
    for (let i = 0; i < firstDayIdx; i++) cells.push(null);

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const dayCrs = crs.filter((c) => getCrDateStr(c) === dateStr);

      const totalCount = dayCrs.length;
      const scheduledCount = dayCrs.filter(
        (c) => c.status === "SCHEDULED" || c.status === "IN_PROGRESS",
      ).length;
      const plannedCount = dayCrs.filter((c) => c.status === "PLANNED").length;
      const completedCount = dayCrs.filter(
        (c) => c.status === "COMPLETED",
      ).length;
      const failedCount = dayCrs.filter((c) => c.status === "FAILED").length;

      cells.push({
        day,
        dateStr,
        totalCount,
        scheduledCount,
        plannedCount,
        completedCount,
        failedCount,
      });
    }
    return cells;
  }, [currentMonth, crs]);

  const crDateByNumber = useMemo(() => {
    const map = {};
    crs.forEach((c) => {
      if (c.crNumber) map[c.crNumber] = getCrDateStr(c);
    });
    return map;
  }, [crs]);

  const rackOptions = useMemo(() => {
    const filtered =
      filters.site === "ALL"
        ? executions
        : executions.filter((e) => e.siteName === filters.site);
    return Array.from(new Set(filtered.map((e) => e.rackName).filter(Boolean)));
  }, [executions, filters.site]);

  const filteredExecutions = useMemo(() => {
    return executions.filter((row) => {
      if (filters.filterByDate) {
        const rowDate = getCrDateStr(row) || crDateByNumber[row.crNumber] || "";
        if (rowDate !== selectedDate) return false;
      }
      if (filters.site !== "ALL" && row.siteName !== filters.site) return false;
      if (filters.rack !== "ALL" && row.rackName !== filters.rack) return false;
      if (filters.nodeType !== "ALL" && row.nodeType !== filters.nodeType)
        return false;
      if (filters.status !== "ALL") {
        const hasStatus =
          row.preCheckStatus === filters.status ||
          row.upgradeStatus === filters.status ||
          row.postCheckStatus === filters.status;
        if (!hasStatus) return false;
      }
      if (filters.search.trim()) {
        const q = filters.search.toLowerCase();
        const match =
          row.nodeName?.toLowerCase().includes(q) ||
          row.siteName?.toLowerCase().includes(q) ||
          row.rackName?.toLowerCase().includes(q) ||
          row.crNumber?.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [executions, filters, selectedDate, crDateByNumber]);

  const renderStageBadge = (status) => {
    const val = (status || "PENDING").toUpperCase();
    if (val === "PASS") return <span className="badge-success">Pass</span>;
    if (val === "FAIL") return <span className="badge-danger">Fail</span>;
    if (val === "IN_PROGRESS")
      return <span className="badge-info">In Progress</span>;
    if (val === "BLOCKED")
      return <span className="badge-warning">Blocked</span>;
    return <span className="badge-neutral">Pending</span>;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {banner && (
        <div
          className={`fixed top-4 left-4 lg:left-68 z-50 max-w-md w-full p-4 rounded-xl border shadow-lg flex items-center justify-between gap-4 text-sm font-medium transition-all ${
            banner.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          <span>{banner.text}</span>
          <button
            type="button"
            onClick={() => dispatch(dismissPlannerBanner())}
            className="text-xs underline opacity-75 hover:opacity-100 shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Minimalist Month Calendar Card */}
      <div className="app-card overflow-hidden">
        <div className="app-card-header flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-bold text-slate-900">
              {currentMonth.toLocaleString("default", {
                month: "long",
                year: "numeric",
              })}
            </h2>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() =>
                  setCurrentMonth(
                    new Date(
                      currentMonth.getFullYear(),
                      currentMonth.getMonth() - 1,
                      1,
                    ),
                  )
                }
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  setCurrentMonth(
                    new Date(now.getFullYear(), now.getMonth(), 1),
                  );
                  dispatch(clearDateFilter());
                }}
                className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700"
              >
                All Dates
              </button>
              <button
                type="button"
                onClick={() =>
                  setCurrentMonth(
                    new Date(
                      currentMonth.getFullYear(),
                      currentMonth.getMonth() + 1,
                      1,
                    ),
                  )
                }
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            {filters.filterByDate && (
              <span className="badge-info">Filtered Date: {selectedDate}</span>
            )}
          </div>

          <button
            type="button"
            onClick={() => setIsPlanModalOpen(true)}
            className="btn-primary"
          >
            <CalendarPlus className="w-4 h-4" /> Plan New CR
          </button>
        </div>

        <div className="p-4">
          <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-slate-400 mb-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((cell, idx) => {
              if (!cell)
                return (
                  <div
                    key={`empty-${idx}`}
                    className="min-h-[84px] rounded-lg bg-slate-50/40"
                  />
                );
              const isSelected =
                filters.filterByDate && selectedDate === cell.dateStr;
              return (
                <button
                  key={cell.dateStr}
                  type="button"
                  onClick={() => dispatch(setSelectedDate(cell.dateStr))}
                  className={`min-h-[84px] p-2 rounded-lg border text-left flex flex-col justify-between transition-colors ${
                    isSelected
                      ? "border-blue-600 bg-blue-50/60"
                      : "border-slate-200 hover:border-blue-400 bg-white"
                  }`}
                >
                  <span
                    className={`text-xs font-bold ${
                      isSelected ? "text-blue-700" : "text-slate-700"
                    }`}
                  >
                    {cell.day}
                  </span>
                  {cell.totalCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-700">
                      {cell.totalCount} CRs
                    </span>
                  )}
                  <div className="flex flex-wrap gap-1 mt-1">
                    {cell.scheduledCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-700">
                        {cell.scheduledCount} Sched
                      </span>
                    )}
                    {cell.plannedCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800">
                        {cell.plannedCount} Plan
                      </span>
                    )}
                    {cell.completedCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-700">
                        {cell.completedCount} Done
                      </span>
                    )}
                    {cell.failedCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-700">
                        {cell.failedCount} Fail
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Unified Filter Bar & Row-Wise Rollout Execution Table */}
      <div className="app-card overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/60 flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold text-slate-600">Rack:</span>
          <select
            value={filters.rack}
            onChange={(e) =>
              dispatch(setPlannerFilter({ rack: e.target.value }))
            }
            className="px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium bg-white"
          >
            <option value="ALL">All Racks</option>
            {rackOptions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>

          <span className="text-xs font-semibold text-slate-600">Status:</span>
          <select
            value={filters.status}
            onChange={(e) =>
              dispatch(setPlannerFilter({ status: e.target.value }))
            }
            className="px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium bg-white"
          >
            <option value="ALL">All</option>
            <option value="PENDING">Pending</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="PASS">Pass</option>
            <option value="FAIL">Failed</option>
          </select>

          <div className="relative ml-auto min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search node, CR, rack..."
              value={filters.search}
              onChange={(e) =>
                dispatch(setPlannerFilter({ search: e.target.value }))
              }
              className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
            />
          </div>
        </div>

        <div className="table-wrapper">
          {loading ? (
            <div className="py-16 flex flex-col items-center text-slate-500 text-sm">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-2" />
              Loading rollout schedule...
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>CR Number</th>
                  <th>Site Name</th>
                  <th>Rack Name</th>
                  <th>Node Name</th>
                  <th>Node Type</th>
                  <th>Current Version</th>
                  <th>Updated Version</th>
                  <th>Pre-Check</th>
                  <th>Upgrade</th>
                  <th>Post-Check</th>
                  <th>Last Updated</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredExecutions.length === 0 ? (
                  <tr>
                    <td
                      colSpan={11}
                      className="text-center py-12 text-sm text-slate-500"
                    >
                      No scheduled rollout nodes match the current filters.
                      Click <strong>Plan New CR</strong> above to schedule
                      nodes.
                    </td>
                  </tr>
                ) : (
                  filteredExecutions.map((row) => {
                    const hasFailure =
                      row.preCheckStatus === "FAIL" ||
                      row.upgradeStatus === "FAIL" ||
                      row.postCheckStatus === "FAIL";

                    return (
                      <tr
                        key={row.executionId ?? row.id}
                        className={hasFailure ? "bg-red-50/40" : ""}
                      >
                        <td className="font-semibold text-slate-900">
                          {row.crNumber}
                        </td>
                        <td className="font-semibold text-slate-900">
                          {row.siteName}
                        </td>
                        <td className="font-mono text-xs text-slate-700">
                          {row.rackName}
                        </td>
                        <td>
                          <button
                            type="button"
                            onClick={() => handleRedirectToCrUpdate(row)}
                            title="Open in CR List to update status"
                            className="font-mono font-bold text-slate-900 hover:text-blue-600 text-left block"
                          >
                            {row.nodeName}
                          </button>
                        </td>
                        <td>
                          <span className="badge-neutral">{row.nodeType}</span>
                        </td>
                        <td className="font-mono text-xs text-slate-500">
                          {row.fromVersion ?? row.currentVersion ?? "—"}
                        </td>
                        <td className="font-mono text-xs font-semibold text-blue-700">
                          {row.toVersion ?? row.updatedVersion ?? "—"}
                        </td>
                        <td>{renderStageBadge(row.preCheckStatus)}</td>
                        <td>{renderStageBadge(row.upgradeStatus)}</td>
                        <td>{renderStageBadge(row.postCheckStatus)}</td>
                        <td className="text-xs text-slate-500">
                          {(row.updatedAt ?? row.lastUpdated)
                            ? new Date(
                                row.updatedAt ?? row.lastUpdated,
                              ).toLocaleTimeString()
                            : "—"}
                        </td>
                        <td className="text-right">
                          <div className="inline-flex items-center justify-end gap-2">
                            {hasFailure && (
                              <button
                                type="button"
                                onClick={() => handleRedirectToRaiseSr(row)}
                                className="px-2.5 py-1 rounded border border-red-500 text-red-600 hover:bg-red-50 text-xs font-semibold inline-flex items-center gap-1"
                              >
                                <AlertCircle className="w-3.5 h-3.5" /> Raise SR
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleOpenCrHistory(row)}
                              title={`View full rollout history for ${row.crNumber}`}
                              className="btn-secondary text-xs py-1 px-2.5 inline-flex items-center gap-1"
                            >
                              <Eye className="w-3.5 h-3.5 text-blue-600" /> View
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Plan New CR Modal */}
      <PlanCrModal
        isOpen={isPlanModalOpen}
        onClose={() => setIsPlanModalOpen(false)}
        defaultDate={selectedDate}
      />

      {/* Full CR History Popup Modal */}
      {selectedCrHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[88vh]">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <div className="flex items-center gap-2.5">
                  <h3 className="text-base font-bold text-slate-900">
                    {selectedCrHistory.cr.crNumber} — History
                  </h3>
                  {selectedCrHistory.cr.status && (
                    <span className="badge-info">
                      {selectedCrHistory.cr.status}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {selectedCrHistory.cr.title ||
                    "Change Request Execution Record"}
                  {selectedCrHistory.cr.ownerName
                    ? ` • Owner: ${selectedCrHistory.cr.ownerName}`
                    : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCrHistory(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              {/* Target Nodes in this CR */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                  Target Nodes &amp; Stage Progression (
                  {selectedCrHistory.nodes.length})
                </h4>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Site / Rack</th>
                        <th>Node</th>
                        <th>Target Ver</th>
                        <th>Pre-Check</th>
                        <th>Upgrade</th>
                        <th>Post-Check</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedCrHistory.nodes.map((n) => (
                        <tr key={n.executionId ?? n.id}>
                          <td className="text-xs">
                            <span className="font-semibold">{n.siteName}</span>{" "}
                            <span className="text-slate-400">
                              / {n.rackName}
                            </span>
                          </td>
                          <td className="font-mono text-xs font-bold">
                            {n.nodeName}
                          </td>
                          <td className="font-mono text-xs text-blue-700">
                            {n.toVersion ?? n.updatedVersion ?? "—"}
                          </td>
                          <td>{renderStageBadge(n.preCheckStatus)}</td>
                          <td>{renderStageBadge(n.upgradeStatus)}</td>
                          <td>{renderStageBadge(n.postCheckStatus)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Chronological Audit Trail */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                  Audit Log &amp; Status Timeline
                </h4>

                {loadingHistory ? (
                  <div className="py-6 flex items-center justify-center gap-2 text-xs text-slate-500">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                    Loading audit logs...
                  </div>
                ) : selectedCrHistory.auditLogs.length === 0 ? (
                  <p className="p-4 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-500">
                    No audit log entries recorded yet for this CR.
                  </p>
                ) : (
                  <div className="space-y-2.5 border-l-2 border-blue-200 pl-4 ml-1">
                    {selectedCrHistory.auditLogs.map((log, i) => (
                      <div
                        key={log.id || i}
                        className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 text-xs"
                      >
                        <div className="flex items-center justify-between font-semibold text-slate-800">
                          <span>{log.action}</span>
                          <span className="font-mono text-[11px] text-slate-400">
                            {log.createdAt
                              ? new Date(log.createdAt).toLocaleString()
                              : ""}
                          </span>
                        </div>
                        {(log.previousState || log.newState) && (
                          <div className="font-mono text-[11px] text-slate-600 mt-1">
                            {log.previousState || "INIT"} → {log.newState}
                          </div>
                        )}
                        {log.reason && (
                          <p className="text-slate-600 mt-1">{log.reason}</p>
                        )}
                        {log.performedBy && (
                          <p className="text-[11px] text-slate-400 mt-1">
                            By: {log.performedBy}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <button
                type="button"
                onClick={() => handleRedirectToCrUpdate(selectedCrHistory.cr)}
                className="btn-primary text-xs inline-flex items-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Update Status in CR
                List
              </button>
              <button
                type="button"
                onClick={() => setSelectedCrHistory(null)}
                className="btn-secondary text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
