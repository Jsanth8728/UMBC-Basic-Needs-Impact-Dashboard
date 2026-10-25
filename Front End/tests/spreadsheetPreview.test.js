import test from "node:test";
import assert from "node:assert/strict";
import { utils, write } from "xlsx";
import { createSpreadsheetPreview } from "../src/utils/spreadsheetPreview.js";

test("CSV preview preserves quoted commas, line breaks, and leading zeros", () => {
  const buffer = new TextEncoder().encode('Name,Value\r\n"Meals, donated",0012\r\n"Two\nlines",0');
  const [sheet] = createSpreadsheetPreview(buffer, "csv");
  assert.deepEqual(sheet.rows[1].cells, ["Meals, donated", "0012"]);
  assert.deepEqual(sheet.rows[2].cells, ["Two\nlines", "0"]);
});

for (const extension of ["xls", "xlsx"]) {
  test(`${extension} preview reads multiple sheets and limits rows and columns`, () => {
    const book = utils.book_new();
    const data = Array.from({ length: 20 }, (_, row) => Array.from({ length: 20 }, (_, column) => `${row}:${column}`));
    utils.book_append_sheet(book, utils.aoa_to_sheet(data), "Measures");
    utils.book_append_sheet(book, utils.aoa_to_sheet([["Other", 25]]), "Other");
    const sheets = createSpreadsheetPreview(write(book, { type: "buffer", bookType: extension === "xls" ? "biff8" : "xlsx" }), extension);
    assert.deepEqual(sheets.map((sheet) => sheet.name), ["Measures", "Other"]);
    assert.equal(sheets[0].rows.length, 10);
    assert.equal(sheets[0].columns.length, 12);
    assert.equal(sheets[0].rows[9].cells[11], "9:11");
    assert.equal(sheets[1].rows[0].cells[1], "25");
  });
}

test("empty files and text renamed as Excel are rejected", () => {
  const bytes = new TextEncoder().encode("Name,Value\nFood,10");
  assert.throws(() => createSpreadsheetPreview(bytes, "xlsx"), /valid Excel/);
  assert.throws(() => createSpreadsheetPreview(bytes, "xls"), /valid Excel/);
  assert.throws(() => createSpreadsheetPreview(new Uint8Array(), "csv"), /no data/);
});
