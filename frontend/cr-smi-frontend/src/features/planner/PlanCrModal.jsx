import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { X, CalendarPlus, CheckSquare, Square, Loader2 } from "lucide-react";
import {
  scheduleNewCr,
  fetchRacksBySite,
  fetchNodesByRack,
  clearModalTopology,
} from "../../store/slices/plannerSlice";

export default function PlanCrModal({ isOpen, onClose, defaultDate }) {
  const dispatch = useDispatch();
  const { sites, modalRacks, modalNodes, loadingTopology, submitting } =
    useSelector((state) => state.planner);

  const [crNumber, setCrNumber] = useState(
    `CR-2026-${Math.floor(1000 + Math.random() * 9000)}`,
  );
  const [title, setTitle] = useState("");
  const [owner, setOwner] = useState("Operations NetOps");
  const [selectedSiteId, setSelectedSiteId] = useState("");
  const [selectedRackId, setSelectedRackId] = useState("");
  const [nodeTypeFilter, setNodeTypeFilter] = useState("ALL");
  const [selectedNodeIds, setSelectedNodeIds] = useState([]);
  const [targetVersion, setTargetVersion] = useState("");
  const [windowStart, setWindowStart] = useState(`${defaultDate}T22:00`);
  const [windowEnd, setWindowEnd] = useState(`${defaultDate}T04:00`);
  const [executionMode, setExecutionMode] = useState("MANUAL");

  // Fetch Racks whenever Site changes
  useEffect(() => {
    if (!selectedSiteId) {
      dispatch(clearModalTopology());
      return;
    }
    dispatch(fetchRacksBySite(selectedSiteId));
  }, [selectedSiteId, dispatch]);

  // Fetch Nodes whenever Rack or NodeType filter changes
  useEffect(() => {
    if (!selectedRackId) return;
    dispatch(
      fetchNodesByRack({ rackId: selectedRackId, nodeType: nodeTypeFilter }),
    );
  }, [selectedRackId, nodeTypeFilter, dispatch]);

  if (!isOpen) return null;

  const activeSite = sites.find((s) => String(s.id) === String(selectedSiteId));

  const toggleNode = (nodeId) => {
    setSelectedNodeIds((prev) =>
      prev.includes(nodeId)
        ? prev.filter((id) => id !== nodeId)
        : [...prev, nodeId],
    );
  };

  const selectAllFiltered = () => {
    const ids = modalNodes.map((n) => n.id);
    setSelectedNodeIds((prev) => Array.from(new Set([...prev, ...ids])));
  };

  const clearFiltered = () => {
    const ids = new Set(modalNodes.map((n) => n.id));
    setSelectedNodeIds((prev) => prev.filter((id) => !ids.has(id)));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSiteId || selectedNodeIds.length === 0) return;

    const startDate = new Date(windowStart);
    let endDate = new Date(windowEnd);
    if (endDate <= startDate) {
      endDate = new Date(endDate.getTime() + 24 * 60 * 60 * 1000);
    }

    const targets = selectedNodeIds.map((id) => {
      const nodeObj = modalNodes.find((n) => String(n.id) === String(id));
      return {
        nodeId: id,
        toVersion:
          targetVersion.trim() || nodeObj?.targetVersion || "2026.01.0",
      };
    });

    await dispatch(
      scheduleNewCr({
        crNumber: crNumber.trim(),
        title: title.trim() || `${activeSite?.siteCode} SMI Upgrade`,
        ownerName: owner.trim(),
        scheduledDate: windowStart.slice(0, 10),
        windowStart: startDate.toISOString(),
        windowEnd: endDate.toISOString(),
        executionMode,
        targets,
      }),
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <CalendarPlus className="w-5 h-5 text-blue-600" />
            <h3 className="text-base font-bold text-slate-900">
              Plan &amp; Schedule New CR
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                CR Number
              </label>
              <input
                type="text"
                required
                value={crNumber}
                onChange={(e) => setCrNumber(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Change Owner
              </label>
              <input
                type="text"
                required
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              CR Title / Scope
            </label>
            <input
              type="text"
              required
              placeholder="e.g., Core Router & Edge Switch SMI Upgrade"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Window Start
              </label>
              <input
                type="datetime-local"
                required
                value={windowStart}
                onChange={(e) => setWindowStart(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Window End
              </label>
              <input
                type="datetime-local"
                required
                value={windowEnd}
                onChange={(e) => setWindowEnd(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
          </div>

          {/* Site, Rack & Node Type Filter Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Target Site
              </label>
              <select
                required
                value={selectedSiteId}
                onChange={(e) => {
                  setSelectedSiteId(e.target.value);
                  setSelectedRackId("");
                  setSelectedNodeIds([]);
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
              >
                <option value="">Select Site...</option>
                {sites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.siteCode} ({site.siteName})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Target Rack
              </label>
              <select
                required
                disabled={!selectedSiteId || loadingTopology}
                value={selectedRackId}
                onChange={(e) => {
                  setSelectedRackId(e.target.value);
                  setSelectedNodeIds([]);
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white disabled:bg-slate-100"
              >
                <option value="">
                  {loadingTopology && selectedSiteId && !selectedRackId
                    ? "Loading Racks..."
                    : "Select Rack..."}
                </option>
                {modalRacks.map((rack) => (
                  <option key={rack.id} value={rack.id}>
                    {rack.rackName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Node Type
              </label>
              <select
                value={nodeTypeFilter}
                onChange={(e) => setNodeTypeFilter(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
              >
                <option value="ALL">All</option>
                <option value="SPINE">SPINE</option>
                <option value="LEAF">LEAF</option>
                <option value="SWITCH">SWITCH</option>
                <option value="CM">CM</option>
                <option value="MASTER">MASTER</option>
                <option value="WORKER">WORKER</option>
                <option value="SMF">SMF</option>
                <option value="KVM">KVM</option>
                <option value="UPF">UPF</option>
                <option value="WORKER">WORKER</option>
                <option value="CIMC">CIMC</option>
              </select>
            </div>
          </div>

          {/* Granular Node Checklist */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-700">
                Select Nodes to Upgrade ({selectedNodeIds.length} selected)
              </label>
              {modalNodes.length > 0 && (
                <div className="flex gap-3 text-xs">
                  <button
                    type="button"
                    onClick={selectAllFiltered}
                    className="text-blue-600 hover:underline font-medium"
                  >
                    Select All ({modalNodes.length})
                  </button>
                  <button
                    type="button"
                    onClick={clearFiltered}
                    className="text-slate-500 hover:underline"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>

            <div className="border border-slate-200 rounded-lg max-h-44 overflow-y-auto divide-y divide-slate-100 bg-slate-50/50">
              {!selectedRackId ? (
                <p className="p-4 text-xs text-slate-400 text-center">
                  Choose a Site and Rack above to load available nodes.
                </p>
              ) : loadingTopology ? (
                <div className="p-4 flex items-center justify-center gap-2 text-xs text-slate-500">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />{" "}
                  Loading nodes...
                </div>
              ) : modalNodes.length === 0 ? (
                <p className="p-4 text-xs text-slate-400 text-center">
                  No nodes match the selected Node Type in this rack.
                </p>
              ) : (
                modalNodes.map((node) => {
                  const checked = selectedNodeIds.includes(node.id);
                  return (
                    <div
                      key={node.id}
                      onClick={() => toggleNode(node.id)}
                      className="px-3.5 py-2.5 flex items-center justify-between cursor-pointer hover:bg-blue-50/40"
                    >
                      <div className="flex items-center gap-2.5">
                        {checked ? (
                          <CheckSquare className="w-4 h-4 text-blue-600" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400" />
                        )}
                        <span className="font-mono text-xs font-bold text-slate-900">
                          {node.nodeName}
                        </span>
                        <span className="badge-neutral">{node.nodeType}</span>
                      </div>
                      <span className="font-mono text-xs text-slate-500">
                        {node.currentVersion} →{" "}
                        {targetVersion || node.targetVersion}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Override Target SMI Version (Optional)
            </label>
            <input
              type="text"
              placeholder="Leave blank to use imported target_version per node"
              value={targetVersion}
              onChange={(e) => setTargetVersion(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono"
            />
          </div>

          <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || selectedNodeIds.length === 0}
              className="btn-primary"
            >
              {submitting
                ? "Scheduling..."
                : `Schedule CR (${selectedNodeIds.length} Nodes)`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
