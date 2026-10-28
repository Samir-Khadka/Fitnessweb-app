// Tiny API client for the FitTrack Pro Flask backend.
//
// Backend contract (read from fitnesspro/fittrack_pro_backend, do not guess):
//  - Base URL from VITE_API_URL, default http://localhost:5000 (local dev).
//  - Auth: POST /auth/register {email, password, name} -> 201 {user}
//          POST /auth/login    {email, password}      -> 200 {access_token}
//    (register does NOT return a token — the app logs in right after.)
//  - Every other call sends `Authorization: Bearer <token>`.
//  - Errors are JSON {msg: "..."}; deletes return 204 with no body.
//  - IDs arrive as `id` (ObjectId already stringified by the backend).
//  - Workout `exercises` is a list of exercise IDs, not embedded docs —
//    exercise details come from GET /exercises?workout_id=<id>.

const BASE = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/+$/, "");
const TOKEN_KEY = "fittrack_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

// Called on 401 so the app can bounce back to the login screen.
let onUnauthorized = null;
export function setOnUnauthorized(fn) {
  onUnauthorized = fn;
}

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function request(path, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError("Could not reach the server. Is the API running?", 0);
  }
  if (res.status === 204) return null;
  let data = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }
  if (!res.ok) {
    if (res.status === 401 && onUnauthorized) onUnauthorized();
    const msg =
      (data && (data.msg || data.error)) ||
      `Request failed (${res.status})`;
    throw new ApiError(msg, res.status);
  }
  return data;
}

export const api = {
  register: (email, password, name) =>
    request("/auth/register", { method: "POST", body: { email, password, name }, auth: false }),
  login: (email, password) =>
    request("/auth/login", { method: "POST", body: { email, password }, auth: false }),
  me: () => request("/users/me"),
  updateUser: (id, patch) => request(`/users/${id}`, { method: "PUT", body: patch }),

  listWorkouts: () => request("/workouts"),
  getWorkout: (id) => request(`/workouts/${id}`),
  createWorkout: (doc) => request("/workouts", { method: "POST", body: doc }),
  updateWorkout: (id, patch) => request(`/workouts/${id}`, { method: "PUT", body: patch }),
  deleteWorkout: (id) => request(`/workouts/${id}`, { method: "DELETE" }),
  weeklyDistance: () => request("/workouts/analytics/weekly_distance"),

  addExercise: (workoutId, { name, sets }) =>
    request(`/exercises/${workoutId}`, { method: "POST", body: { name, sets } }),
  updateExercise: (id, patch) => request(`/exercises/${id}`, { method: "PUT", body: patch }),
  deleteExercise: (id) => request(`/exercises/${id}`, { method: "DELETE" }),
  listExercises: (workoutId) =>
    request(`/exercises?workout_id=${encodeURIComponent(workoutId)}`),

  listMeasurements: (type) =>
    request(type ? `/measurements?type=${encodeURIComponent(type)}` : "/measurements"),
  addMeasurement: (doc) => request("/measurements", { method: "POST", body: doc }),
  deleteMeasurement: (id) => request(`/measurements/${id}`, { method: "DELETE" }),

  listGoals: () => request("/goals"),
  createGoal: (doc) => request("/goals", { method: "POST", body: doc }),
  updateGoal: (id, patch) => request(`/goals/${id}`, { method: "PUT", body: patch }),
  deleteGoal: (id) => request(`/goals/${id}`, { method: "DELETE" }),
};
