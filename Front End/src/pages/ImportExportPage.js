import marylandFlag from "../assets/images/maryland-flag-header.jpg";
import { useEffect, useRef, useState } from "react";
import FilePreviewDialog from "../components/FilePreviewDialog.js";
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

  useEffect(() => () => { selectionVersion.current++; }, []);

  async function selectFile(event) {
    const file = event.target.files[0];
    event.target.value = "";
    if (!file) return;
    if (!/\.(csv|xlsx?)$/i.test(file.name)) {
      setFileMessage("Choose a CSV or Excel file.");
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
      setPreview({ file, sheets });
      setFileMessage("");
    } catch {
      if (version === selectionVersion.current) setFileMessage("Unable to preview this file. Check its format and try again.");
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
          <div className="transfer-workspace">
            {/* Add the export interface and connect its data handling here. */}
          </div>
        </section>
      </div>

      {preview && <FilePreviewDialog preview={preview} onCancel={() => setPreview(null)} onConfirm={() => {
        onHistoryChange((previous) => [{ id: crypto.randomUUID(), addedAt: new Date().toISOString(), file: preview.file }, ...previous]);
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
                <th scope="col">Download</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr><td colSpan={6} className="history-empty">No files added yet.</td></tr>
              ) : history.map(({ id, addedAt, file }) => (
                <tr key={id}>
                  <td><time dateTime={addedAt}>{historyDateFormat.format(new Date(addedAt))}</time></td>
                  <th scope="row" className="history-filename">{file.name}</th>
                  <td><span className="history-format">{file.name.split(".").pop().toUpperCase()}</span></td>
                  <td><button className="history-download" type="button"
                    aria-label={`Download ${file.name}`} onClick={() => downloadOriginal(file)}>Download</button></td>
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
