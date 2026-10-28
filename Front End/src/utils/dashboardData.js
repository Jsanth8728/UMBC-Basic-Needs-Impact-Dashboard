export function validateDashboard(data) {
  if (!data || typeof data.configured !== "boolean" ||
      !["departments", "measures", "records", "stories"].every(key => Array.isArray(data[key]))) throw new Error("Invalid dashboard response.");
  const uniqueIds = items => items.every(item => typeof item.id === "string" && item.id) && new Set(items.map(item => item.id)).size === items.length;
  if (!uniqueIds(data.departments) || !uniqueIds(data.measures) ||
      data.departments.some(item => typeof item.name !== "string") ||
      data.measures.some(item => typeof item.label !== "string" || typeof item.unit !== "string")) throw new Error("Invalid dashboard definitions.");
  const departments = new Set(data.departments.map(item => item.id));
  const measures = new Set(data.measures.map(item => item.id));
  const month = value => typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
  if (data.records.some(row => !departments.has(row.departmentId) || !measures.has(row.measureId) || !month(row.month) || !Number.isFinite(row.value) || row.value < 0) ||
      data.stories.some(row => typeof row.id !== "string" || !departments.has(row.departmentId) || !month(row.month) || typeof row.quote !== "string" || typeof row.attribution !== "string" || typeof row.approved !== "boolean")) throw new Error("Invalid dashboard records.");
  return data;
}

export async function fetchDashboard(signal) {
  const response = await fetch("/api/dashboard", { signal, credentials: "same-origin", headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error("Dashboard unavailable.");
  return validateDashboard(await response.json());
}

export function selectDashboard(data, { department = "all", start = "", end = "" } = {}) {
  const matches = row => (department === "all" || row.departmentId === department) && (!start || row.month >= start) && (!end || row.month <= end);
  const records = data.records.filter(matches);
  return {
    records,
    totals: Object.fromEntries(data.measures.map(measure => [measure.id, records.filter(row => row.measureId === measure.id).reduce((sum, row) => sum + row.value, 0)])),
    departments: data.departments.filter(item => records.some(row => row.departmentId === item.id)),
    stories: data.stories.filter(row => row.approved === true && matches(row)),
  };
}

export function formatMeasure(value, measure) {
  return new Intl.NumberFormat("en-US", measure?.unit === "USD" ? { style: "currency", currency: "USD", maximumFractionDigits: 0 } : { maximumFractionDigits: 2 }).format(value);
}

// Shared IDs identify the same definition and unit across departments.
// Matching labels alone are not sufficient to establish comparability.
export function sharedMeasures(data, { start = "", end = "" } = {}) {
  const records = selectDashboard(data, { start, end }).records;
  return data.measures.filter(measure => {
    const departmentsByMonth = new Map();
    for (const row of records.filter(row => row.measureId === measure.id)) {
      if (!departmentsByMonth.has(row.month)) departmentsByMonth.set(row.month, new Set());
      departmentsByMonth.get(row.month).add(row.departmentId);
    }
    return [...departmentsByMonth.values()].some(departments => departments.size >= 2);
  });
}

export function departmentComparison(data, measureId, { start = "", end = "" } = {}) {
  const records = selectDashboard(data, { start, end }).records.filter(row => row.measureId === measureId);
  const reportedMonths = [...new Set(records.map(row => row.month))].sort();
  const months = [];
  if (reportedMonths.length) {
    const [firstYear, firstMonth] = reportedMonths[0].split("-").map(Number);
    const [lastYear, lastMonth] = reportedMonths.at(-1).split("-").map(Number);
    for (let index = firstYear * 12 + firstMonth - 1; index <= lastYear * 12 + lastMonth - 1; index++) {
      months.push(`${String(Math.floor(index / 12)).padStart(4, "0")}-${String(index % 12 + 1).padStart(2, "0")}`);
    }
  }
  const series = data.departments.filter(d => records.some(row => row.departmentId === d.id)).map(department => ({
    ...department,
    values: months.map(month => {
      const rows = records.filter(row => row.departmentId === department.id && row.month === month);
      return rows.length ? rows.reduce((sum, row) => sum + row.value, 0) : null;
    }),
  }));
  return { months, series };
}
