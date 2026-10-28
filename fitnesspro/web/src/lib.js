// Pure helpers: dates, volume, streaks, records. No API calls here, so
// every number on screen can be traced back to the raw API data.

// Parse an ISO-ish string or a plain YYYY-MM-DD date as LOCAL time.
// (new Date("2026-10-28") is UTC midnight — that would shift the day
// for timezones west of UTC, so date-only strings are split by hand.)
export function parseDate(value) {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value).slice(0, 10));
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function dayKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function workoutDay(workout) {
  const d = parseDate(workout.start_time) || parseDate(workout.created_at);
  return d ? dayKey(d) : null;
}

export function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

export function fmtDate(value) {
  const d = parseDate(value);
  if (!d) return "—";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function fmtNum(n, digits = 1) {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return Number(n).toLocaleString(undefined, { maximumFractionDigits: digits });
}

// One set is {reps, weight_kg}. Bodyweight sets carry weight_kg null.
export function setVolume(set) {
  const reps = Number(set.reps) || 0;
  const w = Number(set.weight_kg) || 0;
  return reps * w;
}
export function exerciseVolume(exercise) {
  return (exercise.sets || []).reduce((sum, s) => sum + setVolume(s), 0);
}

// Consecutive days with at least one workout, ending today — or yesterday
// if today has no workout yet (a streak is not broken by "not yet today").
export function computeStreak(workouts) {
  const days = new Set(workouts.map(workoutDay).filter(Boolean));
  if (days.size === 0) return 0;
  const today = dayKey(new Date());
  let cursor = days.has(today) ? new Date() : addDays(new Date(), -1);
  let streak = 0;
  while (days.has(dayKey(cursor))) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

// Monday of the week containing `date` (local time).
export function weekStart(date) {
  const d = new Date(date);
  const dow = (d.getDay() + 6) % 7; // Monday = 0
  return addDays(d, -dow);
}

// Best (heaviest) set per exercise name across all workouts.
export function computeRecords(workoutsWithExercises) {
  const best = new Map(); // normalized name -> record
  for (const { workout, exercises } of workoutsWithExercises) {
    for (const ex of exercises || []) {
      for (const set of ex.sets || []) {
        const w = Number(set.weight_kg);
        if (!w) continue; // bodyweight-only sets have no weight PR
        const key = String(ex.name || "Unnamed").trim().toLowerCase();
        const cur = best.get(key);
        if (!cur || w > cur.weight_kg) {
          best.set(key, {
            name: ex.name || "Unnamed",
            weight_kg: w,
            reps: Number(set.reps) || 0,
            date: workoutDay(workout),
          });
        }
      }
    }
  }
  return [...best.values()].sort((a, b) => b.weight_kg - a.weight_kg);
}

// Last 7 local days (oldest first), filled with 0, from the
// /analytics/weekly_distance payload [{_id: "YYYY-MM-DD", total}].
// (The endpoint groups ALL history, so the last-7-days window is applied here.)
export function last7DaysDistance(rows) {
  const byDay = new Map((rows || []).map((r) => [r._id, Number(r.total) || 0]));
  const out = [];
  for (let i = 6; i >= 0; i--) {
    const key = dayKey(addDays(new Date(), -i));
    out.push({ date: key, km: byDay.get(key) || 0 });
  }
  return out;
}
