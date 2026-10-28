import { useEffect, useMemo, useState } from "react";
import { api } from "../api.js";
import { computeStreak, dayKey, exerciseVolume, fmtDate, fmtNum, weekStart, workoutDay } from "../lib.js";
import { ErrorBanner, Field, ProgressBar } from "../components.jsx";

// Dashboard: streak, this week, latest weight, goals. Volume needs the
// exercises of this week's workouts, so they are fetched once here.
export default function Dashboard({ user, workouts, measurements, goals, getExercises, go, onUserChange }) {
  const [error, setError] = useState("");
  const [editingProfile, setEditingProfile] = useState(false);
  const [profile, setProfile] = useState({
    name: user?.name || "",
    height_cm: user?.height_cm ?? "",
    weight_kg: user?.weight_kg ?? "",
    body_fat_pct: user?.body_fat_pct ?? "",
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [weekExercises, setWeekExercises] = useState(null);

  const streak = useMemo(() => computeStreak(workouts), [workouts]);

  const thisWeek = useMemo(() => {
    const start = dayKey(weekStart(new Date()));
    return workouts.filter((w) => (workoutDay(w) || "") >= start);
  }, [workouts]);

  const weekVolume = useMemo(() => {
    if (!weekExercises) return null;
    return weekExercises.reduce((sum, ex) => sum + exerciseVolume(ex), 0);
  }, [weekExercises]);

  // Fetch this week's exercises once (for the volume number).
  useEffect(() => {
    let cancelled = false;
    if (thisWeek.length === 0) {
      setWeekExercises([]);
      return undefined;
    }
    setWeekExercises(null);
    Promise.all(thisWeek.map((w) => getExercises(w.id)))
      .then((lists) => { if (!cancelled) setWeekExercises(lists.flat()); })
      .catch(() => { if (!cancelled) setWeekExercises([]); });
    return () => { cancelled = true; };
  }, [thisWeek, getExercises]);

  const weights = useMemo(
    () => measurements.filter((m) => m.type === "weight" && Number(m.value) > 0)
      .sort((a, b) => String(a.measured_at || "").localeCompare(String(b.measured_at || ""))),
    [measurements],
  );
  const latestWeight = weights.length ? weights[weights.length - 1] : null;
  const prevWeight = weights.length > 1 ? weights[weights.length - 2] : null;
  const weightDelta = latestWeight && prevWeight
    ? Number(latestWeight.value) - Number(prevWeight.value) : null;

  const activeGoals = goals.filter((g) => g.status === "active");

  async function saveProfile(e) {
    e.preventDefault();
    setError("");
    setSavingProfile(true);
    try {
      const patch = {
        name: profile.name.trim(),
        height_cm: profile.height_cm === "" ? undefined : Number(profile.height_cm),
        weight_kg: profile.weight_kg === "" ? undefined : Number(profile.weight_kg),
        body_fat_pct: profile.body_fat_pct === "" ? undefined : Number(profile.body_fat_pct),
      };
      Object.keys(patch).forEach((k) => patch[k] === undefined && delete patch[k]);
      await api.updateUser(user.id, patch);
      const fresh = await api.me();
      onUserChange(fresh);
      setEditingProfile(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingProfile(false);
    }
  }

  return (
    <div className="stack">
      <ErrorBanner error={error} onDismiss={() => setError("")} />
      <section className="card welcome">
        <div>
          <h1>Hello, {user?.name || "athlete"}</h1>
          <p className="muted">{user?.email}</p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={() => go("logger")}>
          + Log a workout
        </button>
      </section>

      <section className="stat-grid" aria-label="Overview">
        <div className="stat-card">
          <span className="stat-value">🔥 {streak}</span>
          <span className="stat-label">day streak</span>
          <span className="stat-hint">Consecutive days with a workout</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{thisWeek.length}</span>
          <span className="stat-label">workouts this week</span>
          <span className="stat-hint">Monday to Sunday</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{weekVolume === null ? "…" : `${fmtNum(weekVolume, 0)} kg`}</span>
          <span className="stat-label">volume this week</span>
          <span className="stat-hint">Sets × reps × weight</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">
            {latestWeight ? `${fmtNum(latestWeight.value)} kg` : "—"}
          </span>
          <span className="stat-label">latest weight</span>
          <span className="stat-hint">
            {weightDelta === null ? "Log a weight to start tracking"
              : `${weightDelta > 0 ? "+" : ""}${fmtNum(weightDelta)} kg vs previous`}
          </span>
        </div>
      </section>

      <section className="card">
        <div className="card-head">
          <h2>Active goals</h2>
          <button type="button" className="btn btn-ghost" onClick={() => go("goals")}>All goals →</button>
        </div>
        {activeGoals.length === 0 ? (
          <p className="muted">No active goals yet. <button type="button" className="link" onClick={() => go("goals")}>Set your first goal</button>.</p>
        ) : (
          <ul className="goal-list">
            {activeGoals.slice(0, 3).map((g) => (
              <li key={g.id}>
                <strong>{g.goal_type}</strong>
                <span className="muted"> — target {g.target_value} {g.target_unit || ""}
                  {g.end_date ? ` by ${fmtDate(g.end_date)}` : ""}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <div className="card-head">
          <h2>Profile</h2>
          <button type="button" className="btn btn-ghost" onClick={() => { setEditingProfile(!editingProfile); setProfile({
            name: user?.name || "", height_cm: user?.height_cm ?? "",
            weight_kg: user?.weight_kg ?? "", body_fat_pct: user?.body_fat_pct ?? "",
          }); }}>
            {editingProfile ? "Cancel" : "Edit"}
          </button>
        </div>
        {editingProfile ? (
          <form onSubmit={saveProfile} className="form form-inline">
            <Field label="Name" htmlFor="pf-name">
              <input id="pf-name" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} required />
            </Field>
            <Field label="Height (cm)" htmlFor="pf-height">
              <input id="pf-height" type="number" min="0" value={profile.height_cm} onChange={(e) => setProfile({ ...profile, height_cm: e.target.value })} />
            </Field>
            <Field label="Profile weight (kg)" htmlFor="pf-weight">
              <input id="pf-weight" type="number" min="0" step="0.1" value={profile.weight_kg} onChange={(e) => setProfile({ ...profile, weight_kg: e.target.value })} />
            </Field>
            <Field label="Body fat (%)" htmlFor="pf-fat">
              <input id="pf-fat" type="number" min="0" max="100" step="0.1" value={profile.body_fat_pct} onChange={(e) => setProfile({ ...profile, body_fat_pct: e.target.value })} />
            </Field>
            <button type="submit" className="btn btn-primary" disabled={savingProfile}>
              {savingProfile ? "Saving…" : "Save profile"}
            </button>
          </form>
        ) : (
          <p className="muted">
            {user?.height_cm ? `${user.height_cm} cm · ` : ""}
            {user?.weight_kg ? `${user.weight_kg} kg · ` : ""}
            {user?.body_fat_pct ? `${user.body_fat_pct}% body fat` : "Add height, weight and body fat above."}
          </p>
        )}
      </section>

      <section className="shortcut-grid" aria-label="Shortcuts">
        {[
          ["history", "📋", "History", "Every workout, with its exercises"],
          ["library", "🏋️", "Exercise library", "Reference lifts to quick-add"],
          ["records", "🏆", "Personal records", "Your heaviest lift per exercise"],
          ["measurements", "⚖️", "Measurements", "Weight trend chart"],
          ["stats", "📊", "Weekly stats", "Distance over the last 7 days"],
        ].map(([view, icon, title, hint]) => (
          <button key={view} type="button" className="shortcut-card" onClick={() => go(view)}>
            <span className="shortcut-icon" aria-hidden="true">{icon}</span>
            <strong>{title}</strong>
            <span className="muted">{hint}</span>
          </button>
        ))}
      </section>
    </div>
  );
}
