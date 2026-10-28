import { useMemo, useState } from "react";
import { api } from "../api.js";
import { fmtDate, fmtNum, parseDate } from "../lib.js";
import { ConfirmButton, Empty, ErrorBanner, Field } from "../components.jsx";

// Weight trend as a hand-rolled SVG line chart (no chart dependency).
// Points are spaced by actual time, not by index, so gaps in logging
// show as gaps — the chart never invents data.
function WeightChart({ points }) {
  const W = 640, H = 240, PAD_L = 48, PAD_R = 16, PAD_T = 16, PAD_B = 32;
  const times = points.map((p) => parseDate(p.measured_at).getTime());
  const values = points.map((p) => Number(p.value));
  const tMin = Math.min(...times), tMax = Math.max(...times);
  const vMin = Math.min(...values), vMax = Math.max(...values);
  const vPad = Math.max(1, (vMax - vMin) * 0.15);
  const lo = vMin - vPad, hi = vMax + vPad;
  const x = (t) => PAD_L + (tMax === tMin ? 0.5 : (t - tMin) / (tMax - tMin)) * (W - PAD_L - PAD_R);
  const y = (v) => PAD_T + (1 - (v - lo) / (hi - lo)) * (H - PAD_T - PAD_B);
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(times[i]).toFixed(1)},${y(values[i]).toFixed(1)}`).join(" ");
  const ticks = [lo, (lo + hi) / 2, hi];

  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img"
      aria-label={`Body weight chart from ${fmtNum(values[0])} to ${fmtNum(values[values.length - 1])} kilograms`}>
      {ticks.map((v) => (
        <g key={v}>
          <line x1={PAD_L} x2={W - PAD_R} y1={y(v)} y2={y(v)} className="chart-grid" />
          <text x={PAD_L - 8} y={y(v) + 4} textAnchor="end" className="chart-label">{fmtNum(v)}</text>
        </g>
      ))}
      <path d={path} className="chart-line" fill="none" />
      {points.map((p, i) => (
        <g key={p.id || i}>
          <circle cx={x(times[i])} cy={y(values[i])} r="4" className="chart-dot" />
          <title>{`${fmtDate(p.measured_at)}: ${fmtNum(values[i])} kg`}</title>
        </g>
      ))}
      <text x={PAD_L} y={H - 8} className="chart-label">{fmtDate(points[0].measured_at)}</text>
      <text x={W - PAD_R} y={H - 8} textAnchor="end" className="chart-label">{fmtDate(points[points.length - 1].measured_at)}</text>
    </svg>
  );
}

export default function Measurements({ measurements, onMeasurementsChange }) {
  const [type, setType] = useState("weight");
  const [value, setValue] = useState("");
  const [date, setDate] = useState(() => {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const weights = useMemo(
    () => measurements.filter((m) => m.type === "weight" && Number(m.value) > 0)
      .sort((a, b) => String(a.measured_at || "").localeCompare(String(b.measured_at || ""))),
    [measurements],
  );
  const bodyFat = useMemo(
    () => measurements.filter((m) => m.type === "body_fat").sort((a, b) => String(b.measured_at || "").localeCompare(String(a.measured_at || ""))),
    [measurements],
  );

  async function add(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api.addMeasurement({
        type,
        value: Number(value),
        unit: type === "weight" ? "kg" : "%",
        measured_at: date,
      });
      setValue("");
      await onMeasurementsChange();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id) {
    setError("");
    try {
      await api.deleteMeasurement(id);
      await onMeasurementsChange();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="stack">
      <h1>Measurements</h1>
      <ErrorBanner error={error} onDismiss={() => setError("")} />
      <section className="card">
        <h2>Log a measurement</h2>
        <form onSubmit={add} className="form form-inline">
          <Field label="What" htmlFor="m-type">
            <select id="m-type" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="weight">Body weight (kg)</option>
              <option value="body_fat">Body fat (%)</option>
            </select>
          </Field>
          <Field label={type === "weight" ? "Weight (kg)" : "Body fat (%)"} htmlFor="m-value">
            <input id="m-value" type="number" min="0" step="0.1" value={value} onChange={(e) => setValue(e.target.value)} placeholder={type === "weight" ? "72.5" : "18"} required />
          </Field>
          <Field label="Date" htmlFor="m-date">
            <input id="m-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </Field>
          <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? "Saving…" : "Log measurement"}</button>
        </form>
      </section>

      <section className="card">
        <h2>Weight trend</h2>
        {weights.length < 2 ? (
          <Empty title="Not enough data for a chart yet"
            hint="Log at least two weights on different days and the trend line appears here." />
        ) : (
          <>
            <WeightChart points={weights} />
            <p className="muted">
              Latest: {fmtNum(weights[weights.length - 1].value)} kg
              {weights.length > 1 ? ` · change since first: ${(Number(weights[weights.length - 1].value) - Number(weights[0].value)) > 0 ? "+" : ""}${fmtNum(Number(weights[weights.length - 1].value) - Number(weights[0].value))} kg` : ""}
            </p>
          </>
        )}
      </section>

      <section className="card">
        <h2>Recent measurements</h2>
        {measurements.length === 0 ? (
          <p className="muted">Nothing logged yet.</p>
        ) : (
          <ul className="recent-list">
            {[...measurements].sort((a, b) => String(b.measured_at || "").localeCompare(String(a.measured_at || ""))).slice(0, 30).map((m) => (
              <li key={m.id} className="recent-item">
                <span><strong>{m.type === "weight" ? "Weight" : m.type}</strong> — {fmtNum(m.value)} {m.unit || ""}</span>
                <span className="muted">{fmtDate(m.measured_at)}</span>
                <ConfirmButton className="btn btn-ghost btn-sm" onConfirm={() => remove(m.id)}>Delete</ConfirmButton>
              </li>
            ))}
          </ul>
        )}
        {bodyFat.length > 0 ? <p className="muted">Latest body fat: {fmtNum(bodyFat[0].value)}% ({fmtDate(bodyFat[0].measured_at)}).</p> : null}
      </section>
    </div>
  );
}
