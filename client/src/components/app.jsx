import React, { useCallback, useEffect, useMemo, useState } from "react";
import "../styles/app.css";
import { apiPath } from "../api";
import AddUser from "./add_user";
import GroupExpenses from "./group_expenses";
import GroupUsers from "./group_users";
import UserSwitching from "./user_switching";

async function request(path, options) {
  const response = await fetch(apiPath(path), options);
  const contentType = response.headers.get("content-type") || "";
  const body = contentType.includes("application/json")
    ? await response.json().catch(() => ({}))
    : await response.text().catch(() => "");

  if (!response.ok) {
    const message = typeof body === "string"
      ? body
      : body.error || body.message;
    throw new Error(message || "Request failed.");
  }

  return body;
}

function validUsers(users) {
  if (!Array.isArray(users)) return [];
  return users.filter(
    (user) =>
      user &&
      typeof user.username === "string" &&
      user.username.trim().length > 0,
  );
}

function validDebts(debts) {
  if (!Array.isArray(debts)) return [];
  return debts.filter(
    (debt) =>
      debt &&
      typeof debt.from === "string" &&
      typeof debt.to === "string" &&
      Number.isFinite(Number(debt.amount)),
  );
}

function validExpenses(expenses) {
  if (!Array.isArray(expenses)) return [];
  return expenses.filter(
    (expense) =>
      expense &&
      typeof expense.title === "string" &&
      typeof expense.lender === "string" &&
      Array.isArray(expense.borrowers) &&
      Number.isFinite(Number(expense.amount)),
  );
}

function App() {
  const [data, setData] = useState({ users: [], expenses: [], debts: [] });
  const [activeUser, setActiveUser] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [isOptimised, setIsOptimised] = useState(false);

  const refreshData = useCallback(async () => {
    try {
      const [users, expenses, debts] = await Promise.all([
        request("/users"), request("/expenses"), request("/debts"),
      ]);
      const usableUsers = validUsers(users);
      const usableExpenses = validExpenses(expenses);
      const usableDebts = validDebts(debts);
      setData({
        users: usableUsers,
        expenses: [...usableExpenses].reverse(),
        debts: usableDebts,
      });
      setActiveUser((current) =>
        usableUsers.some((user) => user.username === current)
          ? current
          : usableUsers[0]?.username || "",
      );
      if (usableUsers.length !== (Array.isArray(users) ? users.length : 0)) {
        setMessage("Some malformed user records were skipped. Each user needs a username.");
      }
      return true;
    } catch (error) {
      setMessage(error.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { refreshData(); }, [refreshData]);

  const group = useMemo(() => {
    const usersMinusActive = data.users.filter((user) => user.username !== activeUser);
    const activeDebts = {};
    let outstandingBalance = 0;
    for (const debt of data.debts) {
      if (debt.from === activeUser) {
        outstandingBalance += debt.amount;
        activeDebts[debt.to] = debt;
      } else if (debt.to === activeUser) {
        outstandingBalance -= debt.amount;
        activeDebts[debt.from] = debt;
      }
    }
    return {
      name: "Expenses",
      users: data.users,
      activeUser,
      expenses: data.expenses,
      debts: data.debts,
      usersMinusActive: { users: usersMinusActive, debts: activeDebts, outstandingBalance },
    };
  }, [data, activeUser]);

  async function addUser(username) {
    try {
      await request("/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, firstName: username, lastName: "Member" }),
      });
      const refreshed = await refreshData();
      if (refreshed) setMessage("");
      return refreshed;
    } catch (error) {
      setMessage(error.message);
      return false;
    }
  }

  async function addExpense(expense) {
    try {
      await request("/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(expense),
      });
      setIsOptimised(false);
      const refreshed = await refreshData();
      if (refreshed) setMessage("");
      return refreshed;
    } catch (error) {
      setMessage(error.message);
      return false;
    }
  }

  async function settleDebt(settlement) {
    try {
      await request("/debts/settle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settlement),
      });
      setIsOptimised(false);
      const refreshed = await refreshData();
      if (refreshed) setMessage("Settlement recorded.");
      return refreshed;
    } catch (error) {
      setMessage(error.message);
      return false;
    }
  }

  async function updateOptimisedDebts(isOptimised) {
    try {
      const debts = validDebts(await request(isOptimised ? "/optimisedDebts" : "/debts"));
      setData((current) => ({ ...current, debts }));
      setIsOptimised(isOptimised);
      setMessage("");
    } catch (error) {
      setMessage(error.message);
    }
  }

  if (isLoading) return <div className="App"><div className="header-container"><h1 className="title">Splittr</h1></div></div>;

  return (
    <div className="App">
      <div className="header-container">
        <h1 className="title">Splittr</h1>
        {data.users.length > 0 && <UserSwitching group={group} onClick={setActiveUser} />}
      </div>
      {message && <p className="app-message" role="status">{message}</p>}
      {data.users.length === 0 ? (
        <div className="main-content-container"><div className="group-members-container"><h1 className="group-members-title">Group Members</h1><div className="users-container"><AddUser onClick={addUser} /></div></div></div>
      ) : (
        <div className="main-content-container">
          <GroupExpenses group={group} onClick={addExpense} />
          <GroupUsers group={group} isOptimised={isOptimised} onClick={settleDebt} onToggle={updateOptimisedDebts} onAddUser={addUser} />
        </div>
      )}
    </div>
  );
}

export default App;
