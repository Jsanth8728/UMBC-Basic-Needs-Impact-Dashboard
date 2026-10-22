# Import / Export page

The page is a layout scaffold for a teammate to implement. Import and Export
are displayed together, side by side on desktop and stacked on smaller screens.
Import has a file-selection button accepting `.csv`, `.xls`, and `.xlsx` up to
10 MB. Selection opens a native modal dialog with a read-only preview of the
first 10 rows and up to 12 columns, plus a sheet selector for multi-sheet Excel
files. Cancel/Escape discards the selection; Looks good adds the original file
to history. Its code comment marks where confirmed import processing belongs.
Export lets users select a Good file from history and download CSV or Excel
(.xlsx). CSV includes the first sheet; Excel includes all sheets. Conversion
uses the complete source file, not the preview, and exports cached cell values
rather than active formulas. Both workspaces have compact heights.

File history appears below both sections. Confirmed file selections are held in
the parent component's React state, with selection time, filename, extension,
and a download of the original File bytes. History survives page navigation
but clears on refresh. Download URLs are created on demand and revoked after
use. Times are displayed in the browser's local timezone. These are selections,
not confirmed server uploads; the page labels that distinction.

`Front End/ImportExportPage.js` contains the layout and imports the existing
Maryland flag image through Vite. `Front End/ImportExportPage.css` styles only
the heading, flag, cards, controls, history, and preview. The heading uses a dark
gradient over the flag to keep the title readable with UMBC gold accents.

Preview parsing uses SheetJS 0.20.3 from its [official distribution](https://docs.sheetjs.com/docs/getting-started/installation/frameworks/), bundled locally and loaded only when a file is selected. Files are never sent to a third-party service.

There are no server uploads, manual-entry forms, business-rule validation,
report exports, filters, aggregate session records, or backend calls. Preview
confirmation is visual approval, not validation of the entire dataset.

History now shows a row as soon as a file is selected: Processing during the
read, Review while awaiting preview confirmation, Good after Looks good, or
Failed for unsupported, oversized, empty, or unreadable files. Failed rows show
a short reason. Cancelling the preview or leaving during processing removes
the pending row. The User column is unassigned until account integration exists.

Future implementation should use the meeting notes, SRS, and SDD to finalize
source layouts, export formats, data handling, and permissions.

Run tests from `Front End` with `node --test spreadsheetPreview.test.js spreadsheetExport.test.js`,
then build with `npm run build`. Rebuild Docker from the repository
root with `docker compose up --build -d --no-deps frontend`.
