import { useState } from "react";
import { useDispatch } from "react-redux";
import { X, AlertCircle, CheckCircle2, FileText } from "lucide-react";
import {
  updateExecutionStage,
  updateCrStatusAndLog,
  raiseServiceRequest,
} from "../../store/slices/plannerSlice";

export default function CrUpdateModal({ execution, cr, onClose }) {
  const dispatch = useDispatch();

  const [stage, setStage] = useState("UPGRADE");
  const [stageStatus, setStageStatus] = useState("PASS");
  const [crStatus, setCrStatus] = useState(cr?.status || "IN_PROGRESS");
  const [reason, setReason] = useState("");

  // Raise SR state
  const [showSrForm, setShowSrForm] = useState(false);
  const [severity, setSeverity] = useState("S2");
  const [srSummary, setSrSummary] = useState("");

  if (!execution && !cr) return null;

  const handleStageUpdate = async (e) => {
    e.preventDefault();
    const targetExecutionId = execution?.executionId ?? execution?.id;
    if (!targetExecutionId) return;

    await dispatch(
      updateExecutionStage({
        executionId: targetExecutionId,
        stage,
        status: stageStatus,
        reason: reason || `Marked ${stage} as ${stageStatus}`,
      }),
    );
    onClose();
  };

  const handleCrUpdate = async (e) => {
    e.preventDefault();
    const targetCrId = cr?.id || execution?.crId;
    if (!targetCrId) return;
    await dispatch(
      updateCrStatusAndLog({
        crId: targetCrId,
        status: crStatus,
        reason: reason || `Updated CR status to ${crStatus}`,
      }),
    );
    onClose();
  };

  const handleRaiseSr = async (e) => {
    e.preventDefault();
    await dispatch(
      raiseServiceRequest({
        crId: cr?.id || execution?.crId,
        nodeId: execution?.nodeId,
        executionId: execution?.id,
        severity,
        summary: srSummary || `Failure on ${execution?.nodeName}`,
        owner: "Operations NetOps",
      }),
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {execution
                ? `Update Execution — ${execution.nodeName}`
                : `Manage ${cr?.crNumber}`}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {execution
                ? `Site: ${execution.siteName} • Rack: ${execution.rackName} • CR: ${execution.crNumber}`
                : `${cr?.title}`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          {/* Section 1: Node Stage Progress Update */}
          {execution && (
            <form
              onSubmit={handleStageUpdate}
              className="space-y-3 p-4 rounded-xl border border-slate-200 bg-slate-50/40"
            >
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-600">
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
                Node Rollout Stage Update
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Execution Stage
                  </label>
                  <select
                    value={stage}
                    onChange={(e) => setStage(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                  >
                    <option value="PRE_CHECK">Pre-Check</option>
                    <option value="UPGRADE">Upgrade Execution</option>
                    <option value="POST_CHECK">Post-Check</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Stage Status
                  </label>
                  <select
                    value={stageStatus}
                    onChange={(e) => setStageStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                  >
                    <option value="PENDING">Pending</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="PASS">Pass</option>
                    <option value="FAIL">Fail</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Engineer Note / Audit Reason
                </label>
                <input
                  type="text"
                  placeholder="e.g., Pre-check memory & flash verified; SMI image activated"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <div className="flex justify-end">
                <button type="submit" className="btn-primary text-xs">
                  Save Stage Status
                </button>
              </div>
            </form>
          )}

          {/* Section 2: Overall CR Status & Audit Log */}
          <form
            onSubmit={handleCrUpdate}
            className="space-y-3 p-4 rounded-xl border border-slate-200"
          >
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-600">
              <FileText className="w-4 h-4 text-slate-600" />
              Overall CR Status &amp; Audit Log
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  CR Status
                </label>
                <select
                  value={crStatus}
                  onChange={(e) => setCrStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                >
                  <option value="PLANNED">Planned</option>
                  <option value="SCHEDULED">Scheduled</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="FAILED">Failed</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Audit Log Reason
                </label>
                <input
                  type="text"
                  placeholder="Enter reason for status update or operational note..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => setShowSrForm((prev) => !prev)}
                className="text-xs font-semibold text-red-600 hover:text-red-700 inline-flex items-center gap-1.5"
              >
                <AlertCircle className="w-4 h-4" />
                {showSrForm
                  ? "Hide SR Escalation"
                  : "Escalate / Raise Service Request (SR)"}
              </button>

              <button type="submit" className="btn-secondary text-xs">
                Update CR &amp; Log
              </button>
            </div>
          </form>

          {/* Section 3: Inline Raise SR Escalation */}
          {showSrForm && (
            <form
              onSubmit={handleRaiseSr}
              className="space-y-3 p-4 rounded-xl border border-red-200 bg-red-50/40"
            >
              <div className="text-xs font-bold uppercase tracking-wider text-red-700">
                Raise Service Request (SR)
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Severity
                  </label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                  >
                    <option value="S1">S1 - Critical</option>
                    <option value="S2">S2 - High</option>
                    <option value="S3">S3 - Medium</option>
                    <option value="S4">S4 - Low</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Issue Summary
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Describe pre-check, upgrade, or post-check failure..."
                    value={srSummary}
                    onChange={(e) => setSrSummary(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold"
                >
                  Create &amp; Link SR
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
