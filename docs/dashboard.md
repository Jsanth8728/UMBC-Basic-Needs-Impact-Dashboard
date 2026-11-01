# Impact dashboard

The dashboard requests `GET /api/dashboard` on load and on Refresh. Vite proxies `/api` to localhost:8000 during development;
the existing Nginx configuration proxies it to the backend in Docker.

The backend queries the existing tables defined in `database.sql` and
`backend/models.py`. The dashboard displays only API results. Missing records
are not treated as real zeroes.

## Basic CSV workflow

Start the existing Docker Compose stack with `POSTGRES_USER`,
`POSTGRES_PASSWORD`, and `POSTGRES_DB` set in a root `.env` file, then run
`docker compose up --build`. Open `http://localhost:5173/HomePage.html`.
The database initialization script runs only when the Postgres volume is first
created; this change does not replace or reset an existing database.

For development without Docker, provision PostgreSQL using `database.sql`,
install `backend/requirements.txt`, set `DATABASE_URL` to
`postgresql+psycopg://USER:PASSWORD@localhost:5432/DATABASE`, and run
`python -m uvicorn main:app --reload` from `backend`. Run `npm.cmd run dev`
from `Front End` in a second terminal.

In Import / Export, choose a destination table, select a UTF-8 CSV, review the
preview, and confirm. Each file targets one table and uses exact database column
names. Excel import is not implemented. Sample files are in `examples/csv/`.
Import them in this order:

1. `groups.csv`
2. `account.csv`
3. `meetings.csv`
4. `attends.csv`
5. `part_of.csv` (optional membership data; not used for dashboard totals)

Choose the matching destination table for each file. Referenced IDs must already
exist. Existing primary keys update the columns present in the file; new keys
insert rows. Reimporting a file does not duplicate records or delete other rows.
Blank fields mean null; omit columns to use database defaults on insert or keep
their existing values on update. Use ISO timestamps with timezone offsets,
`true`/`false` for booleans, and numeric values without units.
Imports are committed as one transaction. On failure, none of that file's rows
are saved. The original upload is also stored in the existing `files` table,
replacing the stored upload if its filename already exists. Saved imports load
from the database when the Import / Export page opens, including after a browser
refresh. Each entry shows the latest upload date for that filename and offers
a download of the original CSV bytes. This is a list of saved files, not an audit
log of every import attempt. Failed imports do not appear.

Return Home after import to fetch the latest dashboard, or use Refresh on Home.
With just the sample CSVs, Demo Student Support reports 1 event, 1 attended visit,
25 lb of food, and 2 event hours in October 2026. Existing database rows continue
to contribute their own totals.

Export downloads the selected table's current rows, including headers. Empty
tables produce header templates. Exports can be reimported. Supported endpoints:

- `POST /api/import/{table}`, multipart field `file`
- `GET /api/export/{table}`
- `GET /api/dashboard`
- `GET /api/files` (saved import filenames and upload dates, newest first)
- `GET /api/files/download?filename=...` (original saved upload)

Supported tables: `groups`, `account`, `meetings`, `attends`, `part_of`.
Administrator credentials and file-transfer administration are outside this flow.

This is a local prototype: authentication and department permissions are not
implemented. Account exports include the selected table's personal information.
Connect access controls before deploying it for real student records.

## Current dashboard measures

The existing API field names `departments` and `departmentId` are retained,
but represent organizations from `groups`, not students' academic departments.
The interface labels them organizations. Measures are grouped by the meeting's
organization and UTC start month:

- Meetings / events: number of meeting rows, including future scheduled events.
- Attended visits: attendance rows with status `attended`; repeat visits count
  separately. This is not a unique student count.
- Food (lb): sum of meeting `food_lb`, counted once per meeting.
- Event hours: sum of meeting `duration`, interpreted as hours, once per meeting.

Unknown food or duration values are omitted rather than converted to zero.
Attendance counts do not multiply food or duration. Accounts and memberships
alone do not create event totals. All dates are included until the user selects
a month range. Student identities never appear in the dashboard response.
The schema has no stories table, so stories are empty and their section is hidden.
`updatedAt` is the response generation time, not a stored data modification time.

## Response contract

The department comparison section uses the global month range and its own
department toggle buttons; the Overview department selector applies to the
overview cards and charts. Only measures reported by two or more departments
in at least one common month are offered for comparison. Each department has
its own overlaid line and can be toggled in the legend. The expandable table
shows exact values, including explicit zeroes and unreported values.

Shared measure IDs must represent identical definitions, units, and reporting
granularity across sources. Different units or meanings must have separate IDs,
even when source labels are the same. No automatic unit conversions or label
matching are performed. Missing monthly records break the line instead of
implying zero or interpolating through missing periods. The backend must only
return departments and aggregates the current user is authorized to compare.

```json
{
  "configured": true,
  "updatedAt": "2026-10-23T16:00:00Z",
  "departments": [{ "id": "example", "name": "Example office" }],
  "measures": [{ "id": "visits", "label": "Service visits", "unit": "visits" }],
  "records": [{ "departmentId": "example", "month": "2026-10", "measureId": "visits", "value": 120 }],
  "stories": [{ "id": "story-1", "departmentId": "example", "month": "2026-10", "quote": "Approved text", "attribution": "Anonymous student", "approved": true }]
}
```

Metric cards and chart titles use the measure labels in the response. No sample
metric cards are shown when the response contains no measures.

Measures and departments come from the response; the UI does not require fixed
office names or a fixed number of metrics. `USD` units use currency formatting.
Missing records display a dash, while explicit zero values display zero.
From and Through are inclusive reporting months; all cards, charts, and stories
follow the same date and department filters. Blank dates include all months.
Records must represent additive monthly aggregates. Do not send overlapping
totals, student-level rows, or non-additive distinct-student counts. Deduplication
and source mapping belong in the backend after departmental formats are approved.

Before deploying with real student data, implement authentication and department permissions
on the server, query only authorized aggregates, and return only approved,
consented, de-identified stories with approved display attributions. Client filters
and the client approval check do not provide access control. This pass implements
story display; authoring, approval, and account administration remain future work.

## References reviewed

- [SRS v2](https://docs.google.com/document/d/1xkzzrA1lFRJjvdki9CWNtpO8dBv2_TloXRgDHYw4fd4/edit)
- [SDD](https://docs.google.com/document/d/1M1-e4AUjfAxXnYA3L8qJd0mHoPcSSziSeA9DNruzHVI/edit)
- [Meeting notes](https://docs.google.com/document/d/1kKXOPf11-XLBkQlpzniyBlqzNdKA-wEQQYaIJgCNpj0/edit)
- [UMBC colors](https://styleguide.umbc.edu/umbc-colors/): black #000000,
  gold #fdb515, secondary teal #007176 and gray #636466.

Run `npm.cmd run build` in `Front End`. To run the backend integration tests,
install `backend/requirements-dev.txt` and run
`python -m unittest discover -s backend/tests -v` from the repository root.
These use an isolated SQLite database with foreign keys enabled and never change
the configured PostgreSQL database. They cover imports, updates, rollback,
exports, reimporting, and dashboard totals; PostgreSQL deployment needs a separate
check against the running Compose stack.
