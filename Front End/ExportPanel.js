import { useState } from "react";

export default function ExportPanel({ history }) {
  const files = history.filter(({ status }) => status === "good");
  const [selectedId, setSelectedId] = useState("");
  const [format, setFormat] = useState("csv");
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState("");
  const combined = selectedId === "all";
  const selected = combined ? null : files.find(({ id }) => id === selectedId) || files[0];

  async function exportFile(event) {
    event.preventDefault();
    if (!selected || exporting) return;
    setExporting(true);
    setMessage("");
    try {
      const [{ convertSpreadsheet }, buffer] = await Promise.all([
        import("./spreadsheetExport.js"), selected.file.arrayBuffer(),
      ]);
      const result = convertSpreadsheet(buffer, selected.file.name.split(".").pop().toLowerCase(), format);
      const url = URL.createObjectURL(new Blob([result.bytes], { type: result.mime }));
      const link = document.createElement("a");
      link.href = url;
      link.download = selected.file.name.replace(/\.[^.]+$/, "") + "." + format;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage("Download started.");
    } catch {
      setMessage("Export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <form className="transfer-workspace export-workspace" onSubmit={exportFile}>
      <div className="export-controls">
        <label>File
          <select value={combined ? "all" : selected?.id || ""} disabled={exporting}
            onChange={(event) => { setSelectedId(event.target.value); setMessage(""); }}>
            {!files.length && <option value="">Confirm an import first</option>}
            <option value="all">All data (combined file)</option>
            {files.map(({ id, file }) => <option key={id} value={id}>{file.name}</option>)}
          </select>
        </label>
        <label>Format
          <select value={format} disabled={exporting} onChange={(event) => { setFormat(event.target.value); setMessage(""); }}>
            <option value="csv">CSV (.csv)</option>
            <option value="xlsx">Excel (.xlsx)</option>
          </select>
        </label>
        <button className="import-button" type="submit" disabled={!selected || exporting}>{exporting ? "Exporting..." : "Export"}</button>
      </div>
      <p className="import-file-hint">{combined ? "Combined export is not available yet." : format === "csv" ? "CSV exports the first sheet." : "Excel exports all sheets."}</p>
      <p className="import-file-status" role="status">{message}</p>
    </form>
  );
}
