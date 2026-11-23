import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  ChevronLeft,
  ChevronRight,
  CalendarPlus,
  Search,
  AlertCircle,
  Loader2,
} from "lucide-react";
import {
  fetchPlannerData,
  setSelectedDate,
  clearDateFilter,
  setPlannerFilter,
  dismissPlannerBanner,
} from "../../store/slices/plannerSlice";
import PlanCrModal from "./PlanCrModal";
import CrUpdateModal from "./CrUpdateModal";

export default function RolloutPlannerPage() {
  const dispatch = useDispatch();
  const { sites, crs, executions, selectedDate, filters, loading, banner } =
    useSelector((state) => state.planner);

  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [activeExecution, setActiveExecution] = useState(null);

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
      const dayCrs = crs.filter((c) =>
        (c.plannedStart || "").startsWith(dateStr),
      );
      const scheduledCount = dayCrs.filter(
        (c) => c.status === "SCHEDULED" || c.status === "IN_PROGRESS",
      ).length;
      const plannedCount = dayCrs.filter((c) => c.status === "PLANNED").length;
      cells.push({ day, dateStr, scheduledCount, plannedCount });
    }
    return cells;
  }, [currentMonth, crs]);

  // Derive unique Site and Rack options from executions
  const rackOptions = useMemo(() => {
    const filtered =
      filters.site === "ALL"
        ? executions
        : executions.filter((e) => e.siteName === filters.site);
    return Array.from(new Set(filtered.map((e) => e.rackName).filter(Boolean)));
  }, [executions, filters.site]);

  // Filter unified row-wise executions
  const filteredExecutions = useMemo(() => {
    return executions.filter((row) => {
      if (
        filters.filterByDate &&
        row.plannedStart &&
        !row.plannedStart.startsWith(selectedDate)
      ) {
        return false;
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
  }, [executions, filters, selectedDate]);

  const renderStageBadge = (status) => {
    const val = (status || "PENDING").toUpperCase();
    if (val === "PASS") return <span className="badge-success">Pass</span>;
    if (val === "FAIL") return <span className="badge-danger">Fail</span>;
    if (val === "IN_PROGRESS")
      return <span className="badge-info">In Progress</span>;
    return <span className="badge-neutral">Pending</span>;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {banner && (
        <div
          className={`fixed top-16 right-4 z-50 max-w-md w-full p-4 rounded-xl border shadow-lg flex items-center justify-between gap-4 text-sm font-medium transition-all ${
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
                    className="h-16 rounded-lg bg-slate-50/40"
                  />
                );
              const isSelected =
                filters.filterByDate && selectedDate === cell.dateStr;
              return (
                <button
                  key={cell.dateStr}
                  type="button"
                  onClick={() => dispatch(setSelectedDate(cell.dateStr))}
                  className={`h-16 p-2 rounded-lg border text-left flex flex-col justify-between transition-colors ${
                    isSelected
                      ? "border-blue-600 bg-blue-50/60"
                      : "border-slate-200 hover:border-blue-400 bg-white"
                  }`}
                >
                  <span
                    className={`text-xs font-bold ${isSelected ? "text-blue-700" : "text-slate-700"}`}
                  >
                    {cell.day}
                  </span>
                  <div className="flex flex-wrap gap-1">
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
          {/* Site Filter */}
          <select
            value={filters.site}
            onChange={(e) =>
              dispatch(setPlannerFilter({ site: e.target.value, rack: "ALL" }))
            }
            className="px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium bg-white"
          >
            <option value="ALL">Site: All Sites</option>
            {sites.map((s) => (
              <option key={s.id} value={s.siteCode}>
                {s.siteCode} — {s.siteName}
              </option>
            ))}
          </select>

          {/* Rack Filter */}
          <select
            value={filters.rack}
            onChange={(e) =>
              dispatch(setPlannerFilter({ rack: e.target.value }))
            }
            className="px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium bg-white"
          >
            <option value="ALL">Rack: All Racks</option>
            {rackOptions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>

          {/* Node Type Filter */}
          <select
            value={filters.nodeType}
            onChange={(e) =>
              dispatch(setPlannerFilter({ nodeType: e.target.value }))
            }
            className="px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium bg-white"
          >
            <option value="ALL">Type: All Nodes</option>
            <option value="ROUTER">Router</option>
            <option value="SWITCH">Switch</option>
            <option value="FIREWALL">Firewall</option>
            <option value="CONTROLLER">Controller</option>
          </select>

          {/* Execution Status Filter */}
          <select
            value={filters.status}
            onChange={(e) =>
              dispatch(setPlannerFilter({ status: e.target.value }))
            }
            className="px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium bg-white"
          >
            <option value="ALL">Status: All</option>
            <option value="PENDING">Pending</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="PASS">Pass</option>
            <option value="FAIL">Failed</option>
          </select>

          {/* Search Input */}
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
                  <th>Site Name</th>
                  <th>Rack ID</th>
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
                        key={row.id}
                        className={hasFailure ? "bg-red-50/40" : ""}
                      >
                        <td className="font-semibold text-slate-900">
                          {row.siteName}
                        </td>
                        <td className="font-mono text-xs text-slate-700">
                          {row.rackName}
                        </td>
                        <td>
                          <div className="font-mono font-bold text-slate-900">
                            {row.nodeName}
                          </div>
                          <div className="text-[11px] text-blue-600 font-medium">
                            {row.crNumber}
                          </div>
                        </td>
                        <td>
                          <span className="badge-neutral">{row.nodeType}</span>
                        </td>
                        <td className="font-mono text-xs text-slate-500">
                          {row.currentVersion}
                        </td>
                        <td className="font-mono text-xs font-semibold text-blue-700">
                          {row.targetVersion}
                        </td>
                        <td>{renderStageBadge(row.preCheckStatus)}</td>
                        <td>{renderStageBadge(row.upgradeStatus)}</td>
                        <td>{renderStageBadge(row.postCheckStatus)}</td>
                        <td className="text-xs text-slate-500">
                          {row.updatedAt
                            ? new Date(row.updatedAt).toLocaleTimeString()
                            : "—"}
                        </td>
                        <td className="text-right">
                          <div className="inline-flex items-center gap-2">
                            {hasFailure && (
                              <button
                                type="button"
                                onClick={() => setActiveExecution(row)}
                                className="px-2.5 py-1 rounded border border-red-500 text-red-600 hover:bg-red-50 text-xs font-semibold inline-flex items-center gap-1"
                              >
                                <AlertCircle className="w-3.5 h-3.5" /> Raise SR
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setActiveExecution(row)}
                              className="btn-secondary text-xs py-1 px-3"
                            >
                              Update
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

      {/* Update CR / Execution & Raise SR Modal */}
      {activeExecution && (
        <CrUpdateModal
          execution={activeExecution}
          onClose={() => setActiveExecution(null)}
        />
      )}
    </div>
  );
}
