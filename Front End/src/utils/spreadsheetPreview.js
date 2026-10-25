import { read, utils } from "xlsx";

export function createSpreadsheetPreview(buffer, extension) {
  const bytes = new Uint8Array(buffer);
  let input = bytes;
  if (extension === "csv") {
    input = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    if (input.includes("\0")) throw new Error("Choose a valid CSV file.");
  } else {
    const zip = bytes[0] === 0x50 && bytes[1] === 0x4b;
    const ole = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1].every((value, index) => bytes[index] === value);
    const legacy = bytes[0] === 0x09 && [0x00, 0x02, 0x04, 0x08].includes(bytes[1]);
    if (extension === "xlsx" ? !zip : !(ole || legacy)) throw new Error("Choose a valid Excel workbook.");
  }

  const workbook = read(input, {
    type: extension === "csv" ? "string" : "array",
    sheetRows: 10, raw: true, cellHTML: false, cellFormula: false,
  });
  const sheets = workbook.SheetNames.map((name) => {
    const sheet = workbook.Sheets[name];
    if (!sheet["!ref"]) return { name, columns: [], rows: [] };
    const range = utils.decode_range(sheet["!ref"]);
    range.e.c = Math.min(range.e.c, range.s.c + 11);
    range.e.r = Math.min(range.e.r, range.s.r + 9);
    const columns = Array.from({ length: range.e.c - range.s.c + 1 }, (_, index) => utils.encode_col(range.s.c + index));
    const rows = utils.sheet_to_json(sheet, { header: 1, range, raw: false, defval: "", blankrows: true })
      .map((cells, index) => ({ number: range.s.r + index + 1, cells: columns.map((_, column) => String(cells[column] ?? "")) }));
    return { name, columns, rows };
  });
  if (!sheets.some((sheet) => sheet.rows.some((row) => row.cells.some((value) => value.trim())))) {
    throw new Error("This file has no data to preview.");
  }
  return sheets;
}
