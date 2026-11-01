import marylandFlag from "../assets/images/maryland-flag-header.jpg";
import { useEffect, useRef, useState } from "react";
import FilePreviewDialog from "../components/FilePreviewDialog.js";
import "./ImportExportPage.css";

const historyDateFormat = new Intl.DateTimeFormat(undefined, {
  year: "numeric", month: "short", day: "numeric",
  hour: "numeric", minute: "2-digit", second: "2-digit", timeZoneName: "short",
});

const tables = ["groups", "account", "meetings", "attends", "part_of"];
const requiredColumns = {
  groups: "organization_id, name, organization_type",
  account: "student_id, first_name, last_name, email, acc_role, expire_date",
  meetings: "meeting_id, organization_id, meeting_name, event_type, starts_at, loc",
  attends: "student_id, meeting_id",
  part_of: "student_id, organization_id",
};

export default function ImportExportPage() {
  const fileInputRef = useRef(null);
  const [fileMessage, setFileMessage] = useState("");
  const [preview, setPreview] = useState(null);
  const [reading, setReading] = useState(false);
  const [table, setTable] = useState("groups");
  const [exportTable, setExportTable] = useState("groups");
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyStatus, setHistoryStatus] = useState("loading");
  const [historyVersion, setHistoryVersion] = useState(0);
  const selectionVersion = useRef(0);

  useEffect(() => () => { selectionVersion.current++; }, []);

  useEffect(() => {
    const controller = new AbortController();
    setHistoryStatus("loading");
    async function loadHistory() {
      try {
        const response = await fetch("/api/files", { signal: controller.signal, cache: "no-store" });
        if (!response.ok) throw new Error("History unavailable");
        const files = await response.json();
        if (!Array.isArray(files) || files.some(file =>
          typeof file.filename !== "string" || !Number.isFinite(Date.parse(file.addedAt))
        )) throw new Error("Invalid history response");
        if (!controller.signal.aborted) {
          setHistory(files);
          setHistoryStatus("ready");
        }
      } catch {
        if (!controller.signal.aborted) setHistoryStatus("error");
      }
    }
    loadHistory();
    return () => controller.abort();
  }, [historyVersion]);

  async function selectFile(event) {
    const file = event.target.files[0];
    event.target.value = "";
    if (!file) return;
    if (!/\.csv$/i.test(file.name)) {
      setFileMessage("Choose a CSV file.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setFileMessage("Choose a file under 10 MB.");
      return;
    }
    const version = ++selectionVersion.current;
    setReading(true);
    setFileMessage("Preparing preview...");
    try {
      const [{ createSpreadsheetPreview }, buffer] = await Promise.all([
        import("../utils/spreadsheetPreview.js"), file.arrayBuffer(),
      ]);
      const sheets = createSpreadsheetPreview(buffer, file.name.split(".").pop().toLowerCase());
      if (version !== selectionVersion.current) return;
      setPreview({ file, sheets, table });
      setFileMessage("");
    } catch {
      if (version === selectionVersion.current) setFileMessage("Unable to preview this file. Check its format and try again.");
    } finally {
      if (version === selectionVersion.current) setReading(false);
    }
  }

  async function confirmImport() {
    if (saving) return;
    const selected = preview;
    setPreview(null);
    setSaving(true);
    setFileMessage("Importing into database...");
    try {
      const form = new FormData();
      form.append("file", selected.file);
      const response = await fetch(`/api/import/${selected.table}`, { method: "POST", body: form });
      const result = await response.json();
      if (!response.ok) throw new Error(result.detail || "Import failed.");
      setHistoryVersion(version => version + 1);
      setFileMessage(`Imported ${result.rows} rows into ${result.table}. Return Home to see the updated dashboard.`);
    } catch (error) {
      setFileMessage(error.message || "Import failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="transfer-page">
      <div className="transfer-heading">
        <img className="transfer-flag" src={marylandFlag} alt="" />
        <div className="transfer-heading-text">
          <p className="page-eyebrow">UMBC Basic Needs</p>
          <h1>Import / Export</h1>
        </div>
      </div>

      <div className="transfer-layout">
        <section className="transfer-card" aria-labelledby="import-title">
          <h2 id="import-title">Import data</h2>
          <div className="transfer-workspace import-workspace">
            <label>Destination table <select value={table} disabled={reading || saving} onChange={event => setTable(event.target.value)}>
              {tables.map(name => <option key={name}>{name}</option>)}
            </select></label>
            <p className="import-file-hint">Required columns: {requiredColumns[table]}</p>
            <p className="import-file-hint">Import groups and accounts before meetings and attendance. Existing IDs are updated.</p>
            <button className="import-button" type="button" aria-describedby="import-file-types"
              disabled={reading || saving} onClick={() => fileInputRef.current?.click()}>Import CSV</button>
            <p id="import-file-types" className="import-file-hint">UTF-8 CSV, up to 10 MB</p>
            <input ref={fileInputRef} type="file" hidden accept=".csv"
              aria-label="Choose CSV file" onChange={selectFile} />
            <p className="import-file-status" role="status">{fileMessage}</p>
          </div>
        </section>

        <section className="transfer-card" aria-labelledby="export-title">
          <h2 id="export-title">Export data</h2>
          <div className="transfer-workspace export-workspace">
            <label>Source table <select value={exportTable} onChange={event => setExportTable(event.target.value)}>
              {tables.map(name => <option key={name}>{name}</option>)}
            </select></label>
            <a className="import-button" href={`/api/export/${exportTable}`} download>Download CSV</a>
            <p className="import-file-hint">Downloads current database rows. An empty table gives you a header template.</p>
          </div>
        </section>
      </div>

      {preview && <FilePreviewDialog preview={preview} onCancel={() => setPreview(null)} onConfirm={confirmImport} />}

      <section className="transfer-card file-history" aria-labelledby="history-title">
        <h2 id="history-title">Saved imports</h2>
        <p className="import-file-hint">Reimporting the same filename replaces its saved copy and upload date.</p>
        {historyStatus === "loading" && <p role="status">Loading saved imports...</p>}
        {historyStatus === "error" && <p role="alert">Unable to load saved imports.{" "}
          <button type="button" className="history-download" onClick={() => setHistoryVersion(version => version + 1)}>Retry</button>
        </p>}
        <div className="history-table-scroll" role="region" aria-label="File history" tabIndex={0}>
          <table className="history-table">
            <thead>
              <tr>
                <th scope="col">Added</th>
                <th scope="col">File name</th>
                <th scope="col">Format</th>
                <th scope="col">Download</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 && historyStatus === "ready" ? (
                <tr><td colSpan={5} className="history-empty">No files added yet.</td></tr>
              ) : history.map(({ filename, addedAt }) => (
                <tr key={filename}>
                  <td><time dateTime={addedAt}>{historyDateFormat.format(new Date(addedAt))}</time></td>
                  <th scope="row" className="history-filename">{filename}</th>
                  <td><span className="history-format">{filename.split(".").pop().toUpperCase()}</span></td>
                  <td><a className="history-download" href={`/api/files/download?filename=${encodeURIComponent(filename)}`}
                    aria-label={`Download ${filename}`} download={filename}>Download</a></td>
                  <td>Completed</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
