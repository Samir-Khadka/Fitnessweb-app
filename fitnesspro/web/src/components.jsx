import { useState } from "react";

export function Loading({ label = "Loading…" }) {
  return (
    <div className="state" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      {label}
    </div>
  );
}

export function Empty({ title, hint, action }) {
  return (
    <div className="state">
      <p className="state-title">{title}</p>
      {hint ? <p className="state-hint">{hint}</p> : null}
      {action}
    </div>
  );
}

export function ErrorBanner({ error, onDismiss }) {
  if (!error) return null;
  return (
    <div className="error-banner" role="alert">
      <span>{error}</span>
      {onDismiss ? (
        <button type="button" className="btn btn-ghost btn-sm" onClick={onDismiss} aria-label="Dismiss error">
          ✕
        </button>
      ) : null}
    </div>
  );
}

// Delete button with an inline confirm step (no modal library needed).
export function ConfirmButton({ onConfirm, children, confirmLabel = "Delete for sure?", className = "btn btn-danger" }) {
  const [armed, setArmed] = useState(false);
  if (!armed) {
    return (
      <button type="button" className={className} onClick={() => setArmed(true)}>
        {children}
      </button>
    );
  }
  return (
    <span className="confirm-row">
      <button type="button" className="btn btn-danger" onClick={() => { setArmed(false); onConfirm(); }}>
        {confirmLabel}
      </button>
      <button type="button" className="btn btn-ghost" onClick={() => setArmed(false)}>
        Keep it
      </button>
    </span>
  );
}

export function ProgressBar({ value, label }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div>
      <div className="progress-track" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin="0" aria-valuemax="100" aria-label={label}>
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="progress-label">{label}</div>
    </div>
  );
}

export function Field({ label, htmlFor, children, hint }) {
  return (
    <div className="field">
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {hint ? <small className="hint">{hint}</small> : null}
    </div>
  );
}
