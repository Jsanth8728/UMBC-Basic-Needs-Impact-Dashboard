import { useMemo, useState } from "react";
import { departmentComparison, formatMeasure, sharedMeasures } from "../utils/dashboardData.js";
import "./DepartmentComparison.css";

const colors = ["#a67a05", "#007176", "#636466", "#da2128", "#000000"];
const monthLabel = month => new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en-US", { month: "short", year: "2-digit", timeZone: "UTC" });

export default function DepartmentComparison({ data, start, end }) {
  const [measureId, setMeasureId] = useState("");
  const [hidden, setHidden] = useState([]);
  const measures = useMemo(() => sharedMeasures(data, { start, end }), [data, start, end]);
  const measure = measures.find(item => item.id === measureId) || measures[0];
  const comparison = useMemo(() => departmentComparison(data, measure?.id, { start, end }), [data, measure?.id, start, end]);
  const series = comparison.series.filter(item => !hidden.includes(item.id));
  const { months } = comparison;
  const max = Math.max(1, ...series.flatMap(item => item.values.filter(value => value !== null)));
  const x = index => months.length === 1 ? 390 : 75 + index * 640 / (months.length - 1);
  const y = value => 220 - value / max * 175;
  const comparable = months.some((_, index) => series.filter(item => item.values[index] !== null).length >= 2);
  function toggle(id) { setHidden(items => items.includes(id) ? items.filter(item => item !== id) : [...items, id]); }

  return <section className="dashboard-panel comparison-panel" aria-labelledby="comparison-title">
    <div className="dashboard-panel-heading"><h2 id="comparison-title">{measure ? `${measure.label}: department comparison` : "Department comparison"}</h2>
      {measure && <label className="measure-control"><span className="dashboard-sr-only">Shared measure</span><select value={measure.id} onChange={event => setMeasureId(event.target.value)}>{measures.map(item => <option key={item.id} value={item.id}>{item.label} ({item.unit})</option>)}</select></label>}
    </div>
    {measure ? <>
      <div className="comparison-legend" role="group" aria-label="Departments to compare">{comparison.series.map(item => {
        const index = data.departments.findIndex(d => d.id === item.id);
        return <button type="button" key={item.id} aria-pressed={!hidden.includes(item.id)} onClick={() => toggle(item.id)}><span style={{ background: colors[index % colors.length] }} aria-hidden="true"/>{item.name}</button>;
      })}</div>
      {comparable ? <>
        <div className="comparison-unit">{measure.unit}</div>
        <svg className="dashboard-trend comparison-chart" viewBox="0 0 760 270" role="img" aria-label={`${measure.label} by department over time, in ${measure.unit}. Exact values in the data table below.`}>
          {[0,1,2,3,4].map(i => <g key={i}><line x1="75" x2="715" y1={45+i*43.75} y2={45+i*43.75} stroke="#e5e5e5" strokeDasharray="3 5"/><text x="62" y={49+i*43.75} textAnchor="end">{new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(max*(4-i)/4)}</text></g>)}
          {series.map(item => {
            const index = data.departments.findIndex(d => d.id === item.id);
            const color = colors[index % colors.length];
            let path = "";
            item.values.forEach((value, i) => { if (value !== null) path += `${i === 0 || item.values[i-1] === null ? "M" : "L"}${x(i)},${y(value)} `; });
            return <g key={item.id}><path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeDasharray={index % 3 === 0 ? undefined : index % 3 === 1 ? "8 4" : "3 4"}/>{item.values.map((value, i) => value !== null && <circle key={months[i]} cx={x(i)} cy={y(value)} r="4" fill={color} stroke="white" strokeWidth="1.5"><title>{item.name} · {monthLabel(months[i])}: {formatMeasure(value, measure)}</title></circle>)}</g>;
          })}
          {months.map((month, i) => (months.length <= 8 || i % Math.ceil(months.length/8) === 0 || i === months.length-1) && <text key={month} x={x(i)} y="253" textAnchor="middle">{monthLabel(month)}</text>)}
        </svg>
        <details className="comparison-data"><summary>View data</summary><div className="comparison-table-scroll"><table><caption className="dashboard-sr-only">{measure.label} by month and department ({measure.unit})</caption><thead><tr><th scope="col">Month</th>{series.map(item => <th scope="col" key={item.id}>{item.name}</th>)}</tr></thead><tbody>{months.map((month, index) => <tr key={month}><th scope="row">{monthLabel(month)}</th>{series.map(item => <td key={item.id}>{item.values[index] === null ? <span aria-label="Not reported">—</span> : formatMeasure(item.values[index], measure)}</td>)}</tr>)}</tbody></table></div></details>
      </> : <p className="comparison-empty">Select departments with overlapping reporting months.</p>}
    </> : <p className="comparison-empty">No shared measures in this period.</p>}
  </section>;
}
