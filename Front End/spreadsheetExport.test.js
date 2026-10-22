import test from "node:test";
import assert from "node:assert/strict";
import { read, utils, write } from "xlsx";
import { convertSpreadsheet } from "./spreadsheetExport.js";

test("Excel export includes complete CSV data beyond preview limits", () => {
  const csv = "Name,Value\n" + Array.from({ length: 25 }, (_, index) => `Measure ${index},${index}`).join("\n");
  const result = convertSpreadsheet(new TextEncoder().encode(csv), "csv", "xlsx");
  const workbook = read(result.bytes, { type: "array" });
  const rows = utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 });
  assert.equal(rows.length, 26);
  assert.equal(rows[25][0], "Measure 24");
});

test("CSV uses first sheet while Excel retains all sheets", () => {
  const book = utils.book_new();
  utils.book_append_sheet(book, utils.aoa_to_sheet([["Measure", "Value"], ["Meals, donated", 10]]), "Meals");
  utils.book_append_sheet(book, utils.aoa_to_sheet([["Visits", 20]]), "Visits");
  const input = write(book, { type: "array", bookType: "xlsx" });
  const csv = new TextDecoder().decode(convertSpreadsheet(input, "xlsx", "csv").bytes);
  assert.match(csv, /"Meals, donated",10/);
  assert.doesNotMatch(csv, /Visits/);
  const excel = read(convertSpreadsheet(input, "xlsx", "xlsx").bytes, { type: "array" });
  assert.deepEqual(excel.SheetNames, ["Meals", "Visits"]);
});
