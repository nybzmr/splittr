import React, { useEffect, useState } from "react";
import "../styles/group_home.css";
import { apiPath } from "../api";

async function request(path, options = {}) {
  const response = await fetch(apiPath(path), options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Request failed.");
  return data;
}

function GroupHome(props) {
  const [groups, setGroups] = useState([]);
  const [groupName, setGroupName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [message, setMessage] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  async function loadGroups() {
    try {
      const groups = await request("/groups", props.authOptions());
      setGroups(groups);
      setMessage("");
      return groups;
    } catch (error) {
      setMessage(error.message);
      return [];
    }
  }

  useEffect(() => { loadGroups(); }, []);

  async function createGroup(event) {
    event.preventDefault();
    if (!groupName.trim()) return;
    setIsBusy(true);
    try {
      const group = await request("/groups", {
        ...props.authOptions(),
        method: "POST",
        headers: { "Content-Type": "application/json", ...props.authHeaders() },
        body: JSON.stringify({ name: groupName.trim() }),
      });
      setGroupName("");
      props.onSelectGroup(group._id);
    } catch (error) {
      setMessage(error.message);
    } finally { setIsBusy(false); }
  }

  async function joinGroup(event) {
    event.preventDefault();
    if (!inviteCode.trim()) return;
    setIsBusy(true);
    try {
      const group = await request("/groups/join", {
        ...props.authOptions(),
        method: "POST",
        headers: { "Content-Type": "application/json", ...props.authHeaders() },
        body: JSON.stringify({ inviteCode: inviteCode.trim() }),
      });
      setInviteCode("");
      props.onSelectGroup(group._id);
    } catch (error) {
      setMessage(error.message);
    } finally { setIsBusy(false); }
  }

  return (
    <div className="group-home">
      <div className="group-hero">
        <h2>Your groups</h2>
        <p>Create a group or join one using an invite code.</p>
      </div>
      {message && <p className="app-message" role="status">{message}</p>}
      <div className="group-actions">
        <form onSubmit={createGroup} className="group-action-card">
          <h3>Create group</h3>
          <input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="e.g. Goa Trip" maxLength={50} />
          <button className="ge-button" disabled={isBusy}>Create</button>
        </form>
        <form onSubmit={joinGroup} className="group-action-card">
          <h3>Join group</h3>
          <input value={inviteCode} onChange={(e) => setInviteCode(e.target.value.toUpperCase())} placeholder="Invite code" maxLength={8} />
          <button className="ge-button" disabled={isBusy}>Join</button>
        </form>
      </div>
      <div className="group-list">
        {groups.map((group) => (
          <button key={group._id} className="group-card" onClick={() => props.onSelectGroup(group._id)}>
            <strong>{group.name}</strong>
            <span>{group.members?.length || 0} members</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default GroupHome;
