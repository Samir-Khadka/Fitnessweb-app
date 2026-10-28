# FitTrack Pro — web app

React + Vite frontend for the FitTrack Pro Flask API (one directory up in
`../fittrack_pro_backend`). Mobile-first, light theme, no UI framework and
no chart library — the weight chart is a hand-rolled SVG.

## Run it

```bash
# 1. Start the API (needs MongoDB; default mongodb://localhost:27017/fittrack_db)
cd ../fittrack_pro_backend
pip install -r requirements.txt
python app.py          # listens on http://localhost:5000

# 2. Start the web app (in another terminal)
cd ../web
npm install
npm run dev            # http://localhost:5173
```

## Configure the API URL

The app calls `VITE_API_URL` (default `http://localhost:5000`). For a
deployed API, create a `.env` file next to this README:

```
VITE_API_URL=https://your-api-host.example
```

Then rebuild — Vite bakes the value in at build time.

## Production build

```bash
npm run build    # outputs static files to dist/
npm run preview  # serve the build locally to check it
```

Serve `dist/` from any static host. The API must allow the web origin
(the Flask app enables CORS for all origins).

## What is where

- `src/api.js` — the only place that talks to the backend. Endpoint
  shapes are documented at the top of the file.
- `src/lib.js` — pure helpers: streaks, volume, personal records, dates.
- `src/exercises.js` — reference exercise library (well-known lifts, NOT
  user data; labelled as such in the UI).
- `src/views/` — one file per screen: Auth, Dashboard, Logger (with rest
  timer), History, Library, Records, Measurements, Goals, Stats.

## API notes the frontend relies on

- Register (`POST /auth/register`) returns no token — the app logs in
  immediately after registering.
- A workout's `exercises` field is a list of exercise IDs. Exercise
  details come from `GET /exercises?workout_id=<id>` (added for this app;
  see the backend change list in the repo history).
- Workout `type` is a free string — the UI stores the workout's name
  there (e.g. "Push Day").
- Dates sent to the API are local wall-clock strings (`YYYY-MM-DDTHH:MM`
  for workouts, `YYYY-MM-DD` for measurements) so a day means the same
  day on the server and in the browser.
- Access tokens last 7 days by default (backend setting
  `JWT_ACCESS_TOKEN_EXPIRES_DAYS`). On a 401 the app returns to the login
  screen with a "session expired" notice.
- Production API deployments must set `MONGO_URI` and `JWT_SECRET_KEY`
  environment variables — the backend defaults are for local dev only.
