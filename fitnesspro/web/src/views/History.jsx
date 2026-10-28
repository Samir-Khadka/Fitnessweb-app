import { useState } from "react";
import { api } from "../api.js";
import { exerciseVolume, fmtDate, fmtNum } from "../lib.js";
import { ConfirmButton, Empty, ErrorBanner } from "../components.jsx";

// Full workout history. Exercises load lazily when a workout is expanded,
// so opening the page stays fast even with many workouts.
export default function History({ workouts, getExercises, onWorkoutsChange, go }) {
  const [expanded, setExpanded] = useState({});
  const [exercises, setExercises] = useState({});
  const [error, setError] = useState("");

  async function toggle(w) {
    if (expanded[w.id]) {
      setExpanded({ ...expanded, [w.id]: false });
      return;
    }
    setExpanded({ ...expanded, [w.id]: true });
    if (!exercises[w.id]) {
      try {
        const exs = await getExercises(w.id);
        setExercises({ ...exercises, [w.id]: exs });
      } catch (err) {
        setError(err.message);
      }
    }
  }

  async function deleteWorkout(w) {
    try {
      await api.deleteWorkout(w.id);
      await onWorkoutsChange();
    } catch (err) {
      setError(err.message);
    }
  }

  if (workouts.length === 0) {
    return (
      <div className="stack">
        <h1>History</h1>
        <Empty title="No workouts yet"
          hint="Your logged workouts will appear here, newest first."
          action={<button type="button" className="btn btn-primary" onClick={() => go("logger")}>Log your first workout</button>} />
      </div>
    );
  }

  return (
    <div className="stack">
      <h1>History</h1>
      <ErrorBanner error={error} onDismiss={() => setError("")} />
      <p className="muted">{workouts.length} workout{workouts.length === 1 ? "" : "s"} — tap one to see its exercises.</p>
      <div className="stack">
        {workouts.map((w) => {
          const exs = exercises[w.id] || [];
          const volume = exs.reduce((sum, ex) => sum + exerciseVolume(ex), 0);
          const open = !!expanded[w.id];
          return (
            <article key={w.id} className="card">
              <button type="button" className="history-head" onClick={() => toggle(w)}
                aria-expanded={open}>
                <span>
                  <strong>{w.type || "Workout"}</strong>
                  <span className="muted"> · {fmtDate(w.start_time)}</span>
                </span>
                <span className="muted">
                  {w.distance_km ? `${fmtNum(w.distance_km)} km · ` : ""}
                  {w.duration_minutes ? `${w.duration_minutes} min` : ""}
                  <span aria-hidden="true"> {open ? "▾" : "▸"}</span>
                </span>
              </button>
              {w.notes ? <p>{w.notes}</p> : null}
              {open ? (
                <div className="history-body">
                  {exs.length === 0 ? (
                    <p className="muted">No exercises logged for this workout.</p>
                  ) : (
                    <>
                      <p className="muted">Total volume: {fmtNum(volume, 0)} kg</p>
                      <ul className="exercise-summary">
                        {exs.map((ex) => (
                          <li key={ex.id}>
                            <strong>{ex.name}</strong>
                            <span className="muted"> — {(ex.sets || []).map((s) => `${s.reps} × ${s.weight_kg ?? "bw"}`).join(", ") || "no sets"}</span>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                  <div className="btn-row">
                    <ConfirmButton onConfirm={() => deleteWorkout(w)}>Delete workout</ConfirmButton>
                  </div>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}
