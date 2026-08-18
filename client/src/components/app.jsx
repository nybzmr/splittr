import React, { useCallback, useEffect, useMemo, useState } from "react";
import "../styles/app.css";
import { apiPath } from "../api";
import AddExpense from "./add_expense";
import GroupExpenses from "./group_expenses";
import GroupUsers from "./group_users";
import Auth from "./auth";
import GroupHome from "./group_home";

function authHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(path, options = {}, token = "") {
  const headers = { ...(options.headers || {}), ...authHeaders(token) };
  const response = await fetch(apiPath(path), { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Request failed.");
  return data;
}

function validUsers(users) {
  if (!Array.isArray(users)) return [];
  return users.filter((user) => user && typeof user.username === "string" && user.username.trim());
}

function validDebts(debts) {
  if (!Array.isArray(debts)) return [];
  return debts.filter((debt) => debt && typeof debt.from === "string" && typeof debt.to === "string" && Number.isFinite(Number(debt.amount)));
}

function validExpenses(expenses) {
  if (!Array.isArray(expenses)) return [];
  return expenses.filter((expense) => expense && typeof expense.title === "string" && typeof expense.lender === "string" && Array.isArray(expense.borrowers) && Number.isFinite(Number(expense.amount)));
}

function App() {
  const [token, setToken] = useState(() => localStorage.getItem("splittr_token") || "");
  const [currentUser, setCurrentUser] = useState(() => JSON.parse(localStorage.getItem("splittr_user") || "null"));
  const [selectedGroupId, setSelectedGroupId] = useState(() => new URLSearchParams(window.location.search).get("group") || "");
  const [data, setData] = useState({ group: null, users: [], expenses: [], debts: [], optimisedDebts: [], userDebts: [] });
  const [groups, setGroups] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [isOptimised, setIsOptimised] = useState(false);

  const authOptions = useCallback(() => ({ headers: authHeaders(token) }), [token]);
  const authHeaderFactory = useCallback(() => authHeaders(token), [token]);

  const signOut = useCallback(() => {
    localStorage.removeItem("splittr_token");
    localStorage.removeItem("splittr_user");
    localStorage.removeItem("splittr_group");
    setToken("");
    setCurrentUser(null);
    setSelectedGroupId("");
  }, []);

  const refreshGroups = useCallback(async () => {
    const list = await request("/groups", {}, token);
    setGroups(Array.isArray(list) ? list : []);
    return list;
  }, [token]);

  const refreshData = useCallback(async () => {
    if (!selectedGroupId) return false;
    setIsLoading(true);
    try {
      const dashboard = await request(`/groups/${selectedGroupId}/dashboard`, {}, token);
      setData({
        group: dashboard.group,
        users: validUsers(dashboard.users),
        expenses: validExpenses(dashboard.expenses),
        debts: validDebts(dashboard.debts),
        optimisedDebts: validDebts(dashboard.optimisedDebts),
        userDebts: Array.isArray(dashboard.userDebts) ? dashboard.userDebts : [],
      });
      setIsOptimised(false);
      setMessage("");
      return true;
    } catch (error) {
      setMessage(error.message);
      if (error.message.toLowerCase().includes("not a member")) setSelectedGroupId("");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [selectedGroupId, token]);

  useEffect(() => {
    if (!token) { setIsLoading(false); return; }
    refreshGroups().catch((error) => { setMessage(error.message); setIsLoading(false); });
  }, [token, refreshGroups]);

  useEffect(() => {
    if (!token || !selectedGroupId) { setIsLoading(false); return; }
    refreshData();
  }, [token, selectedGroupId, refreshData]);

  function authenticated(payload) {
    localStorage.setItem("splittr_token", payload.token);
    localStorage.setItem("splittr_user", JSON.stringify(payload.user));
    setToken(payload.token);
    setCurrentUser(payload.user);
  }

  function selectGroup(groupId) {
    localStorage.setItem("splittr_group", groupId);
    setSelectedGroupId(groupId);
    window.history.replaceState({}, "", `?group=${encodeURIComponent(groupId)}`);
  }

  function leaveGroupView() {
    localStorage.removeItem("splittr_group");
    setSelectedGroupId("");
    window.history.replaceState({}, "", window.location.pathname);
  }

  async function addExpense(expense) {
    try {
      await request(`/groups/${selectedGroupId}/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(expense),
      }, token);
      const refreshed = await refreshData();
      if (refreshed) setMessage("");
      return refreshed;
    } catch (error) { setMessage(error.message); return false; }
  }

  async function settleDebt(settlement) {
    try {
      const body = { ...settlement };
      await request(`/groups/${selectedGroupId}/debts/settle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }, token);
      const refreshed = await refreshData();
      if (refreshed) setMessage("Settlement recorded.");
      return refreshed;
    } catch (error) { setMessage(error.message); return false; }
  }

  const group = useMemo(() => {
    const activeUser = currentUser?.username || "";
    const usersMinusActive = data.users.filter((user) => user.username !== activeUser);
    const activeDebts = {};
    let outstandingBalance = 0;
    for (const debt of (isOptimised ? data.optimisedDebts : data.debts)) {
      if (debt.from === activeUser) { outstandingBalance += debt.amount; activeDebts[debt.to] = debt; }
      else if (debt.to === activeUser) { outstandingBalance -= debt.amount; activeDebts[debt.from] = debt; }
    }
    return {
      name: data.group?.name || "Group",
      groupId: selectedGroupId,
      inviteCode: data.group?.inviteCode || "",
      users: data.users,
      activeUser,
      expenses: data.expenses,
      debts: isOptimised ? data.optimisedDebts : data.debts,
      usersMinusActive: { users: usersMinusActive, debts: activeDebts, outstandingBalance },
    };
  }, [data, currentUser, selectedGroupId, isOptimised]);

  if (!token || !currentUser) return <Auth onAuthenticated={authenticated} />;
  if (!selectedGroupId) {
    return (
      <div className="App">
        <div className="header-container">
          <h1 className="title">Splittr</h1>
          <div className="header-actions"><span>{currentUser.username}</span><button onClick={signOut} className="header-button">Sign out</button></div>
        </div>
        <GroupHome authOptions={authOptions} authHeaders={authHeaderFactory} onSelectGroup={selectGroup} />
      </div>
    );
  }

  if (isLoading || !data.group) return <div className="App"><div className="header-container"><h1 className="title">Splittr</h1></div><p className="app-message">Loading group...</p></div>;

  return (
    <div className="App">
      <div className="header-container">
        <div className="header-left"><button className="header-button" onClick={leaveGroupView}>← Groups</button><h1 className="title">{group.name}</h1></div>
        <div className="header-actions"><span>{currentUser.username}</span><button onClick={() => refreshData()} className="header-button">Refresh</button><button onClick={signOut} className="header-button">Sign out</button></div>
      </div>
      {message && <p className="app-message" role="status">{message}</p>}
      <div className="invite-banner">Invite code: <strong>{group.inviteCode}</strong> <span>Share this code with another Splittr user.</span></div>
      <div className="main-content-container">
        <GroupExpenses group={group} onClick={addExpense} />
        <GroupUsers group={group} isOptimised={isOptimised} onClick={settleDebt} onToggle={setIsOptimised} />
      </div>
    </div>
  );
}

export default App;
