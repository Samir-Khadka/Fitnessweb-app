import { useCallback, useEffect, useRef, useState } from "react";
import { api, getToken, setOnUnauthorized, setToken } from "./api.js";
import Auth from "./views/Auth.jsx";
import Dashboard from "./views/Dashboard.jsx";
import Logger from "./views/Logger.jsx";
import History from "./views/History.jsx";
import Library from "./views/Library.jsx";
import Records from "./views/Records.jsx";
import Measurements from "./views/Measurements.jsx";
import Goals from "./views/Goals.jsx";
import Stats from "./views/Stats.jsx";
import { Loading } from "./components.jsx";

const VIEWS = [
  ["dashboard", "Dashboard"],
  ["logger", "Log workout"],
  ["history", "History"],
  ["library", "Library"],
  ["records", "Records"],
  ["measurements", "Measurements"],
  ["goals", "Goals"],
  ["stats", "Weekly stats"],
];

export default function App() {
  const [authed, setAuthed] = useState(!!getToken());
  const [booting, setBooting] = useState(!!getToken());
  const [bootError, setBootError] = useState("");
  const [sessionNotice, setSessionNotice] = useState("");
  const [user, setUser] = useState(null);
  const [view, setView] = useState("dashboard");
  const [workouts, setWorkouts] = useState([]);
  const [measurements, setMeasurements] = useState([]);
  const [goals, setGoals] = useState([]);
  const [pendingExercise, setPendingExercise] = useState("");

  const exerciseCache = useRef(new Map());

  const getExercises = useCallback(async (workoutId) => {
    if (exerciseCache.current.has(workoutId)) return exerciseCache.current.get(workoutId);
    const promise = api.listExercises(workoutId);
    exerciseCache.current.set(workoutId, promise);
    try {
      const result = await promise;
      exerciseCache.current.set(workoutId, result);
      return result;
    } catch (err) {
      exerciseCache.current.delete(workoutId);
      throw err;
    }
  }, []);

  const invalidateExercises = useCallback((workoutId) => {
    exerciseCache.current.delete(workoutId);
  }, []);

  const loadAll = useCallback(async () => {
    const [me, ws, ms, gs] = await Promise.all([
      api.me(),
      api.listWorkouts(),
      api.listMeasurements(),
      api.listGoals(),
    ]);
    setUser(me);
    setWorkouts(Array.isArray(ws) ? ws : []);
    setMeasurements(Array.isArray(ms) ? ms : []);
    setGoals(Array.isArray(gs) ? gs : []);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setAuthed(false);
    setUser(null);
    setWorkouts([]);
    setMeasurements([]);
    setGoals([]);
    exerciseCache.current.clear();
    setView("dashboard");
  }, []);

  useEffect(() => {
    setOnUnauthorized(() => {
      logout();
      setSessionNotice("Your session expired — please log in again.");
    });
  }, [logout]);

  useEffect(() => {
    if (!authed) return undefined;
    let cancelled = false;
    setBooting(true);
    loadAll()
      .catch((err) => {
        if (cancelled) return;
        if (err.status !== 401) {
          setBootError(err.message);
          logout();
        }
      })
      .finally(() => { if (!cancelled) setBooting(false); });
    return () => { cancelled = true; };
  }, [authed, loadAll, logout]);

  async function handleAuthed(token) {
    setToken(token);
    setSessionNotice("");
    setBootError("");
    setAuthed(true);
  }

  const refreshWorkouts = useCallback(async () => {
    setWorkouts(await api.listWorkouts());
  }, []);
  const refreshMeasurements = useCallback(async () => {
    setMeasurements(await api.listMeasurements());
  }, []);
  const refreshGoals = useCallback(async () => {
    setGoals(await api.listGoals());
  }, []);

  if (!authed) {
    return (
      <>
        {sessionNotice ? <div className="notice notice-top" role="status">{sessionNotice}</div> : null}
        {bootError ? <div className="notice notice-top" role="alert">{bootError}</div> : null}
        <Auth onAuthed={handleAuthed} />
      </>
    );
  }

  if (booting || !user) {
    return <main className="container"><Loading label="Loading your training data…" /></main>;
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-inner">
          <span className="logo">🏋️ FitTrack Pro</span>
          <span className="topbar-user">{user.name || user.email}</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={logout}>Log out</button>
        </div>
        <nav className="tabs" aria-label="Sections">
          {VIEWS.map(([id, label]) => (
            <button key={id} type="button" className={`tab ${view === id ? "tab-active" : ""}`}
              aria-current={view === id ? "page" : undefined}
              onClick={() => setView(id)}>
              {label}
            </button>
          ))}
        </nav>
      </header>

      <main className="container">
        {view === "dashboard" && (
          <Dashboard user={user} workouts={workouts} measurements={measurements} goals={goals}
            getExercises={getExercises} go={setView} onUserChange={setUser} />
        )}
        {view === "logger" && (
          <Logger workouts={workouts} getExercises={getExercises} invalidateExercises={invalidateExercises}
            onWorkoutsChange={refreshWorkouts}
            pendingExercise={pendingExercise} clearPendingExercise={() => setPendingExercise("")} />
        )}
        {view === "history" && (
          <History workouts={workouts} getExercises={getExercises} onWorkoutsChange={refreshWorkouts} go={setView} />
        )}
        {view === "library" && (
          <Library onUseInLogger={(name) => { setPendingExercise(name); setView("logger"); }} />
        )}
        {view === "records" && (
          <Records workouts={workouts} getExercises={getExercises} go={setView} />
        )}
        {view === "measurements" && (
          <Measurements measurements={measurements} onMeasurementsChange={refreshMeasurements} />
        )}
        {view === "goals" && (
          <Goals goals={goals} workouts={workouts} measurements={measurements}
            getExercises={getExercises} onGoalsChange={refreshGoals} go={setView} />
        )}
        {view === "stats" && <Stats workouts={workouts} />}
      </main>

      <footer className="footer">
        <p className="muted">FitTrack Pro — your workouts, measurements and goals, stored in your own account.</p>
      </footer>
    </div>
  );
}
