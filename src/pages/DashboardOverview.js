import { useEffect, useMemo, useState } from "react";
import { fetchDashboard, formatMeasure, selectDashboard } from "../utils/dashboardData.js";
import MonthPicker from "../components/MonthPicker.js";
import DepartmentComparison from "../components/DepartmentComparison.js";
import "./DashboardOverview.css";

const empty = { configured: false, departments: [], measures: [], records: [], stories: [] };
const monthLabel = month => new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en-US", { month: "short", year: "2-digit", timeZone: "UTC" });

function Trend({ months, values, measure }) {
  const max = Math.max(1, ...values);
  const x = i => months.length === 1 ? 390 : 65 + i * 650 / (months.length - 1);
  const y = value => 220 - value / max * 175;
  const points = values.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  return <svg className="dashboard-trend" viewBox="0 0 760 270" role="img" aria-label={`${measure.label}: ${months.map((m, i) => `${monthLabel(m)} ${formatMeasure(values[i], measure)}`).join(", ")}`}>
    <defs><linearGradient id="impact-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fdb515" stopOpacity=".3"/><stop offset="1" stopColor="#fdb515" stopOpacity=".02"/></linearGradient></defs>
    {[0,1,2,3,4].map(i => <g key={i}><line x1="65" x2="715" y1={45+i*43.75} y2={45+i*43.75} stroke="#e5e5e5" strokeDasharray="3 5"/><text x="53" y={49+i*43.75} textAnchor="end">{new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(max*(4-i)/4)}</text></g>)}
    <polygon points={`${x(0)},220 ${points} ${x(months.length-1)},220`} fill="url(#impact-fill)"/>
    <polyline points={points} fill="none" stroke="#a67a05" strokeWidth="3" strokeLinejoin="round"/>
    {values.map((v, i) => <g key={months[i]}><circle cx={x(i)} cy={y(v)} r="5" fill="#fdb515" stroke="white" strokeWidth="2"><title>{monthLabel(months[i])}: {formatMeasure(v, measure)}</title></circle>{(months.length <= 8 || i % Math.ceil(months.length / 8) === 0 || i === months.length-1) && <text x={x(i)} y="253" textAnchor="middle">{monthLabel(months[i])}</text>}</g>)}
  </svg>;
}

export default function DashboardOverview() {
  const [remote, setRemote] = useState(empty);
  const [status, setStatus] = useState("loading");
  const [reload, setReload] = useState(0);
  const [department, setDepartment] = useState("all");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [measureId, setMeasureId] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    setStatus("loading");
    const timeout = setTimeout(() => { setStatus("error"); controller.abort(); }, 15000);
    fetchDashboard(controller.signal).then(data => { if (!controller.signal.aborted) { setRemote(data); setStatus("ready"); } }).catch(error => { if (error.name !== "AbortError") setStatus("error"); }).finally(() => clearTimeout(timeout));
    return () => { clearTimeout(timeout); controller.abort(); };
  }, [reload]);
  const data = status === "ready" ? remote : empty;
  const invalidRange = Boolean(start && end && start > end);
  const view = useMemo(() => selectDashboard(data, { department, start, end }), [data, department, start, end]);
  const measure = data.measures.find(item => item.id === measureId) || data.measures[0];
  const measureRecords = view.records.filter(row => row.measureId === measure?.id);
  const months = [...new Set(measureRecords.map(row => row.month))].sort();
  const values = months.map(month => measureRecords.filter(row => row.month === month).reduce((sum, row) => sum + row.value, 0));
  const total = values.reduce((sum, v) => sum + v, 0);
  function reset() { setDepartment("all"); setStart(""); setEnd(""); }
  const cards = data.measures;
  const ready = status === "ready";
  const message = !ready ? (status === "loading" ? "Loading dashboard…" : "Unable to load dashboard.") : "No data for this selection.";
  return <div className="impact-dashboard" aria-busy={status === "loading"}>
    <div className="dashboard-heading"><div><p className="dashboard-eyebrow">UMBC · BASIC NEEDS</p><h1>Impact dashboard</h1></div></div>
    <div className="dashboard-filters"><label>Overview department<select value={department} onChange={e => setDepartment(e.target.value)}><option value="all">All departments</option>{data.departments.map(d => <option value={d.id} key={d.id}>{d.name}</option>)}</select></label><MonthPicker label="From" value={start} max={end || undefined} onChange={setStart}/><MonthPicker label="Through" value={end} min={start || undefined} onChange={setEnd}/><button type="button" className="dashboard-reset" onClick={reset}>Reset</button><button type="button" className="dashboard-button refresh-button" disabled={status === "loading"} onClick={() => setReload(v => v+1)}>Refresh</button></div>
    {invalidRange && <p className="dashboard-error" role="alert">Choose an end month on or after the start month.</p>}
    <section className="dashboard-stats" aria-label="Summary measures">{cards.map(card => {
      const hasData = view.records.some(row => row.measureId === card.id);
      return <article className="dashboard-stat" key={card.id}><div className="stat-label"><span>{card.label}</span></div><strong>{hasData ? formatMeasure(view.totals[card.id], card) : "—"}</strong></article>;
    })}<article className="dashboard-stat dark-stat"><div className="stat-label"><span>Reporting departments</span></div><strong>{view.records.length ? String(view.departments.length).padStart(2,"0") : "—"}</strong></article></section>
    <div className="dashboard-charts"><section className="dashboard-panel"><div className="dashboard-panel-heading"><div><h2>{measure ? `${measure.label} over time` : "Trends"}</h2></div>{measure && <label className="measure-control"><span className="dashboard-sr-only">Chart measure</span><select value={measure.id} onChange={e => setMeasureId(e.target.value)}>{data.measures.map(item => <option value={item.id} key={item.id}>{item.label}</option>)}</select></label>}</div>{months.length && !invalidRange ? <Trend months={months} values={values} measure={measure}/> : <div className="dashboard-empty"><span className="empty-chart-icon" aria-hidden="true">▥</span><p>{invalidRange ? "Check the selected dates." : message}</p></div>}</section>
    <section className="dashboard-panel"><div className="dashboard-panel-heading"><div><h2>{measure ? `${measure.label} by department` : "By department"}</h2></div></div><div className="dashboard-departments">{measureRecords.length && !invalidRange ? view.departments.filter(d => measureRecords.some(row => row.departmentId === d.id)).map((d,i) => { const value = measureRecords.filter(row => row.departmentId === d.id).reduce((sum,row) => sum + row.value,0); return <div className="department-row" key={d.id}><div><span><i className={`department-dot color-${i%3}`}/>{d.name}</span><strong>{formatMeasure(value,measure)}</strong></div><div className="department-track"><div className={`color-${i%3}`} style={{width:`${total ? value/total*100 : 0}%`}}/></div></div>; }) : <p className="distribution-empty">No departmental records.</p>}</div></section></div>
    <DepartmentComparison data={data} start={start} end={end}/>
    <section className="dashboard-panel stories-panel"><div className="dashboard-panel-heading"><div><h2>Student stories</h2></div></div><div className="dashboard-stories">{view.stories.length && !invalidRange ? view.stories.map(story => <figure key={story.id}><span className="story-quote-mark" aria-hidden="true">“</span><blockquote>{story.quote}</blockquote><figcaption><strong>{story.attribution}</strong><span>{data.departments.find(d => d.id === story.departmentId)?.name} · {monthLabel(story.month)}</span></figcaption></figure>) : <p className="stories-empty">No stories.</p>}</div></section>
  </div>;
}
