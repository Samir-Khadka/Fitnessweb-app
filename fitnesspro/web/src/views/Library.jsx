import { useMemo, useState } from "react";
import { EXERCISE_LIBRARY, MUSCLE_GROUPS } from "../exercises.js";
import { Field } from "../components.jsx";

// Browsing view for the reference library. "Use in logger" hands the name
// to the logger view; the library itself never pretends to be user data.
export default function Library({ onUseInLogger }) {
  const [query, setQuery] = useState("");
  const [muscle, setMuscle] = useState("All");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return EXERCISE_LIBRARY.filter((e) =>
      (muscle === "All" || e.muscle === muscle) &&
      (q === "" || e.name.toLowerCase().includes(q) || e.muscle.toLowerCase().includes(q)));
  }, [query, muscle]);

  return (
    <div className="stack">
      <h1>Exercise library</h1>
      <p className="muted">
        Reference library — well-known lifts and cardio activities you can quick-add
        to a workout. Your own logged exercises live in History.
      </p>
      <form className="form form-inline" onSubmit={(e) => e.preventDefault()}>
        <Field label="Search" htmlFor="lib-search">
          <input id="lib-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="e.g. squat, back, press" />
        </Field>
        <Field label="Muscle group" htmlFor="lib-muscle">
          <select id="lib-muscle" value={muscle} onChange={(e) => setMuscle(e.target.value)}>
            {MUSCLE_GROUPS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </Field>
      </form>
      <p className="muted" role="status">{results.length} exercise{results.length === 1 ? "" : "s"}</p>
      <ul className="library-grid">
        {results.map((e) => (
          <li key={e.name} className="card library-card">
            <strong>{e.name}</strong>
            <span className="muted">{e.muscle} · {e.equipment}</span>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => onUseInLogger(e.name)}>
              Use in logger →
            </button>
          </li>
        ))}
      </ul>
      {results.length === 0 ? <p className="muted">Nothing matches — try a different search, or type a custom name in the logger.</p> : null}
    </div>
  );
}
