import React, { useState } from "react";
import "../styles/auth.css";
import { apiPath } from "../api";

async function authRequest(path, body) {
  const response = await fetch(apiPath(path), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Authentication request failed.");
  return data;
}

function Auth({ onAuthenticated, modal = false, onClose, initialMode = "login" }) {
  const [mode, setMode] = useState(initialMode);
  const [username, setUsername] = useState(""); const [firstName, setFirstName] = useState(""); const [lastName, setLastName] = useState(""); const [password, setPassword] = useState("");
  const [message, setMessage] = useState(""); const [isSubmitting, setIsSubmitting] = useState(false);
  async function submit(event) {
    event.preventDefault(); setMessage(""); setIsSubmitting(true);
    try { const data = await authRequest(mode === "login" ? "/auth/login" : "/auth/register", { username, firstName, lastName, password }); onAuthenticated(data); }
    catch (error) { setMessage(error.message); } finally { setIsSubmitting(false); }
  }
  const card = <div className="auth-card">
    {modal && <button className="auth-close" onClick={onClose} aria-label="Close">×</button>}
    <div className="auth-brand"><span className="auth-brand-mark">S</span><div><strong>Splittr</strong><span>Shared expenses, simplified.</span></div></div>
    <h1>{mode === "login" ? "Welcome back" : "Create your account"}</h1>
    <p>{mode === "login" ? "Sign in to manage your groups and expenses." : "Create an account to start sharing expenses."}</p>
    <form onSubmit={submit}>
      <input placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required />
      {mode === "register" && <><input placeholder="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} required /><input placeholder="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} required /></>}
      <input type="password" placeholder="Password (6+ characters)" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={6} required />
      <button className="auth-primary" disabled={isSubmitting}>{isSubmitting ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}</button>
    </form>
    {message && <p className="auth-message" role="alert">{message}</p>}
    <button className="auth-link" onClick={() => { setMode(mode === "login" ? "register" : "login"); setMessage(""); }}>{mode === "login" ? "Create an account" : "Already have an account? Sign in"}</button>
  </div>;
  return modal ? <div className="auth-modal-backdrop">{card}</div> : <div className="auth-page">{card}</div>;
}
export default Auth;
