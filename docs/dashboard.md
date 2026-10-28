# Impact dashboard

The dashboard requests `GET /api/dashboard` on load and on Refresh. Vite proxies `/api` to localhost:8000 during development;
the existing Nginx configuration proxies it to the backend in Docker.

The backend currently returns `configured: false` and empty arrays. No database
schema or migration is assumed. The dashboard displays only API results.
Missing records are not treated as real zeroes.

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

Before connecting actual data, implement authentication and department permissions
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

Run `npm test` and `npm run build` in `Front End`.
