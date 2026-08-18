import React, { useState } from "react";
import "../styles/auth.css";
import { apiPath } from "../api";

async function authRequest(path, body) {
  const response = await fetch(apiPath(path), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Authentication request failed.");
  return data;
}

function Auth(props) {
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setMessage("");
    setIsSubmitting(true);
    try {
      const data = await authRequest(mode === "login" ? "/auth/login" : "/auth/register", {
        username,
        firstName,
        lastName,
        password,
      });
      props.onAuthenticated(data);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Splittr</h1>
        <p>{mode === "login" ? "Sign in to your account" : "Create your Splittr account"}</p>
        <form onSubmit={submit}>
          <input placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
          {mode === "register" && <>
            <input placeholder="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            <input placeholder="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </>}
          <input type="password" placeholder="Password (6+ characters)" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} />
          <button className="auth-primary" disabled={isSubmitting}>{isSubmitting ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}</button>
        </form>
        {message && <p className="auth-message" role="alert">{message}</p>}
        <button className="auth-link" onClick={() => { setMode(mode === "login" ? "register" : "login"); setMessage(""); }}>
          {mode === "login" ? "Create an account" : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}

export default Auth;
