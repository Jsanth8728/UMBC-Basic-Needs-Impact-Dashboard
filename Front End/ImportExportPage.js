import marylandFlag from "./images/maryland-flag-header.jpg";
import { useEffect, useRef, useState } from "react";
import FilePreviewDialog from "./FilePreviewDialog.js";
import ExportPanel from "./ExportPanel.js";
import "./ImportExportPage.css";

const historyDateFormat = new Intl.DateTimeFormat(undefined, {
  year: "numeric", month: "short", day: "numeric",
  hour: "numeric", minute: "2-digit", second: "2-digit", timeZoneName: "short",
});

function downloadOriginal(file) {
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function ImportExportPage({ history, onHistoryChange }) {
  const fileInputRef = useRef(null);
  const [fileMessage, setFileMessage] = useState("");
  const [preview, setPreview] = useState(null);
  const [reading, setReading] = useState(false);
  const selectionVersion = useRef(0);
  const activeEntryId = useRef(null);

  useEffect(() => () => {
    selectionVersion.current++;
    const id = activeEntryId.current;
    if (id) onHistoryChange((previous) => previous.filter((entry) => entry.id !== id));
  }, [onHistoryChange]);

  function updateStatus(id, status, error = "") {
    onHistoryChange((previous) => previous.map((entry) => entry.id === id ? { ...entry, status, error } : entry));
  }

  async function selectFile(event) {
    const file = event.target.files[0];
    event.target.value = "";
    if (!file) return;
    const id = crypto.randomUUID();
    onHistoryChange((previous) => [{ id, addedAt: new Date().toISOString(), file, status: "processing", error: "" }, ...previous]);
    if (!/\.(csv|xlsx?)$/i.test(file.name)) {
      setFileMessage("Choose a CSV or Excel file.");
      updateStatus(id, "failed", "Choose a CSV or Excel file.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setFileMessage("Choose a file under 10 MB.");
      updateStatus(id, "failed", "File exceeds 10 MB.");
      return;
    }
    activeEntryId.current = id;
    const version = ++selectionVersion.current;
    setReading(true);
    setFileMessage("Preparing preview...");
    try {
      const [{ createSpreadsheetPreview }, buffer] = await Promise.all([
        import("./spreadsheetPreview.js"), file.arrayBuffer(),
      ]);
      const sheets = createSpreadsheetPreview(buffer, file.name.split(".").pop().toLowerCase());
      if (version !== selectionVersion.current) return;
      updateStatus(id, "review");
      setPreview({ id, file, sheets });
      setFileMessage("");
    } catch {
      if (version === selectionVersion.current) {
        const error = "Unable to read this file. Check its format and contents.";
        updateStatus(id, "failed", error);
        setFileMessage(error);
        activeEntryId.current = null;
      }
    } finally {
      if (version === selectionVersion.current) setReading(false);
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
            <button className="import-button" type="button" aria-describedby="import-file-types"
              disabled={reading} onClick={() => fileInputRef.current?.click()}>Import file</button>
            <p id="import-file-types" className="import-file-hint">CSV or Excel</p>
            <input ref={fileInputRef} type="file" hidden accept=".csv,.xls,.xlsx"
              aria-label="Choose CSV or Excel file" onChange={selectFile} />
            <p className="import-file-status" role="status">{fileMessage}</p>
          </div>
        </section>

        <section className="transfer-card" aria-labelledby="export-title">
          <h2 id="export-title">Export data</h2>
          <ExportPanel history={history} />
        </section>
      </div>

      {preview && <FilePreviewDialog preview={preview} onCancel={() => {
        onHistoryChange((previous) => previous.filter((entry) => entry.id !== preview.id));
        activeEntryId.current = null;
        setPreview(null);
      }} onConfirm={() => {
        updateStatus(preview.id, "good");
        activeEntryId.current = null;
        setFileMessage(preview.file.name);
        // Connect the confirmed file to import processing here.
        setPreview(null);
      }} />}

      <section className="transfer-card file-history" aria-labelledby="history-title">
        <h2 id="history-title">File history</h2>
        <div className="history-table-scroll" role="region" aria-label="File history" tabIndex={0}>
          <table className="history-table">
            <thead>
              <tr>
                <th scope="col">Added</th>
                <th scope="col">File name</th>
                <th scope="col">User</th>
                <th scope="col">Format</th>
                <th scope="col">Status</th>
                <th scope="col">Download</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr><td colSpan={6} className="history-empty">No files added yet.</td></tr>
              ) : history.map(({ id, addedAt, file, status = "good", error }) => (
                <tr key={id}>
                  <td><time dateTime={addedAt}>{historyDateFormat.format(new Date(addedAt))}</time></td>
                  <th scope="row" className="history-filename">{file.name}</th>
                  <td aria-label="User unavailable">&mdash;</td>
                  <td><span className="history-format">{file.name.split(".").pop().toUpperCase()}</span></td>
                  <td aria-live="polite">
                    <span className={`history-status status-${status}`}>
                      {{ processing: "Processing", review: "Review", failed: "Failed", good: "Good" }[status]}
                    </span>
                    {error && <span className="history-error">{error}</span>}
                  </td>
                  <td><button className="history-download" type="button"
                    aria-label={`Download ${file.name}`} onClick={() => downloadOriginal(file)}>Download</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
