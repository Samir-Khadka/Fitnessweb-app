import { useEffect, useState } from "react";
import { api } from "../api.js";
import { fmtNum, last7DaysDistance } from "../lib.js";
import { Empty, ErrorBanner, Loading } from "../components.jsx";

// Weekly distance from the backend's own aggregation endpoint. The
// endpoint groups all history, so the last-7-days window is applied here.
export default function Stats({ workouts }) {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    api.weeklyDistance()
      .then((data) => { if (!cancelled) setRows(last7DaysDistance(data)); })
      .catch((err) => { if (!cancelled) setError(err.message); });
    return () => { cancelled = true; };
  }, []);

  if (error) return <div className="stack"><h1>Weekly stats</h1><ErrorBanner error={error} /></div>;
  if (rows === null) return <div className="stack"><h1>Weekly stats</h1><Loading label="Loading distance…" /></div>;

  const total = rows.reduce((s, r) => s + r.km, 0);
  const max = Math.max(0.1, ...rows.map((r) => r.km));
  const daysWithDistance = rows.filter((r) => r.km > 0).length;

  return (
    <div className="stack">
      <h1>Weekly stats</h1>
      <p className="muted">
        Distance per day over the last 7 days, from your logged workouts.
        Total: {fmtNum(total)} km across {daysWithDistance} active day{daysWithDistance === 1 ? "" : "s"}.
      </p>
      {total === 0 && workouts.length === 0 ? (
        <Empty title="No distance logged yet"
          hint="Log a run, ride or walk with a distance and it shows up here." />
      ) : (
        <section className="card">
          <div className="bar-chart" role="img" aria-label={`Distance over the last 7 days, total ${fmtNum(total)} kilometres`}>
            {rows.map((r) => (
              <div key={r.date} className="bar-col">
                <span className="bar-value">{r.km > 0 ? fmtNum(r.km) : ""}</span>
                <div className="bar-track">
                  <div className="bar-fill" style={{ height: `${(r.km / max) * 100}%` }} />
                </div>
                <span className="bar-label">
                  {new Date(`${r.date}T12:00:00`).toLocaleDateString(undefined, { weekday: "short" })}
                </span>
                <span className="bar-date">{r.date.slice(5)}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
