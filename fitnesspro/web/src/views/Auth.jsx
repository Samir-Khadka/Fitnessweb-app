import { useState } from "react";
import { api, ApiError } from "../api.js";
import { ErrorBanner, Field } from "../components.jsx";

// Login / register. The backend returns no token on register, so a
// successful register is followed by an immediate login with the same
// credentials — the user never has to type them twice.
export default function Auth({ onAuthed }) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "register") {
        await api.register(email.trim(), password, name.trim() || undefined);
      }
      const { access_token } = await api.login(email.trim(), password);
      onAuthed(access_token);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-shell">
      <div className="auth-card">
        <p className="logo">FitTrack Pro</p>
        <h1>{mode === "login" ? "Welcome back" : "Create your account"}</h1>
        <p className="muted">
          {mode === "login"
            ? "Log in to see your workouts, measurements and goals."
            : "One account holds all of your training data."}
        </p>
        <ErrorBanner error={error} onDismiss={() => setError("")} />
        <form onSubmit={submit} className="form">
          {mode === "register" ? (
            <Field label="Name" htmlFor="auth-name">
              <input id="auth-name" type="text" autoComplete="name" value={name}
                onChange={(e) => setName(e.target.value)} placeholder="Your name" required />
            </Field>
          ) : null}
          <Field label="Email" htmlFor="auth-email">
            <input id="auth-email" type="email" autoComplete="email" value={email}
              onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
          </Field>
          <Field label="Password" htmlFor="auth-password">
            <input id="auth-password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"}
              value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
          </Field>
          <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
            {busy ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}
          </button>
        </form>
        <p className="auth-switch">
          {mode === "login" ? (
            <>New here? <button type="button" className="link" onClick={() => { setMode("register"); setError(""); }}>Create an account</button></>
          ) : (
            <>Already have an account? <button type="button" className="link" onClick={() => { setMode("login"); setError(""); }}>Log in</button></>
          )}
        </p>
      </div>
    </main>
  );
}
