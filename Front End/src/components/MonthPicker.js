import { useEffect, useId, useRef, useState } from "react";
import "./MonthPicker.css";

const monthNames = Array.from({ length: 12 }, (_, month) =>
  new Date(2000, month).toLocaleDateString("en-US", { month: "long" }));
const monthValue = (year, month) => `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}`;

export default function MonthPicker({ label, value, onChange, min = "0001-01", max = "9999-12" }) {
  const id = useId();
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const yearRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState("");
  const today = new Date();
  const current = monthValue(today.getFullYear(), today.getMonth() + 1);
  const anchor = value || (current < min ? min : current > max ? max : current);
  const [anchorYear, anchorMonth] = anchor.split("-").map(Number);
  const allowed = candidate => /^\d{4}-(0[1-9]|1[0-2])$/.test(candidate) && !candidate.startsWith("0000") && candidate >= min && candidate <= max;
  const shiftedMonth = delta => {
    const index = anchorYear * 12 + anchorMonth - 1 + delta;
    return monthValue(Math.floor(index / 12), index % 12 + 1);
  };
  const validYear = /^\d{1,4}$/.test(year) && Number(year) >= Number(min.slice(0, 4)) && Number(year) <= Number(max.slice(0, 4));

  useEffect(() => {
    if (!open) return;
    yearRef.current?.focus();
    function dismiss(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    }
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [open]);

  function close() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  return <div className="month-picker" ref={rootRef}
    onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}
    onKeyDown={event => {
      if (event.key === "Escape" && open) { event.preventDefault(); event.stopPropagation(); close(); }
    }}>
    <span className="month-picker-label" id={`${id}-label`}>{label}</span>
    <div className="month-picker-control" role="group" aria-labelledby={`${id}-label`}>
      <button type="button" className="month-picker-arrow" aria-label={`${label}: previous month`}
        disabled={!allowed(shiftedMonth(-1))} onClick={() => { onChange(shiftedMonth(-1)); setOpen(false); }}>‹</button>
      <button type="button" className="month-picker-trigger" ref={triggerRef}
        aria-label={`${label}: ${value ? `${monthNames[anchorMonth - 1]} ${anchorYear}` : "all months"}. Choose month and year`}
        aria-expanded={open} aria-haspopup="dialog" aria-controls={`${id}-calendar`}
        onClick={() => { if (!open) setYear(String(anchorYear)); setOpen(!open); }}>
        {value ? `${monthNames[anchorMonth - 1]} ${anchorYear}` : "All months"}
      </button>
      <button type="button" className="month-picker-arrow" aria-label={`${label}: next month`}
        disabled={!allowed(shiftedMonth(1))} onClick={() => { onChange(shiftedMonth(1)); setOpen(false); }}>›</button>
    </div>
    {open && <div className="month-picker-calendar" id={`${id}-calendar`} role="dialog" aria-label={`${label}: choose month and year`}>
      <div className="month-picker-year">
        <button type="button" className="month-picker-arrow" aria-label="Previous year"
          disabled={!validYear || Number(year) <= Number(min.slice(0, 4))} onClick={() => setYear(String(Number(year) - 1))}>‹</button>
        <input ref={yearRef} type="number" aria-label="Year" value={year}
          min={Number(min.slice(0, 4))} max={Number(max.slice(0, 4))} step="1"
          aria-invalid={!validYear} onChange={event => setYear(event.target.value)} />
        <button type="button" className="month-picker-arrow" aria-label="Next year"
          disabled={!validYear || Number(year) >= Number(max.slice(0, 4))} onClick={() => setYear(String(Number(year) + 1))}>›</button>
      </div>
      <div className="month-picker-months">
        {monthNames.map((name, index) => {
          const candidate = monthValue(Number(year), index + 1);
          return <button type="button" key={name} disabled={!validYear || !allowed(candidate)}
            aria-pressed={value === candidate}
            onClick={() => { onChange(candidate); close(); }}>{name.slice(0, 3)}</button>;
        })}
      </div>
      <div className="month-picker-footer">
        <button type="button" onClick={() => { onChange(""); close(); }}>Clear</button>
        <button type="button" onClick={close}>Close</button>
      </div>
    </div>}
  </div>;
}
