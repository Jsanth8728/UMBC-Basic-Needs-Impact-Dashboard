import { read, utils, write } from "xlsx";

export function convertSpreadsheet(buffer, sourceExtension, format) {
  if (!["csv", "xlsx"].includes(format)) throw new Error("Choose CSV or Excel.");
  const input = sourceExtension === "csv"
    ? new TextDecoder("utf-8", { fatal: true }).decode(buffer)
    : new Uint8Array(buffer);
  // Export the complete workbook, rather than the truncated preview.
  const workbook = read(input, { type: sourceExtension === "csv" ? "string" : "array", raw: true, cellHTML: false, cellFormula: false });
  if (!workbook.SheetNames.length) throw new Error("No sheets available to export.");
  if (format === "csv") {
    const csv = utils.sheet_to_csv(workbook.Sheets[workbook.SheetNames[0]]);
    return { bytes: new TextEncoder().encode("\uFEFF" + csv), mime: "text/csv;charset=utf-8" };
  }
  return { bytes: write(workbook, { bookType: "xlsx", type: "array" }), mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" };
}
