import React, { useEffect, useState } from "react";
import "../styles/group_home.css";
import { apiPath } from "../api";

async function request(path, options = {}) { const response = await fetch(apiPath(path), options); const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(data.error || "Request failed."); return data; }

function GroupHome(props) {
  const guest = Boolean(props.guest);
  const [groups, setGroups] = useState(props.groups || []); const [groupName, setGroupName] = useState(""); const [inviteCode, setInviteCode] = useState(""); const [message, setMessage] = useState(""); const [busyAction, setBusyAction] = useState("");
  async function loadGroups() { if (guest) return; try { const list = await request("/groups", props.authOptions()); setGroups(list); setMessage(""); } catch (e) { setMessage(e.message); } }
  useEffect(() => { loadGroups(); }, [props.groups, guest]);
  useEffect(() => { setGroups(props.groups || []); }, [props.groups]);

  function requireAuth() { props.onRequireAuth?.("login"); }

  async function createGroup(e) {
    e.preventDefault(); if (guest) return requireAuth(); if (!groupName.trim()) return; setBusyAction("create");
    try { const group = await request("/groups", { ...props.authOptions(), method: "POST", headers: { "Content-Type": "application/json", ...props.authHeaders() }, body: JSON.stringify({ name: groupName.trim() }) }); setGroupName(""); props.onRefreshGroups?.(); props.onSelectGroup(group._id); }
    catch (e) { setMessage(e.message); } finally { setBusyAction(""); }
  }
  async function joinGroup(e) {
    e.preventDefault(); if (guest) return requireAuth(); if (!inviteCode.trim()) return; setBusyAction("join");
    try { const group = await request("/groups/join", { ...props.authOptions(), method: "POST", headers: { "Content-Type": "application/json", ...props.authHeaders() }, body: JSON.stringify({ inviteCode: inviteCode.trim() }) }); setInviteCode(""); props.onRefreshGroups?.(); props.onSelectGroup(group._id); }
    catch (e) { setMessage(e.message); } finally { setBusyAction(""); }
  }

  return <div className="groups-page">
    <div className="groups-hero"><span className="eyebrow">Workspace</span><h1>{guest ? "Shared expenses, without the clutter." : "Your groups"}</h1><p>{guest ? "Create a space for trips, roommates, dinners, and shared budgets. Sign in only when you are ready to save changes." : "Keep trips, roommates, dinners, and shared budgets organized in separate spaces."}</p></div>
    {message && <div className="inline-alert error">{message}</div>}
    <div className="group-create-grid">
      <form className="action-card" onSubmit={createGroup}><div className="card-icon">＋</div><div><span className="eyebrow">Start fresh</span><h2>Create a group</h2><p>Set up a shared ledger and invite your friends.</p></div><input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="e.g. Goa trip" maxLength={50} /><button type="submit" className="button button-primary" disabled={!!busyAction}>{busyAction === "create" ? "Creating…" : guest ? "Log in to create" : "Create group"}</button></form>
      <form className="action-card" onSubmit={joinGroup}><div className="card-icon accent">↗</div><div><span className="eyebrow">Have an invite?</span><h2>Join a group</h2><p>Enter the 8-character invite code shared by a group member.</p></div><input value={inviteCode} onChange={(e) => setInviteCode(e.target.value.toUpperCase())} placeholder="AB12CD34" maxLength={8} /><button type="submit" className="button button-secondary" disabled={!!busyAction}>{busyAction === "join" ? "Joining…" : guest ? "Log in to join" : "Join group"}</button></form>
    </div>
    <div className="section-heading"><div><span className="eyebrow">Your workspaces</span><h2>{guest ? "Groups" : "Your groups"}</h2></div>{!guest && <span className="count-pill">{groups.length}</span>}</div>
    {guest ? <div className="guest-groups-card"><div className="guest-lock">S</div><div><strong>Log in to see your existing groups</strong><span>Your groups and shared balances are private to your account.</span></div><button className="button button-ghost" onClick={requireAuth}>Log in</button></div> : groups.length === 0 ? <div className="empty-state large"><strong>No groups yet</strong><span>Create your first group or join one with an invite code.</span></div> : <div className="group-card-grid">{groups.map((group) => <button className="workspace-card" key={group._id} onClick={() => props.onSelectGroup(group._id)}><div className="workspace-card-top"><div className="workspace-mark">{group.name[0]?.toUpperCase()}</div><div className="workspace-card-meta"><span>{group.members?.length || 0} members</span><span className={`workspace-status ${group.smartSplitEnabled ? "active" : ""}`}>{group.smartSplitEnabled ? "Smart Split on" : "Standard"}</span></div></div><strong>{group.name}</strong><span className="workspace-card-footer"><span>Open workspace</span><span className="workspace-arrow">→</span></span></button>)}</div>}
  </div>;
}
export default GroupHome;
