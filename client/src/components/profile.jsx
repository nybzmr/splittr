import React, { useState } from "react";
import "../styles/profile.css";
import { apiPath } from "../api";

async function request(path, options, token) {
  const response = await fetch(apiPath(path), { ...options, headers: { ...(options.headers || {}), Authorization: `Bearer ${token}` } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Request failed.");
  return data;
}

function Profile({ token, user, onClose, onUpdated }) {
  const [firstName, setFirstName] = useState(user.firstName || "");
  const [lastName, setLastName] = useState(user.lastName || "");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true); setMessage("");
    try {
      const data = await request("/auth/me", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ firstName, lastName, password }) }, token);
      onUpdated(data.user);
    } catch (e) { setMessage(e.message); } finally { setBusy(false); }
  }
  return <div className="modal-backdrop">
    <div className="modal-card profile-modal">
      <div className="modal-header"><div><span className="eyebrow">Account</span><h3>Your profile</h3><p>Update your name or password.</p></div><button className="icon-button" onClick={onClose}>×</button></div>
      <div className="profile-body">
        <div className="profile-identity"><div className="profile-avatar">{user.username[0]?.toUpperCase()}</div><div><strong>{user.username}</strong><span>Username cannot be changed.</span></div></div>
        <div className="profile-grid"><label>First name<input value={firstName} onChange={(e) => setFirstName(e.target.value)} /></label><label>Last name<input value={lastName} onChange={(e) => setLastName(e.target.value)} /></label></div>
        <label>New password<input type="password" placeholder="Leave blank to keep current password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} /></label>
        {message && <div className="inline-alert error">{message}</div>}
        <div className="modal-footer"><button className="button button-ghost" onClick={onClose}>Cancel</button><button className="button button-primary" disabled={busy} onClick={save}>{busy ? "Saving…" : "Save changes"}</button></div>
      </div>
    </div>
  </div>;
}
export default Profile;
