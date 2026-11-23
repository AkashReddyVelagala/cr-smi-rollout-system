import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  UploadCloud,
  Download,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileSpreadsheet,
  Loader2,
} from "lucide-react";
import {
  validateImportFile,
  commitImportRows,
  fetchImportHistory,
  resetImport,
  dismissBanner,
} from "../store/slices/importSlice";

export default function LoadDataPage() {
  const dispatch = useDispatch();
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const { fileName, previewData, validating, committing, banner, historyLogs } =
    useSelector((state) => state.importData);

  useEffect(() => {
    dispatch(fetchImportHistory());
  }, [dispatch]);

  const downloadLogCsv = (logEntry) => {
    const headers = [
      "Row",
      "CR Number",
      "Site Code",
      "Site Name",
      "Region",
      "NSO",
      "Rack",
      "Node Name",
      "Node Type",
      "Current Version",
      "Target Version",
      "Validation Status",
      "Message",
    ];
    const csvLines = [
      headers.join(","),
      ...logEntry.rows.map((r) =>
        [
          r.rowNumber,
          r.crNumber,
          r.siteCode,
          r.siteName,
          r.region,
          r.nso,
          r.rackName,
          r.nodeName,
          r.nodeType,
          r.currentVersion,
          r.targetVersion,
          r.validationStatus,
          `"${(r.message || "").replace(/"/g, '""')}"`,
        ].join(","),
      ),
    ];
    const blob = new Blob([csvLines.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${logEntry.stage.toLowerCase()}_${logEntry.fileName || "report"}_${logEntry.id}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleFileSelect = (file) => {
    if (!file) return;
    dispatch(validateImportFile(file));
  };

  const renderValidationBadge = (status) => {
    if (status === "VALID") {
      return (
        <span className="badge-success">
          <CheckCircle2 className="w-3.5 h-3.5" /> Valid
        </span>
      );
    }
    if (status === "WARNING") {
      return (
        <span className="badge-warning">
          <AlertTriangle className="w-3.5 h-3.5" /> Warning
        </span>
      );
    }
    return (
      <span className="badge-danger">
        <XCircle className="w-3.5 h-3.5" /> Error
      </span>
    );
  };

  const importableCount = previewData
    ? previewData.validCount + previewData.warningCount
    : 0;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Status Notification Banner */}
      {banner && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-sm font-medium ${
            banner.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          <span>{banner.text}</span>
          <button
            type="button"
            onClick={() => dispatch(dismissBanner())}
            className="text-xs underline opacity-75 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Drag & Drop Upload Card */}
      <div className="app-card app-card-body">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Bulk Rollout Data Import
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Upload CSV or Excel (.xlsx) files mapping Site, NSO, Rack, Node,
              and target software versions.
            </p>
          </div>
          <a href="/api/v1/import/template" className="btn-secondary">
            <Download className="w-4 h-4" /> Download Sample CSV
          </a>
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            handleFileSelect(e.dataTransfer.files?.[0]);
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
            isDragging
              ? "border-blue-600 bg-blue-50/50"
              : "border-slate-300 hover:border-blue-500 hover:bg-slate-50"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx"
            className="hidden"
            onChange={(e) => {
              handleFileSelect(e.target.files?.[0]);
              e.target.value = "";
            }}
          />

          {validating ? (
            <div className="flex flex-col items-center">
              <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-3" />
              <p className="text-sm font-semibold text-slate-800">
                Validating file...
              </p>
            </div>
          ) : (
            <>
              <UploadCloud className="w-10 h-10 text-blue-600 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-800">
                {fileName ||
                  "Drag & drop your CSV / Excel file here, or click to browse"}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Columns: cr_number, site_code, site_name, region, nso,
                rack_name, node_name, node_type, current_version, target_version
              </p>
            </>
          )}
        </div>
      </div>

      {/* Validation Preview Table */}
      {previewData && (
        <div className="app-card overflow-hidden">
          <div className="app-card-header flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="w-5 h-5 text-blue-600" />
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Pre-Import Validation Preview — {fileName}
                </h3>
                <p className="text-xs text-slate-500">
                  {previewData.totalRows} total rows parsed
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <span className="badge-success">
                Valid: {previewData.validCount}
              </span>
              <span className="badge-warning">
                Warnings: {previewData.warningCount}
              </span>
              <span className="badge-danger">
                Errors: {previewData.errorCount}
              </span>
            </div>
          </div>

          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Row</th>
                  <th>Site (Code / Name)</th>
                  <th>NSO</th>
                  <th>Rack</th>
                  <th>Node Name</th>
                  <th>Type</th>
                  <th>Version Upgrade</th>
                  <th>Validation</th>
                  <th>Message</th>
                </tr>
              </thead>
              <tbody>
                {previewData.rows.map((row) => (
                  <tr
                    key={row.rowNumber}
                    className={
                      row.validationStatus === "ERROR" ? "bg-red-50/40" : ""
                    }
                  >
                    <td className="font-mono text-xs text-slate-400">
                      #{row.rowNumber}
                    </td>
                    <td>
                      <div className="font-semibold text-slate-900">
                        {row.siteCode}
                      </div>
                      <div className="text-xs text-slate-500">
                        {row.siteName || "—"}
                      </div>
                    </td>
                    <td className="text-xs font-mono text-slate-600">
                      {row.nso || "—"}
                    </td>
                    <td className="font-semibold text-slate-800">
                      {row.rackName}
                    </td>
                    <td className="font-mono font-bold text-slate-900">
                      {row.nodeName}
                    </td>
                    <td>
                      <span className="badge-neutral">{row.nodeType}</span>
                    </td>
                    <td className="font-mono text-xs">
                      {row.currentVersion || "—"} →{" "}
                      <span className="text-blue-700 font-semibold">
                        {row.targetVersion}
                      </span>
                    </td>
                    <td>{renderValidationBadge(row.validationStatus)}</td>
                    <td className="text-xs text-slate-600">{row.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Sticky Footer Action Bar */}
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <p className="text-xs text-slate-500">
              {previewData.errorCount > 0
                ? `${previewData.errorCount} row(s) have errors and will be skipped during import.`
                : "All rows passed validation checks."}
            </p>

            <div className="flex items-center gap-3">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => dispatch(resetImport())}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={committing || importableCount === 0}
                onClick={() =>
                  dispatch(commitImportRows({ rows: previewData.rows }))
                }
              >
                {committing
                  ? "Importing..."
                  : `Import ${importableCount} Valid Row${importableCount === 1 ? "" : "s"}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Validation & Import History Log */}
      {historyLogs.length > 0 && (
        <div className="app-card overflow-hidden">
          <div className="app-card-header">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Validation &amp; Import History Logs
              </h3>
            </div>
          </div>

          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Stage</th>
                  <th>File Name</th>
                  <th>Summary</th>
                  <th className="text-right">Report</th>
                </tr>
              </thead>
              <tbody>
                {historyLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="text-xs font-mono text-slate-500">
                      {log.timestamp}
                    </td>
                    <td>
                      <span
                        className={
                          log.stage === "IMPORT_COMMIT"
                            ? "badge-success"
                            : "badge-neutral"
                        }
                      >
                        {log.stage === "IMPORT_COMMIT"
                          ? "Committed to DB"
                          : "Validation Run"}
                      </span>
                    </td>
                    <td className="font-semibold text-slate-800">
                      {log.fileName}
                    </td>
                    <td className="text-xs text-slate-600">{log.summary}</td>
                    <td className="text-right">
                      <button
                        type="button"
                        onClick={() => downloadLogCsv(log)}
                        className="btn-secondary text-xs py-1 px-2.5 inline-flex items-center gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5" /> Download CSV
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
