import React, { useCallback, useEffect, useMemo, useState } from "react";
import "../styles/app.css";
import { apiPath } from "../api";
import GroupExpenses from "./group_expenses";
import GroupUsers from "./group_users";
import Auth from "./auth";
import GroupHome from "./group_home";

function authHeaders(token) { return token ? { Authorization: `Bearer ${token}` } : {}; }
async function request(path, options = {}, token = "") { const response = await fetch(apiPath(path), { ...options, headers: { ...(options.headers || {}), ...authHeaders(token) } }); const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(data.error || "Request failed."); return data; }
function validUsers(v) { return Array.isArray(v) ? v.filter((u) => u && typeof u.username === "string") : []; }
function validDebts(v) { return Array.isArray(v) ? v.filter((d) => d && typeof d.from === "string" && typeof d.to === "string" && Number.isFinite(Number(d.amount))) : []; }
function validExpenses(v) { return Array.isArray(v) ? v.filter((e) => e && typeof e.title === "string" && typeof e.lender === "string" && Array.isArray(e.borrowers) && Number.isFinite(Number(e.amount))) : []; }
function App() {
  const [token, setToken] = useState(() => localStorage.getItem("splittr_token") || "");
  const [currentUser, setCurrentUser] = useState(() => JSON.parse(localStorage.getItem("splittr_user") || "null"));
  const [selectedGroupId, setSelectedGroupId] = useState(() => new URLSearchParams(window.location.search).get("group") || localStorage.getItem("splittr_group") || "");
  const [data, setData] = useState({ group: null, users: [], expenses: [], debts: [], optimisedDebts: [], userDebts: [] });
  const [groups, setGroups] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");
  const [isOptimised, setIsOptimised] = useState(() => {
    const id = new URLSearchParams(window.location.search).get("group") || localStorage.getItem("splittr_group") || "";
    return id ? localStorage.getItem(`splittr_smart_split_${id}`) === "true" : false;
  });

  const refreshGroups = useCallback(async () => { const list = await request("/groups", {}, token); setGroups(Array.isArray(list) ? list : []); return list; }, [token]);
  const refreshData = useCallback(async () => { if (!selectedGroupId) return false; setIsLoading(true); try { const d = await request(`/groups/${selectedGroupId}/dashboard`, {}, token); setData({ group: d.group, users: validUsers(d.users), expenses: validExpenses(d.expenses), debts: validDebts(d.debts), optimisedDebts: validDebts(d.optimisedDebts), userDebts: Array.isArray(d.userDebts) ? d.userDebts : [] }); setMessage(""); return true; } catch (e) { setMessage(e.message); setMessageType("error"); if (e.message.toLowerCase().includes("not a member")) setSelectedGroupId(""); return false; } finally { setIsLoading(false); } }, [selectedGroupId, token]);

  useEffect(() => { if (!token) { setIsLoading(false); return; } refreshGroups().catch((e) => { setMessage(e.message); setMessageType("error"); setIsLoading(false); }); }, [token, refreshGroups]);
  useEffect(() => {
    if (!selectedGroupId) {
      setIsOptimised(false);
      return;
    }
    setIsOptimised(localStorage.getItem(`splittr_smart_split_${selectedGroupId}`) === "true");
    refreshData();
  }, [token, selectedGroupId, refreshData]);
  useEffect(() => { if (!message) return; const t = setTimeout(() => setMessage(""), 3500); return () => clearTimeout(t); }, [message]);

  const signOut = () => { localStorage.clear(); setToken(""); setCurrentUser(null); setSelectedGroupId(""); };
  const authenticated = (payload) => { localStorage.setItem("splittr_token", payload.token); localStorage.setItem("splittr_user", JSON.stringify(payload.user)); setToken(payload.token); setCurrentUser(payload.user); };
  const selectGroup = (id) => {
    localStorage.setItem("splittr_group", id);
    setSelectedGroupId(id);
    setIsOptimised(localStorage.getItem(`splittr_smart_split_${id}`) === "true");
    window.history.replaceState({}, "", `?group=${encodeURIComponent(id)}`);
  };

  const setSmartSplit = (enabled) => {
    setIsOptimised(enabled);
    if (selectedGroupId) {
      localStorage.setItem(`splittr_smart_split_${selectedGroupId}`, String(enabled));
    }
  };
  const leaveGroupView = () => {
    localStorage.removeItem("splittr_group");
    setSelectedGroupId("");
    setData({ group: null, users: [], expenses: [], debts: [], optimisedDebts: [], userDebts: [] });
    setIsOptimised(false);
    window.history.replaceState({}, "", window.location.pathname);
  };
  const action = async (fn, success = "Saved.") => { try { const result = await fn(); const refreshed = await refreshData(); if (refreshed) { setMessage(success); setMessageType("success"); } return refreshed; } catch (e) { setMessage(e.message); setMessageType("error"); return false; } };

  const addExpense = (expense) => action(() => request(`/groups/${selectedGroupId}/expenses`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(expense) }, token), "Expense added.");
  const editExpense = (expense) => action(() => request(`/groups/${selectedGroupId}/expenses/${expense._id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(expense) }, token), "Expense updated.");
  const deleteExpense = (id) => action(() => request(`/groups/${selectedGroupId}/expenses/${id}`, { method: "DELETE" }, token), "Expense deleted.");
  const settleDebt = (settlement) => action(() => request(`/groups/${selectedGroupId}/debts/settle`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settlement) }, token), "Settlement recorded.");
  const clearDebt = (debt) => action(() => request(`/groups/${selectedGroupId}/debts/${encodeURIComponent(debt.from)}/${encodeURIComponent(debt.to)}`, { method: "DELETE" }, token), "Debt cleared.");

  const group = useMemo(() => { const activeUser = currentUser?.username || ""; const otherUsers = data.users.filter((u) => u.username !== activeUser); const activeDebts = {}; let balance = 0; const debts = isOptimised ? data.optimisedDebts : data.debts; for (const debt of debts) { if (debt.from === activeUser) { balance += debt.amount; activeDebts[debt.to] = debt; } else if (debt.to === activeUser) { balance -= debt.amount; activeDebts[debt.from] = debt; } } return { name: data.group?.name || "Group", groupId: selectedGroupId, inviteCode: data.group?.inviteCode || "", users: data.users, activeUser, expenses: data.expenses, debts: data.debts, optimisedDebts: data.optimisedDebts, usersMinusActive: { users: otherUsers, debts: activeDebts, outstandingBalance: balance } }; }, [data, currentUser, selectedGroupId, isOptimised]);

  if (!token || !currentUser) return <Auth onAuthenticated={authenticated} />;
  if (!selectedGroupId) return <div className="app-shell"><header className="topbar"><div className="brand"><span className="brand-mark">S</span><div><strong>Splittr</strong><span>Shared expenses, simplified.</span></div></div><div className="topbar-user"><div className="avatar small">{currentUser.username[0]?.toUpperCase()}</div><span>{currentUser.username}</span><button className="button button-ghost" onClick={signOut}>Sign out</button></div></header><main className="page-container"><GroupHome authOptions={() => ({ headers: authHeaders(token) })} authHeaders={() => authHeaders(token)} onSelectGroup={selectGroup} groups={groups} /></main></div>;
  if (isLoading || !data.group) return <div className="app-shell"><header className="topbar"><div className="brand"><span className="brand-mark">S</span><div><strong>Splittr</strong><span>Loading your group…</span></div></div></header><main className="page-container"><div className="loading-state"><div className="spinner" />Loading group</div></main></div>;
  return <div className="app-shell"><header className="topbar"><div className="topbar-left"><button className="button button-ghost" onClick={leaveGroupView}>← Groups</button><div className="brand compact"><span className="brand-mark">S</span><div><strong>{group.name}</strong><span>Group workspace</span></div></div></div><div className="topbar-user"><div className="invite-pill">Invite <strong>{group.inviteCode}</strong></div><div className="avatar small">{currentUser.username[0]?.toUpperCase()}</div><span>{currentUser.username}</span><button className="button button-ghost" onClick={signOut}>Sign out</button></div></header><main className="page-container">{message && <div className={`toast ${messageType}`}>{message}</div>}<div className="page-grid"><GroupExpenses group={group} onAddExpense={addExpense} onEdit={editExpense} onDeleteExpense={deleteExpense} /><GroupUsers group={group} isOptimised={isOptimised} onClick={settleDebt} onClearDebt={clearDebt} onToggle={setSmartSplit} /></div></main></div>;
}
export default App;
