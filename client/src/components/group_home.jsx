import React, { useEffect, useState } from "react";
import "../styles/group_home.css";
import { apiPath } from "../api";

async function request(path, options = {}) { const response = await fetch(apiPath(path), options); const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(data.error || "Request failed."); return data; }

function GroupHome(props) {
  const [groups, setGroups] = useState(props.groups || []);
  const [groupName, setGroupName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [message, setMessage] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  async function loadGroups() { try { const list = await request("/groups", props.authOptions()); setGroups(list); setMessage(""); } catch (e) { setMessage(e.message); } }
  useEffect(() => { loadGroups(); }, []);

  async function createGroup(e) { e.preventDefault(); if (!groupName.trim()) return; setIsBusy(true); try { const group = await request("/groups", { ...props.authOptions(), method: "POST", headers: { "Content-Type": "application/json", ...props.authHeaders() }, body: JSON.stringify({ name: groupName.trim() }) }); setGroupName(""); props.onSelectGroup(group._id); } catch (e) { setMessage(e.message); } finally { setIsBusy(false); } }
  async function joinGroup(e) { e.preventDefault(); if (!inviteCode.trim()) return; setIsBusy(true); try { const group = await request("/groups/join", { ...props.authOptions(), method: "POST", headers: { "Content-Type": "application/json", ...props.authHeaders() }, body: JSON.stringify({ inviteCode: inviteCode.trim() }) }); setInviteCode(""); props.onSelectGroup(group._id); } catch (e) { setMessage(e.message); } finally { setIsBusy(false); } }

  return <div className="groups-page">
    <div className="groups-hero"><span className="eyebrow">Workspace</span><h1>Your groups</h1><p>Keep trips, roommates, dinners, and shared budgets organized in separate spaces.</p></div>
    {message && <div className="inline-alert error">{message}</div>}
    <div className="group-create-grid">
      <form className="action-card" onSubmit={createGroup}><div className="card-icon">＋</div><div><span className="eyebrow">Start fresh</span><h2>Create a group</h2><p>Set up a shared ledger and invite your friends.</p></div><input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="e.g. Goa trip" maxLength={50} /><button className="button button-primary" disabled={isBusy}>{isBusy ? "Creating…" : "Create group"}</button></form>
      <form className="action-card" onSubmit={joinGroup}><div className="card-icon accent">↗</div><div><span className="eyebrow">Have an invite?</span><h2>Join a group</h2><p>Enter the 8-character invite code shared by a group member.</p></div><input value={inviteCode} onChange={(e) => setInviteCode(e.target.value.toUpperCase())} placeholder="AB12CD34" maxLength={8} /><button className="button button-secondary" disabled={isBusy}>{isBusy ? "Joining…" : "Join group"}</button></form>
    </div>
    <div className="section-heading"><div><span className="eyebrow">Your workspaces</span><h2>Groups</h2></div><span className="count-pill">{groups.length}</span></div>
    {groups.length === 0 ? <div className="empty-state large"><strong>No groups yet</strong><span>Create your first group or join one with an invite code.</span></div> : <div className="group-card-grid">{groups.map((group) => <button className="workspace-card" key={group._id} onClick={() => props.onSelectGroup(group._id)}><div className="workspace-card-top"><div className="workspace-mark">{group.name[0]?.toUpperCase()}</div><span className="workspace-arrow">→</span></div><strong>{group.name}</strong><span>{group.members?.length || 0} member{group.members?.length === 1 ? "" : "s"}</span></button>)}</div>}
  </div>;
}
export default GroupHome;
