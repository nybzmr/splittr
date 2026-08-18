import React, { useEffect, useMemo, useState } from "react";
import "../styles/group_users.css";

function formatMoney(paise) { return `₹${(paise / 100).toFixed(2)}`; }

function GroupUsers(props) {
  const [settleAmount, setSettleAmount] = useState("");
  const [selectedUser, setSelectedUser] = useState("");
  const [busy, setBusy] = useState(false);

  const debtMap = props.group.usersMinusActive.debts;
  const people = props.group.usersMinusActive.users;
  const settleableUsers = useMemo(() => people.filter((user) => { const debt = debtMap[user.username]; return debt && debt.from === user.username && debt.to === props.group.activeUser; }), [people, debtMap, props.group.activeUser]);
  const selectedDebt = debtMap[selectedUser];
  const amount = Math.round(Number(settleAmount || 0) * 100);
  const canSettle = !!selectedDebt && amount > 0 && amount <= selectedDebt.amount;

  useEffect(() => { if (!settleableUsers.some((u) => u.username === selectedUser)) setSelectedUser(settleableUsers[0]?.username || ""); }, [settleableUsers, selectedUser]);

  async function settleUp() {
    if (!canSettle || busy) return;
    setBusy(true);
    const ok = await props.onClick({ from: selectedUser, to: props.group.activeUser, amount });
    if (ok) setSettleAmount("");
    setBusy(false);
  }

  async function clearDebt(debt) {
    if (!window.confirm(`Clear ${formatMoney(debt.amount)} owed by ${debt.from} to ${debt.to}?`)) return;
    await props.onClearDebt(debt);
  }

  const hasSmartSplitResult = props.group.optimisedDebts.length > 0;
  const smartSplitDisabled = !hasSmartSplitResult && props.group.debts.length === 0;

  const myNetRecord = props.group.userDebts?.find((item) => item.username === props.group.activeUser);
  const myNet = Number(myNetRecord?.netDebt || 0);
  const canLeave = myNet === 0;
  const allMembersSettled = Array.isArray(props.group.userDebts) && props.group.userDebts.length > 0 && props.group.userDebts.every((item) => Number(item.netDebt || 0) === 0);
  return <section className="panel members-panel">
    <div className="panel-header members-header"><div><span className="eyebrow">Balances</span><h2>Group members</h2><p>See who owes you and settle directly.</p></div><label className={`smart-toggle ${smartSplitDisabled ? "disabled" : ""}`} title={smartSplitDisabled ? "Add an expense before using Smart Split." : "This setting is shared by everyone in the group."}><span>Smart Split</span><input type="checkbox" checked={props.isOptimised} disabled={smartSplitDisabled} onChange={(e) => props.onToggle(e.target.checked)} /><span className="toggle-track"><span /></span></label></div>
    {props.isOptimised && hasSmartSplitResult && <div className="smart-summary"><div><span>Current</span><strong>{props.group.debts.length}</strong><small>payments</small></div><div className="smart-arrow">→</div><div><span>Optimized</span><strong>{props.group.optimisedDebts.length}</strong><small>payments</small></div><div className="smart-note">Smart Split reduces the number of transfers needed to settle the group.</div></div>}

    {!props.isOptimised && settleableUsers.length > 0 && <div className="settle-card"><div><span className="eyebrow">Settle a debt</span><strong>{selectedUser} owes you {selectedDebt ? formatMoney(selectedDebt.amount) : ""}</strong></div><div className="settle-form"><select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)}>{settleableUsers.map((u) => <option key={u.username}>{u.username}</option>)}</select><input value={settleAmount} onChange={(e) => setSettleAmount(e.target.value)} type="number" min="0.01" step="0.01" placeholder="Amount" /><button className="button button-primary" disabled={!canSettle || busy} onClick={settleUp}>{busy ? "Saving…" : "Settle"}</button></div></div>}

    {people.length === 0 ? <div className="empty-state"><strong>No other members</strong><span>Invite someone to start sharing expenses.</span></div> : <div className="member-list">{people.map((user) => {
      const debt = debtMap[user.username];
      const owesYou = debt && debt.from === user.username;
      const youOwe = debt && debt.to === user.username;
      return <div className="member-row" key={user.username}><div className="avatar">{user.username[0]?.toUpperCase()}</div><div className="member-info"><strong>{user.username}</strong><span>{user.firstName} {user.lastName}</span></div><div className={`member-balance ${owesYou ? "positive" : youOwe ? "negative" : "neutral"}`}>{owesYou ? <><span>owes you</span><strong>{formatMoney(debt.amount)}</strong></> : youOwe ? <><span>you owe</span><strong>{formatMoney(debt.amount)}</strong></> : <span>settled</span>}</div>{!props.isOptimised && (owesYou || youOwe) && <button className="icon-action" title="Clear debt" onClick={() => clearDebt(debt)}>✓</button>}</div>;
    })}</div>}
    <div className="group-actions">
      <div><span className="eyebrow">Workspace</span><strong>{props.isOwner ? "Owner controls" : "Your access"}</strong><span>{canLeave ? "Your net balance is settled, so you can leave this group." : `Settle your net balance before leaving this group.`}</span></div>
      {props.isOwner ? <button className="button button-danger-ghost" disabled={!allMembersSettled} title={!allMembersSettled ? "Every member must have a net balance of ₹0.00 before deletion." : undefined} onClick={() => { if (canLeave && window.confirm("Delete this group and all its expenses? This cannot be undone.")) props.onDeleteGroup(); }}>Delete group</button> : <button className="button button-ghost" disabled={!canLeave} title={!canLeave ? "Your net balance must be ₹0.00." : undefined} onClick={() => { if (canLeave && window.confirm("Leave this group?")) props.onLeaveGroup(); }}>Leave group</button>}
    </div>
  </section>;
}

export default GroupUsers;
