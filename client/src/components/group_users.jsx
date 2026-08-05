import React, { useEffect, useMemo, useState } from "react";
import "../styles/group_users.css";
import User from "./user";
import AddUser from "./add_user";
import example from "../assets/Optimise.svg";

function toPaise(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number * 100) : 0;
}

function GroupUsers(props) {
  const [settleAmount, setSettleAmount] = useState("");
  const [selectedUser, setSelectedUser] = useState("");
  const [responseMsg, setResponseMsg] = useState("");
  const [msgClasses, setMsgClasses] = useState("group-members-msg");

  const settleableUsers = useMemo(() => props.group.usersMinusActive.users.filter((user) => {
    const debt = props.group.usersMinusActive.debts[user.username];
    return debt && debt.from === user.username && debt.to === props.group.activeUser;
  }), [props.group.usersMinusActive.users, props.group.usersMinusActive.debts, props.group.activeUser]);
  const selectedDebt = props.group.usersMinusActive.debts[selectedUser];
  const settleAmountInPaise = toPaise(settleAmount);
  const canSettle =
    selectedUser &&
    settleAmountInPaise > 0 &&
    selectedDebt &&
    settleAmountInPaise <= selectedDebt.amount;

  useEffect(() => {
    setSelectedUser((current) =>
      settleableUsers.some((user) => user.username === current)
        ? current
        : settleableUsers[0]?.username || "",
    );
  }, [settleableUsers]);

  useEffect(() => {
    if (!responseMsg) return undefined;
    setMsgClasses("group-members-msg");
    const timer = setTimeout(() => {
      setMsgClasses("group-members-msg group-members-msg-fade");
    }, 1500);
    return () => clearTimeout(timer);
  }, [responseMsg]);

  // Returns styles to grey out button
  function disabledBtnStyles() {
    if (!canSettle) {
      return {
        backgroundColor: "lightgrey",
        boxShadow: "0 5px 0 grey",
        transform: "none",
        opacity: "20%",
      };
    }
  }

  // Submit a settlement through the parent, which refreshes all ledger data.
  async function settleUp() {
    if (!canSettle) return;
    // Creates object to send in body
    const settleObject = {
      from: selectedUser,
      to: props.group.activeUser,
      amount: settleAmountInPaise,
    };

    // Disable and clear form
    setSettleAmount("");

    const settled = await props.onClick(settleObject);
    setResponseMsg(settled ? "Settlement recorded." : "Unable to settle this debt.");
  }

  function addUserToGroup(user) {
    return props.onAddUser(user);
  }

  // Changes inline styles of smart split toggle
  function toggleSmartSplit() {
    props.onToggle(!props.isOptimised);
  }

  return (
    <div className="group-members-container">
      <div className="toggle-container">
        <div className="info-div">
          i
          <div className="info-hover">
            Optimises debts to minimise transactions
            <img
              alt="Smart Split Explanation"
              style={{
                paddingTop: "0.5em",
                width: "25em",
                height: "10em",
              }}
              src={example}
            ></img>
          </div>
        </div>
        <div>
          <button type="button" className="split-toggle" aria-pressed={props.isOptimised} onClick={toggleSmartSplit}>
            <div
              className="circle-toggle"
              style={{
                marginLeft: props.isOptimised ? "1.7em" : "0.3em",
                backgroundColor: props.isOptimised
                  ? "rgb(61, 201, 112, 0.65)"
                  : "rgb(201, 61, 61, 0.65)",
                }}
            ></div>
          </button>
          <p className="toggle-header">Smart Split </p>
        </div>
      </div>
      <h1 className="group-members-title">Group Members</h1>
      <p className={msgClasses}>{responseMsg}</p>
      <div className="users-container">
        <div className="settle-container">
          {props.isOptimised ? <p className="group-members-msg">Smart Split shows payment suggestions. Turn it off before recording a settlement.</p> : settleableUsers.length > 0 ? <div>
            <select name="users" value={selectedUser} onChange={(event) => setSelectedUser(event.target.value)}>
              {settleableUsers.map((user) => (
                <option key={user.username} value={user.username}>{user.username}</option>
              ))}
            </select>
            <input
              onChange={(e) => {
                setSettleAmount(e.target.value);
              }}
              value={settleAmount}
              type="number"
              placeholder="₹"
              min={0}
              step="0.01"
              max={selectedDebt ? (selectedDebt.amount / 100).toFixed(2) : undefined}
            ></input>
          </div> : <p className="group-members-msg">No one currently owes {props.group.activeUser}.</p>}
          {!props.isOptimised && selectedDebt && settleAmountInPaise > selectedDebt.amount && <p className="group-members-msg">Amount is higher than this debt.</p>}
          {!props.isOptimised && settleableUsers.length > 0 && <button
            disabled={!canSettle}
            style={disabledBtnStyles()}
            onClick={settleUp}
            className="ge-button"
          >
            Settle Up
          </button>}
        </div>
        {props.group.usersMinusActive.users.map((user) => (
          <User
            group={props.group.usersMinusActive}
            user={user}
            key={user.username}
          ></User>
        ))}
        <AddUser
          onClick={(user) => {
            return addUserToGroup(user);
          }}
        ></AddUser>
      </div>
    </div>
  );
}

export default GroupUsers;
