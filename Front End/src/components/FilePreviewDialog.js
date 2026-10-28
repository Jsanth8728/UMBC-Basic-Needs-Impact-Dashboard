import { useEffect, useRef, useState } from "react";

export default function FilePreviewDialog({ preview, onCancel, onConfirm }) {
  const dialogRef = useRef(null);
  const [sheetIndex, setSheetIndex] = useState(() => Math.max(0, preview.sheets.findIndex((sheet) => sheet.rows.length)));
  const sheet = preview.sheets[sheetIndex];

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return (
    <dialog className="file-preview-dialog" ref={dialogRef} aria-labelledby="preview-title"
      aria-describedby="preview-filename" onCancel={(event) => { event.preventDefault(); onCancel(); }}>
      <div className="preview-heading">
        <h2 id="preview-title">Does this data look right?</h2>
        <p id="preview-filename">{preview.file.name}</p>
      </div>
      {preview.sheets.length > 1 && <label className="preview-sheet-label">Sheet
        <select value={sheetIndex} onChange={(event) => setSheetIndex(Number(event.target.value))}>
          {preview.sheets.map(({ name }, index) => <option value={index} key={index}>{name}</option>)}
        </select>
      </label>}
      <p className="preview-limit">First 10 rows, up to 12 columns.</p>
      <div className="preview-table-scroll" tabIndex={0} role="region" aria-label="File preview">
        <table className="history-table preview-table">
          <thead><tr><th scope="col">Row</th>{sheet.columns.map((column) => <th scope="col" key={column}>{column}</th>)}</tr></thead>
          <tbody>{sheet.rows.length ? sheet.rows.map(({ number, cells }) => <tr key={number}>
            <th scope="row">{number}</th>{cells.map((cell, index) => <td key={index}>{cell}</td>)}
          </tr>) : <tr><td>This sheet is empty.</td></tr>}</tbody>
        </table>
      </div>
      <div className="preview-actions">
        <button className="history-download" type="button" autoFocus onClick={onCancel}>Cancel</button>
        <button className="import-button" type="button"
          disabled={!sheet.rows.some((row) => row.cells.some((value) => value.trim()))} onClick={onConfirm}>Looks good</button>
      </div>
    </dialog>
  );
}
