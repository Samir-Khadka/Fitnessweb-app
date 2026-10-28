import { useEffect, useMemo, useState } from "react";
import { api } from "../api.js";
import { EXERCISE_LIBRARY } from "../exercises.js";
import { exerciseVolume, fmtDate, fmtNum } from "../lib.js";
import { ConfirmButton, Empty, ErrorBanner, Field, Loading } from "../components.jsx";

const TYPE_SUGGESTIONS = ["Push Day", "Pull Day", "Leg Day", "Full Body", "Running", "Cycling", "Swimming", "Strength", "Cardio", "Custom"];

// Countdown rest timer. Beeps with a plain WebAudio tone when time is up
// (no audio asset needed). Auto-starts when `startSignal` changes.
function RestTimer({ startSignal, defaultSeconds = 90 }) {
  const [seconds, setSeconds] = useState(defaultSeconds);
  const [left, setLeft] = useState(defaultSeconds);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!startSignal) return;
    setLeft(seconds);
    setRunning(true);
    setDone(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startSignal]);

  useEffect(() => {
    if (!running) return undefined;
    if (left <= 0) {
      setRunning(false);
      setDone(true);
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        osc.frequency.value = 880;
        osc.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      } catch { /* audio is a nicety, never a blocker */ }
      return undefined;
    }
    const t = setTimeout(() => setLeft((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [running, left]);

  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");

  return (
    <section className="card timer-card" aria-label="Rest timer">
      <h2>⏱ Rest timer</h2>
      <p className={`timer-display ${done ? "timer-done" : ""}`} role="timer" aria-live="off">
        {done ? "Time's up — go!" : `${mm}:${ss}`}
      </p>
      <div className="timer-presets" role="group" aria-label="Rest duration">
        {[30, 60, 90, 120, 180].map((s) => (
          <button key={s} type="button" className={`btn btn-chip ${seconds === s ? "btn-chip-active" : ""}`}
            onClick={() => { setSeconds(s); setLeft(s); setRunning(false); setDone(false); }}>
            {s}s
          </button>
        ))}
      </div>
      <div className="btn-row">
        <button type="button" className="btn btn-primary" onClick={() => { if (left <= 0) setLeft(seconds); setRunning(true); setDone(false); }}>
          {running ? "Running…" : "Start"}
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => setRunning(false)} disabled={!running}>Pause</button>
        <button type="button" className="btn btn-ghost" onClick={() => { setRunning(false); setLeft(seconds); setDone(false); }}>Reset</button>
      </div>
    </section>
  );
}

function SetEditor({ exercise, onSaved, onError }) {
  const [sets, setSets] = useState(exercise.sets || []);
  const [reps, setReps] = useState("");
  const [weight, setWeight] = useState("");
  const [saving, setSaving] = useState(false);

  function addSet(e) {
    e.preventDefault();
    const r = Number(reps);
    if (!r || r <= 0) return;
    setSets([...sets, { reps: r, weight_kg: weight === "" ? null : Number(weight) }]);
    setReps("");
    setWeight("");
  }

  async function saveSets() {
    setSaving(true);
    try {
      await api.updateExercise(exercise.id, { sets });
      onSaved();
    } catch (err) {
      onError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const dirty = JSON.stringify(sets) !== JSON.stringify(exercise.sets || []);

  return (
    <div className="set-editor">
      {sets.length === 0 ? (
        <p className="muted">No sets yet — add the first one below.</p>
      ) : (
        <table className="set-table">
          <thead><tr><th scope="col">#</th><th scope="col">Reps</th><th scope="col">Weight (kg)</th><th scope="col" /></tr></thead>
          <tbody>
            {sets.map((s, i) => (
              <tr key={i}>
                <td>{i + 1}</td>
                <td>{s.reps}</td>
                <td>{s.weight_kg ?? "bodyweight"}</td>
                <td>
                  <button type="button" className="btn btn-ghost btn-sm" aria-label={`Remove set ${i + 1}`}
                    onClick={() => setSets(sets.filter((_, j) => j !== i))}>✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <form onSubmit={addSet} className="form form-inline">
        <Field label="Reps" htmlFor={`reps-${exercise.id}`}>
          <input id={`reps-${exercise.id}`} type="number" min="1" value={reps} onChange={(e) => setReps(e.target.value)} placeholder="10" required />
        </Field>
        <Field label="Weight (kg, blank = bodyweight)" htmlFor={`weight-${exercise.id}`}>
          <input id={`weight-${exercise.id}`} type="number" min="0" step="0.5" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="60" />
        </Field>
        <button type="submit" className="btn btn-secondary">+ Add set</button>
      </form>
      <button type="button" className="btn btn-primary" onClick={saveSets} disabled={!dirty || saving}>
        {saving ? "Saving…" : dirty ? "Save sets" : "Sets saved ✓"}
      </button>
    </div>
  );
}

export default function Logger({ workouts, getExercises, invalidateExercises, onWorkoutsChange, pendingExercise, clearPendingExercise }) {
  const [workout, setWorkout] = useState(null);
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [startSignal, setStartSignal] = useState(0);

  // New-workout form
  const [wType, setWType] = useState("Push Day");
  const [wDate, setWDate] = useState(() => {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  });
  const [wNotes, setWNotes] = useState("");
  const [wDistance, setWDistance] = useState("");
  const [wDuration, setWDuration] = useState("");
  const [wCalories, setWCalories] = useState("");
  const [creating, setCreating] = useState(false);

  // Add-exercise form
  const [exQuery, setExQuery] = useState("");
  const [exName, setExName] = useState("");
  const [addingEx, setAddingEx] = useState(false);

  const suggestions = useMemo(() => {
    const q = exQuery.trim().toLowerCase();
    if (!q) return EXERCISE_LIBRARY.slice(0, 8);
    return EXERCISE_LIBRARY.filter((e) => e.name.toLowerCase().includes(q)).slice(0, 8);
  }, [exQuery]);

  async function openWorkout(w) {
    setLoading(true);
    setError("");
    try {
      const full = await api.getWorkout(w.id);
      setWorkout(full);
      const exs = await getExercises(w.id);
      setExercises(exs);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function refreshExercises() {
    if (!workout) return;
    invalidateExercises(workout.id);
    const exs = await getExercises(workout.id);
    setExercises(exs);
  }

  // Exercise handed over from the library view.
  useEffect(() => {
    if (!pendingExercise) return;
    const name = pendingExercise;
    clearPendingExercise();
    if (workout) {
      api.addExercise(workout.id, { name, sets: [] })
        .then(() => refreshExercises())
        .catch((err) => setError(err.message));
    } else {
      setExName(name);
      setExQuery(name);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingExercise, workout]);

  async function createWorkout(e) {
    e.preventDefault();
    setError("");
    setCreating(true);
    try {
      const doc = {
        type: wType.trim() || "Custom",
        start_time: wDate,
        notes: wNotes.trim(),
        distance_km: wDistance === "" ? 0 : Number(wDistance),
        duration_minutes: wDuration === "" ? undefined : Number(wDuration),
        calories_burned: wCalories === "" ? 0 : Number(wCalories),
      };
      Object.keys(doc).forEach((k) => doc[k] === undefined && delete doc[k]);
      const created = await api.createWorkout(doc);
      await onWorkoutsChange();
      await openWorkout(created);
      setNotice("Workout started. Add your first exercise below.");
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function addExercise(e) {
    e.preventDefault();
    const name = (exName.trim() || exQuery.trim());
    if (!name || !workout) return;
    setAddingEx(true);
    setError("");
    try {
      await api.addExercise(workout.id, { name, sets: [] });
      setExName("");
      setExQuery("");
      await refreshExercises();
    } catch (err) {
      setError(err.message);
    } finally {
      setAddingEx(false);
    }
  }

  async function finishWorkout() {
    if (!workout) return;
    setError("");
    try {
      const start = new Date(workout.start_time);
      const mins = !Number.isNaN(start.getTime())
        ? Math.max(1, Math.round((Date.now() - start.getTime()) / 60000)) : undefined;
      const now = new Date();
      const pad = (n) => String(n).padStart(2, "0");
      const localIso = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
      const patch = { end_time: localIso };
      if (mins) patch.duration_minutes = mins;
      await api.updateWorkout(workout.id, patch);
      await onWorkoutsChange();
      setWorkout(null);
      setExercises([]);
      setNotice("Workout finished — nice work. It is in your history now.");
    } catch (err) {
      setError(err.message);
    }
  }

  const totalVolume = exercises.reduce((sum, ex) => sum + exerciseVolume(ex), 0);

  if (loading) return <Loading label="Opening workout…" />;

  if (!workout) {
    return (
      <div className="stack">
        <ErrorBanner error={error} onDismiss={() => setError("")} />
        {notice ? <div className="notice" role="status">{notice}</div> : null}
        <section className="card">
          <h1>Log a workout</h1>
          <form onSubmit={createWorkout} className="form">
            <Field label="Workout name / type" htmlFor="w-type">
              <input id="w-type" list="w-type-list" value={wType} onChange={(e) => setWType(e.target.value)} required />
              <datalist id="w-type-list">
                {TYPE_SUGGESTIONS.map((t) => <option key={t} value={t} />)}
              </datalist>
            </Field>
            <Field label="Date and time" htmlFor="w-date">
              <input id="w-date" type="datetime-local" value={wDate} onChange={(e) => setWDate(e.target.value)} required />
            </Field>
            <Field label="Notes" htmlFor="w-notes">
              <textarea id="w-notes" rows="2" value={wNotes} onChange={(e) => setWNotes(e.target.value)} placeholder="How did it feel? Anything to remember?" />
            </Field>
            <div className="form-row-3">
              <Field label="Distance (km)" htmlFor="w-dist">
                <input id="w-dist" type="number" min="0" step="0.1" value={wDistance} onChange={(e) => setWDistance(e.target.value)} placeholder="0" />
              </Field>
              <Field label="Duration (min)" htmlFor="w-dur">
                <input id="w-dur" type="number" min="0" value={wDuration} onChange={(e) => setWDuration(e.target.value)} placeholder="60" />
              </Field>
              <Field label="Calories" htmlFor="w-cal">
                <input id="w-cal" type="number" min="0" value={wCalories} onChange={(e) => setWCalories(e.target.value)} placeholder="0" />
              </Field>
            </div>
            <button type="submit" className="btn btn-primary btn-block" disabled={creating}>
              {creating ? "Starting…" : "Start workout"}
            </button>
          </form>
        </section>

        <section className="card">
          <h2>Or continue a recent workout</h2>
          {workouts.length === 0 ? (
            <p className="muted">No workouts yet — your first one starts above.</p>
          ) : (
            <ul className="recent-list">
              {workouts.slice(0, 5).map((w) => (
                <li key={w.id}>
                  <button type="button" className="recent-item" onClick={() => openWorkout(w)}>
                    <strong>{w.type || "Workout"}</strong>
                    <span className="muted">{fmtDate(w.start_time)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    );
  }

  return (
    <div className="stack">
      <ErrorBanner error={error} onDismiss={() => setError("")} />
      {notice ? <div className="notice" role="status">{notice}</div> : null}
      <section className="card">
        <div className="card-head">
          <div>
            <h1>{workout.type || "Workout"}</h1>
            <p className="muted">{fmtDate(workout.start_time)}
              {workout.distance_km ? ` · ${fmtNum(workout.distance_km)} km` : ""}
              {workout.duration_minutes ? ` · ${workout.duration_minutes} min` : ""}
              {` · volume ${fmtNum(totalVolume, 0)} kg`}
            </p>
            {workout.notes ? <p>{workout.notes}</p> : null}
          </div>
          <div className="btn-row">
            <button type="button" className="btn btn-secondary" onClick={finishWorkout}>Finish workout</button>
            <button type="button" className="btn btn-ghost" onClick={() => { setWorkout(null); setExercises([]); }}>Close</button>
          </div>
        </div>

        {exercises.length === 0 ? (
          <Empty title="No exercises yet" hint="Add your first exercise below — pick from the reference library or type a custom name." />
        ) : (
          <div className="exercise-stack">
            {exercises.map((ex) => (
              <article key={ex.id} className="exercise-card">
                <div className="card-head">
                  <h2>{ex.name}</h2>
                  <ConfirmButton
                    className="btn btn-ghost btn-sm"
                    onConfirm={async () => {
                      try { await api.deleteExercise(ex.id); await refreshExercises(); }
                      catch (err) { setError(err.message); }
                    }}
                  >
                    Remove exercise
                  </ConfirmButton>
                </div>
                <SetEditor
                  exercise={ex}
                  onSaved={async () => { setStartSignal((n) => n + 1); await refreshExercises(); }}
                  onError={setError}
                />
              </article>
            ))}
          </div>
        )}

        <form onSubmit={addExercise} className="form add-exercise-form">
          <h2>Add an exercise</h2>
          <Field label="Search the reference library or type a custom name" htmlFor="ex-search">
            <input id="ex-search" type="text" value={exQuery} onChange={(e) => { setExQuery(e.target.value); setExName(e.target.value); }}
              placeholder="e.g. Barbell Squat" />
          </Field>
          <div className="chip-row" aria-label="Suggestions">
            {suggestions.map((s) => (
              <button key={s.name} type="button" className="btn btn-chip"
                onClick={() => { setExName(s.name); setExQuery(s.name); }}>
                {s.name} <span className="muted">· {s.muscle}</span>
              </button>
            ))}
          </div>
          <button type="submit" className="btn btn-primary" disabled={addingEx || !(exName.trim() || exQuery.trim())}>
            {addingEx ? "Adding…" : "Add exercise"}
          </button>
          <p className="hint">Saving a set starts the rest timer automatically.</p>
        </form>
      </section>

      <RestTimer startSignal={startSignal} />
    </div>
  );
}
