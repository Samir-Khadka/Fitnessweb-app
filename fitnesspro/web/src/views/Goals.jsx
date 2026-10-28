import { useEffect, useMemo, useState } from "react";
import { api } from "../api.js";
import { dayKey, exerciseVolume, fmtDate, parseDate, workoutDay } from "../lib.js";
import { ConfirmButton, Empty, ErrorBanner, Field, ProgressBar } from "../components.jsx";

// Goal progress is computed client-side — the API stores only the target.
// Preset semantics:
//  - weight:   move body weight from the first measurement in the period
//              toward target_value (loss or gain, direction-aware).
//  - workouts: count workouts inside [start_date, end_date].
//  - distance: sum distance_km of workouts inside the period.
//  - volume:   sum of sets x reps x weight for workouts inside the period.
// A goal_type outside these presets shows its target without a computed bar.
const PRESETS = [
  { goal_type: "weight", label: "Reach a body weight", unit: "kg" },
  { goal_type: "workouts", label: "Work out a number of times", unit: "sessions" },
  { goal_type: "distance", label: "Cover a total distance", unit: "km" },
  { goal_type: "volume", label: "Lift a total volume", unit: "kg" },
];

function inPeriod(workout, start, end) {
  const d = workoutDay(workout);
  if (!d) return false;
  if (start && d < start) return false;
  if (end && d > end) return false;
  return true;
}

export default function Goals({ goals, workouts, measurements, getExercises, onGoalsChange, go }) {
  const [preset, setPreset] = useState("weight");
  const [target, setTarget] = useState("");
  const [start, setStart] = useState(() => dayKey(new Date()));
  const [end, setEnd] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return dayKey(d);
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [volumeByWorkout, setVolumeByWorkout] = useState({});

  const presetUnit = PRESETS.find((p) => p.goal_type === preset)?.unit || "";

  // Volume per workout, fetched once per workout id (cached in state).
  useEffect(() => {
    const missing = workouts.filter((w) => volumeByWorkout[w.id] === undefined);
    if (missing.length === 0) return undefined;
    let cancelled = false;
    Promise.all(missing.map(async (w) => [w.id, (await getExercises(w.id)).reduce((s, ex) => s + exerciseVolume(ex), 0)]))
      .then((pairs) => {
        if (cancelled) return;
        setVolumeByWorkout((prev) => {
          const next = { ...prev };
          pairs.forEach(([id, v]) => { next[id] = v; });
          return next;
        });
      })
      .catch(() => {});
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workouts]);

  const progress = useMemo(() => {
    const out = {};
    for (const g of goals) {
      const targetValue = Number(g.target_value);
      if (!targetValue) { out[g.id] = null; continue; }
      const endDate = g.end_date || dayKey(new Date());
      if (g.goal_type === "weight") {
        const weights = measurements.filter((m) => m.type === "weight" && Number(m.value) > 0)
          .sort((a, b) => String(a.measured_at || "").localeCompare(String(b.measured_at || "")));
        const inRange = weights.filter((m) => {
          const d = (m.measured_at || "").slice(0, 10);
          return (!g.start_date || d >= g.start_date) && d <= endDate;
        });
        const baseline = (inRange[0] || weights[0]);
        const current = weights.length ? weights[weights.length - 1] : null;
        if (!baseline || !current || Number(baseline.value) === targetValue) { out[g.id] = null; continue; }
        const pct = ((Number(baseline.value) - Number(current.value)) / (Number(baseline.value) - targetValue)) * 100;
        out[g.id] = { pct, detail: `from ${baseline.value} kg to ${current.value} kg` };
      } else if (g.goal_type === "workouts") {
        const count = workouts.filter((w) => inPeriod(w, g.start_date, endDate)).length;
        out[g.id] = { pct: (count / targetValue) * 100, detail: `${count} of ${targetValue} sessions` };
      } else if (g.goal_type === "distance") {
        const km = workouts.filter((w) => inPeriod(w, g.start_date, endDate))
          .reduce((s, w) => s + (Number(w.distance_km) || 0), 0);
        out[g.id] = { pct: (km / targetValue) * 100, detail: `${km.toFixed(1)} of ${targetValue} km` };
      } else if (g.goal_type === "volume") {
        const vol = workouts.filter((w) => inPeriod(w, g.start_date, endDate))
          .reduce((s, w) => s + (volumeByWorkout[w.id] || 0), 0);
        out[g.id] = { pct: (vol / targetValue) * 100, detail: `${Math.round(vol).toLocaleString()} of ${targetValue.toLocaleString()} kg` };
      } else {
        out[g.id] = null;
      }
    }
    return out;
  }, [goals, workouts, measurements, volumeByWorkout]);

  async function create(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api.createGoal({
        goal_type: preset,
        target_value: Number(target),
        target_unit: presetUnit,
        start_date: start,
        end_date: end,
      });
      setTarget("");
      await onGoalsChange();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(g, status) {
    setError("");
    try {
      await api.updateGoal(g.id, { status });
      await onGoalsChange();
    } catch (err) {
      setError(err.message);
    }
  }

  async function remove(g) {
    setError("");
    try {
      await api.deleteGoal(g.id);
      await onGoalsChange();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="stack">
      <h1>Goals</h1>
      <ErrorBanner error={error} onDismiss={() => setError("")} />
      <section className="card">
        <h2>Set a new goal</h2>
        <form onSubmit={create} className="form form-inline">
          <Field label="Goal" htmlFor="g-preset">
            <select id="g-preset" value={preset} onChange={(e) => setPreset(e.target.value)}>
              {PRESETS.map((p) => <option key={p.goal_type} value={p.goal_type}>{p.label}</option>)}
            </select>
          </Field>
          <Field label={`Target (${presetUnit})`} htmlFor="g-target">
            <input id="g-target" type="number" min="0" step="any" value={target} onChange={(e) => setTarget(e.target.value)} required />
          </Field>
          <Field label="Start" htmlFor="g-start">
            <input id="g-start" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </Field>
          <Field label="End" htmlFor="g-end">
            <input id="g-end" type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
          </Field>
          <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? "Saving…" : "Create goal"}</button>
        </form>
      </section>

      {goals.length === 0 ? (
        <Empty title="No goals yet"
          hint="Goals turn logging into progress — set a target weight, a session count, a distance or a volume."
          action={<button type="button" className="btn btn-primary" onClick={() => go("dashboard")}>Back to dashboard</button>} />
      ) : (
        <div className="stack">
          {goals.map((g) => {
            const p = progress[g.id];
            return (
              <article key={g.id} className="card">
                <div className="card-head">
                  <div>
                    <strong>{g.goal_type}</strong>
                    <span className="muted"> — target {g.target_value} {g.target_unit || ""}
                      {g.start_date ? ` · ${fmtDate(g.start_date)}` : ""}
                      {g.end_date ? ` → ${fmtDate(g.end_date)}` : ""}</span>
                  </div>
                  <span className={`badge ${g.status === "completed" ? "badge-done" : ""}`}>{g.status}</span>
                </div>
                {p ? (
                  <ProgressBar value={p.pct} label={`${p.detail} · ${Math.round(Math.min(100, Math.max(0, p.pct)))}%`} />
                ) : (
                  <p className="muted">Progress appears once matching data is logged.</p>
                )}
                <div className="btn-row">
                  {g.status !== "completed" ? (
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setStatus(g, "completed")}>Mark completed</button>
                  ) : (
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setStatus(g, "active")}>Reopen</button>
                  )}
                  <ConfirmButton className="btn btn-ghost btn-sm" onConfirm={() => remove(g)}>Delete goal</ConfirmButton>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
