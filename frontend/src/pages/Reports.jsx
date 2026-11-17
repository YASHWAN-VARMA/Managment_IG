import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Download, FileSpreadsheet, RefreshCw, Search, SlidersHorizontal } from "lucide-react";
import PageHeader from "../components/PageHeader.jsx";
import "./Reports.css";
import { api, unwrapList } from "../services/api.js";

const reports = [
  { name: "Vehicles", path: "/export/vehicles", description: "Vehicle register", source: "vehicles", dateField: "createdAt" },
  { name: "Drivers", path: "/export/drivers", description: "Driver register", source: "drivers", dateField: "createdAt" },
  { name: "Trips", path: "/export/trips", description: "Trip history", source: "trips", dateField: "startDate" },
  { name: "Advances", path: "/export/advances", description: "Driver advance records", source: "advances", dateField: "date" },
  { name: "Fuel entries", path: "/export/fuel-entries", description: "Fuel transaction records", source: "fuel", dateField: "date" },
  { name: "Financial summary", path: "/export/financial-summary", description: "Combined finance workbook", source: "financial", dateField: null },
];

const pad = (n) => String(n).padStart(2, "0");
const toInputDate = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const startOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1);
const endOfMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0);
const startOfYear = (year) => new Date(year, 0, 1);
const endOfYear = (year) => new Date(year, 11, 31);

function financialYearRange(startYear) {
  return { start: new Date(startYear, 3, 1), end: new Date(startYear + 1, 2, 31) };
}

function initialRange() {
  const now = new Date();
  return { start: toInputDate(startOfMonth(now)), end: toInputDate(endOfMonth(now)) };
}

function getRangeForPreset(preset, year) {
  const now = new Date();
  if (preset === "This month") return { start: toInputDate(startOfMonth(now)), end: toInputDate(endOfMonth(now)) };
  if (preset === "Last month") {
    const last = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return { start: toInputDate(startOfMonth(last)), end: toInputDate(endOfMonth(last)) };
  }
  if (preset === "Last 3 months") {
    const first = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    return { start: toInputDate(first), end: toInputDate(now) };
  }
  if (preset === "This year") return { start: toInputDate(startOfYear(now.getFullYear())), end: toInputDate(endOfYear(now.getFullYear())) };
  if (preset === "Calendar year") return { start: toInputDate(startOfYear(year)), end: toInputDate(endOfYear(year)) };
  if (preset === "Financial year") {
    const fyStart = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    const range = financialYearRange(fyStart);
    return { start: toInputDate(range.start), end: toInputDate(range.end) };
  }
  return initialRange();
}

function inRange(value, start, end) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const from = new Date(`${start}T00:00:00`);
  const to = new Date(`${end}T23:59:59.999`);
  return date >= from && date <= to;
}

export default function Reports() {
  const now = new Date();
  const currentFYStart = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const [preset, setPreset] = useState("This month");
  const [range, setRange] = useState(initialRange);
  const [calendarYear, setCalendarYear] = useState(now.getFullYear());
  const [financialYear, setFinancialYear] = useState(currentFYStart);
  const [records, setRecords] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [previewReady, setPreviewReady] = useState(false);

  const validRange = Boolean(range.start && range.end && range.start <= range.end);
  const years = useMemo(() => Array.from({ length: 7 }, (_, i) => now.getFullYear() - i), [now.getFullYear()]);
  const financialYears = useMemo(() => Array.from({ length: 7 }, (_, i) => currentFYStart - i), [currentFYStart]);

  function choosePreset(value) {
    setPreset(value);
    if (value === "Calendar year") setRange(getRangeForPreset(value, calendarYear));
    else if (value === "Financial year") setRange(getRangeForPreset(value, financialYear));
    else if (value !== "Custom") setRange(getRangeForPreset(value));
    setPreviewReady(false);
  }

  function changeCalendarYear(value) {
    const year = Number(value);
    setCalendarYear(year);
    setRange(getRangeForPreset("Calendar year", year));
    setPreviewReady(false);
  }

  function changeFinancialYear(value) {
    const year = Number(value);
    setFinancialYear(year);
    const fy = financialYearRange(year);
    setRange({ start: toInputDate(fy.start), end: toInputDate(fy.end) });
    setPreviewReady(false);
  }

  function changeDate(field, value) {
    setPreset("Custom");
    setRange((current) => ({ ...current, [field]: value }));
    setPreviewReady(false);
  }

  async function preview() {
    if (!validRange) return;
    setLoading(true);
    setError("");
    const endpoints = {
      vehicles: "/vehicles", drivers: "/drivers", trips: "/trips",
      advances: "/advances", fuel: "/fuel-entries",
    };
    const results = await Promise.allSettled(Object.entries(endpoints).map(async ([key, path]) => {
      const data = await api.get(path);
      return [key, unwrapList(data)];
    }));
    const next = {};
    results.forEach((result) => {
      if (result.status === "fulfilled") {
        const [key, list] = result.value;
        const config = reports.find((item) => item.source === key);
        next[key] = list.filter((item) => inRange(item[config.dateField] || item.createdAt, range.start, range.end)).length;
      }
    });
    const failed = results.find((result) => result.status === "rejected");
    if (failed) setError(`Some record counts could not be loaded: ${failed.reason.message}`);
    setRecords(next);
    setPreviewReady(true);
    setLoading(false);
  }

  async function download(report) {
    if (!validRange) return;
    const token = localStorage.getItem("mg_access_token");
    const params = new URLSearchParams({ startDate: range.start, endDate: range.end });
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3333"}${report.path}?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }, credentials: "include",
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || `Export failed (${response.status})`);
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${report.name.toLowerCase().replaceAll(" ", "-")}_${range.start}_to_${range.end}.xlsx`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => { setPreviewReady(false); }, [range.start, range.end]);

  return <>
    <PageHeader title="Reports" description="Generate fleet and financial reports for any date range." action={<button className="button button-secondary" onClick={preview} disabled={loading || !validRange}><RefreshCw size={15} className={loading ? "spin" : ""}/> Refresh preview</button>} />
    {error && <div className="notice notice-error">{error}</div>}

    <section className="panel report-filter-panel">
      <div className="report-section-heading"><div className="report-icon"><CalendarDays size={19}/></div><div><h2>Report period</h2><p>Choose a preset or define your own date range.</p></div></div>
      <div className="period-presets">
        {["This month", "Last month", "Last 3 months", "This year", "Financial year", "Calendar year", "Custom"].map((item) =>
          <button key={item} className={`period-chip ${preset === item ? "selected" : ""}`} onClick={() => choosePreset(item)}>{item}</button>
        )}
      </div>
      {preset === "Calendar year" && <div className="year-select-row"><label>Calendar year<select value={calendarYear} onChange={(e) => changeCalendarYear(e.target.value)}>{years.map((year) => <option key={year} value={year}>{year}</option>)}</select></label></div>}
      {preset === "Financial year" && <div className="year-select-row"><label>Indian financial year<select value={financialYear} onChange={(e) => changeFinancialYear(e.target.value)}>{financialYears.map((year) => <option key={year} value={year}>{year}–{year + 1}</option>)}</select></label><span className="report-hint">April 1 – March 31</span></div>}
      <div className="date-range-fields">
        <label>Start date<input type="date" value={range.start} max={range.end || undefined} onChange={(e) => changeDate("start", e.target.value)}/></label>
        <span className="date-range-separator">to</span>
        <label>End date<input type="date" value={range.end} min={range.start || undefined} onChange={(e) => changeDate("end", e.target.value)}/></label>
        <button className="button button-primary preview-button" onClick={preview} disabled={!validRange || loading}><Search size={15}/>{loading ? "Checking..." : "Preview records"}</button>
      </div>
      {!validRange && <p className="report-validation">Please select a valid start and end date.</p>}
      {previewReady && <p className="preview-note">Record counts are estimated from the records currently returned by your API. Export filtering must also be enabled on the backend.</p>}
    </section>

    <div className="reports-list-heading"><div><h2>Available reports</h2><p>Excel workbooks use the selected date range.</p></div><span className="selected-range-label">{range.start} — {range.end}</span></div>
    <div className="report-grid">{reports.map((report) => <div className="report-card" key={report.path}>
      <div className="report-icon"><FileSpreadsheet size={20}/></div>
      <div className="report-copy"><strong>{report.name}</strong><span>{report.description}</span>{previewReady && report.source !== "financial" && <small>{records[report.source] ?? "—"} matching records</small>}{previewReady && report.source === "financial" && <small>{(records.advances ?? 0) + (records.fuel ?? 0)} finance transactions</small>}</div>
      <button className="icon-button" title={`Download ${report.name}`} onClick={() => download(report)} disabled={!validRange}><Download size={17}/></button>
    </div>)}</div>
  </>;
}
