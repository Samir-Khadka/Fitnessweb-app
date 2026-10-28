import { useEffect, useMemo, useState } from "react";
import { computeRecords, fmtDate } from "../lib.js";
import { Empty, ErrorBanner, Loading } from "../components.jsx";

// Personal records: heaviest single set per exercise, computed from the
// user's own workout history. Bodyweight-only sets have no weight PR.
export default function Records({ workouts, getExercises, go }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setData(null);
    Promise.all(workouts.map(async (w) => ({ workout: w, exercises: await getExercises(w.id) })))
      .then((pairs) => { if (!cancelled) setData(computeRecords(pairs)); })
      .catch((err) => { if (!cancelled) setError(err.message); });
    return () => { cancelled = true; };
  }, [workouts, getExercises]);

  const records = useMemo(() => data || [], [data]);

  if (error) return <div className="stack"><h1>Personal records</h1><ErrorBanner error={error} /></div>;
  if (data === null) return <div className="stack"><h1>Personal records</h1><Loading label="Scanning your history…" /></div>;

  if (records.length === 0) {
    return (
      <div className="stack">
        <h1>Personal records</h1>
        <Empty title="No records yet"
          hint="Log a workout with weighted sets and your heaviest lift per exercise will appear here."
          action={<button type="button" className="btn btn-primary" onClick={() => go("logger")}>Log a workout</button>} />
      </div>
    );
  }

  return (
    <div className="stack">
      <h1>Personal records 🏆</h1>
      <p className="muted">Heaviest weight lifted in a single set, from your own logged workouts.</p>
      <ul className="record-list">
        {records.map((r) => (
          <li key={r.name.toLowerCase()} className="card record-card">
            <strong>{r.name}</strong>
            <span className="record-weight">{r.weight_kg} kg</span>
            <span className="muted">{r.reps} reps · {fmtDate(r.date)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
