import React, { useEffect, useMemo, useRef, useState } from "react";
import "../styles/add_expense.css";
import minus from "../assets/minus.svg";

function toPaise(value) { const number = Number(value); return Number.isFinite(number) ? Math.round(number * 100) : 0; }

function UserPicker({ value, users, onChange, placeholder = "Select a member" }) {
  const [open, setOpen] = useState(false); const ref = useRef(null);
  useEffect(() => { const close = (event) => { if (ref.current && !ref.current.contains(event.target)) setOpen(false); }; document.addEventListener("mousedown", close); return () => document.removeEventListener("mousedown", close); }, []);
  const selected = users.find((user) => user.username === value);
  return <div className="user-picker" ref={ref}>
    <button type="button" className={`user-picker-trigger ${open ? "open" : ""}`} onClick={() => setOpen((v) => !v)}>
      {selected ? <><span className="picker-avatar">{selected.username[0]?.toUpperCase()}</span><span><strong>{selected.username}</strong><small>{selected.firstName} {selected.lastName}</small></span></> : <span className="picker-placeholder">{placeholder}</span>}
      <span className="picker-chevron">⌄</span>
    </button>
    {open && <div className="user-picker-menu">{users.length === 0 ? <div className="picker-empty">No members available.</div> : users.map((user) => <button type="button" key={user.username} className={`user-option ${user.username === value ? "selected" : ""}`} onClick={() => { onChange(user.username); setOpen(false); }}><span className="picker-avatar">{user.username[0]?.toUpperCase()}</span><span><strong>{user.username}</strong><small>{user.firstName} {user.lastName}</small></span>{user.username === value && <span className="picker-check">✓</span>}</button>)}</div>}
  </div>;
}

function AddExpense(props) {
  const [isOpen, setIsOpen] = useState(false); const [title, setTitle] = useState(""); const [amount, setAmount] = useState(""); const [lender, setLender] = useState(props.activeUser); const [borrowers, setBorrowers] = useState([{ username: "", amount: "" }]); const [automaticSplit, setAutomaticSplit] = useState(true);
  useEffect(() => { if (props.activeUser) setLender(props.activeUser); }, [props.activeUser]);
  const amountInPaise = toPaise(amount); const groupUsers = useMemo(() => Array.isArray(props.groupUsers) ? props.groupUsers : [], [props.groupUsers]);
  const availableUsers = useMemo(() => groupUsers.filter((user) => user.username !== lender), [groupUsers, lender]);
  const availableUsernames = useMemo(() => new Set(availableUsers.map((user) => user.username)), [availableUsers]);
  useEffect(() => { if (!automaticSplit || amountInPaise <= 0 || borrowers.length === 0) return; const participantCount = borrowers.length + 1; const baseShare = Math.floor(amountInPaise / participantCount); let remainder = amountInPaise % participantCount; setBorrowers((current) => current.map((borrower) => ({ ...borrower, amount: ((baseShare + (remainder-- > 0 ? 1 : 0)) / 100).toFixed(2) }))); }, [amountInPaise, automaticSplit, borrowers.length]);
  useEffect(() => { setBorrowers((current) => current.map((borrower) => borrower.username && !availableUsernames.has(borrower.username) ? { ...borrower, username: "" } : borrower)); }, [availableUsernames]);
  const validBorrowers = borrowers.every((borrower) => availableUsernames.has(borrower.username) && toPaise(borrower.amount) > 0); const borrowerNames = borrowers.map((b) => b.username).filter(Boolean); const hasDuplicates = new Set(borrowerNames).size !== borrowerNames.length; const borrowerTotal = borrowers.reduce((total, borrower) => total + toPaise(borrower.amount), 0); const hasBorrowerSlots = borrowers.length < availableUsers.length; const canCreateExpense = groupUsers.length >= 2;
  const validationMessage = (() => { if (!isOpen || !canCreateExpense) return ""; if (hasDuplicates) return "Each borrower can only be selected once."; if (borrowerTotal > amountInPaise) return "Borrower shares cannot exceed the expense total."; if (!validBorrowers && amountInPaise > 0) return "Select a borrower and enter a positive share."; return ""; })();
  const canSubmit = title.trim() && lender && amountInPaise > 0 && validBorrowers && !hasDuplicates && borrowerTotal <= amountInPaise;
  function resetForm() { setTitle(""); setAmount(""); setLender(props.activeUser); setBorrowers([{ username: "", amount: "" }]); setAutomaticSplit(true); setIsOpen(false); }
  async function submitExpense() { if (!canSubmit) return; const created = await props.onClick({ title: title.trim(), author: props.author, lender, borrowers: borrowers.map((b) => [b.username, toPaise(b.amount)]), amount: amountInPaise }); if (created) resetForm(); }
  function updateBorrower(index, field, value) { if (field === "amount") setAutomaticSplit(false); setBorrowers((current) => current.map((b, i) => i === index ? { ...b, [field]: value } : b)); }
  function addBorrower() { if (!hasBorrowerSlots) return; const selected = new Set(borrowers.map((b) => b.username)); const next = availableUsers.find((u) => !selected.has(u.username)); setBorrowers((current) => [...current, { username: next?.username || "", amount: "" }]); }

  return <div>
    {isOpen && canCreateExpense && <div className="overflow-container overflow-container-expand">
      <div className="expense-form-intro"><div><span className="eyebrow">New transaction</span><h3>Add a shared expense</h3><p>Choose who paid, then assign each member's share.</p></div><div className="split-mode"><button type="button" className={automaticSplit ? "active" : ""} onClick={() => setAutomaticSplit(true)}>Equal split</button><button type="button" className={!automaticSplit ? "active" : ""} onClick={() => setAutomaticSplit(false)}>Custom</button></div></div>
      <div className="expense-form-grid">
        <label className="input-container"><header>Title</header><input className="title-input" maxLength="50" placeholder="e.g. Dinner" value={title} onChange={(e) => setTitle(e.target.value)} /></label>
        <label className="input-container"><header>Amount</header><div className="money-input"><span>₹</span><input className="amount-input" type="number" min="0.01" step="0.01" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} /></div></label>
        <label className="input-container full"><header>Paid by</header><UserPicker value={lender} users={groupUsers} onChange={setLender} placeholder="Select payer" /></label>
        <div className="input-container full"><header>Split between</header><div className="borrower-list">{borrowers.map((borrower, index) => <div className="borrower-container" key={index}><UserPicker value={borrower.username} users={availableUsers.filter((u) => u.username === borrower.username || !borrowers.some((b, i) => i !== index && b.username === u.username))} onChange={(value) => updateBorrower(index, "username", value)} placeholder="Select member" /><div className="money-input"><span>₹</span><input className="borrower-split" type="number" min="0.01" step="0.01" placeholder="0.00" value={borrower.amount} onChange={(e) => updateBorrower(index, "amount", e.target.value)} /></div>{borrowers.length > 1 && <button type="button" className="borrower-remove" aria-label="Remove borrower" onClick={() => setBorrowers((current) => current.filter((_, borrowerIndex) => borrowerIndex !== index))}><img alt="" src={minus} /></button>}</div>)}</div><button type="button" className="add-borrower-button" disabled={!hasBorrowerSlots} onClick={addBorrower}>+ Add another member</button></div>
      </div>
      {validationMessage && <p className="group-members-msg">{validationMessage}</p>}
    </div>}
    <div className={`add-expense-container ${isOpen ? "add-expense-container-expand" : ""} ${!canCreateExpense ? "add-expense-container-help" : ""}`}>
      <div className="button-container"><button type="button" disabled={!canCreateExpense} title={canCreateExpense ? undefined : "Add another group member before creating an expense."} onClick={() => setIsOpen((open) => !open)} className="ge-button">{isOpen ? "Close" : "Add Expense"}</button>{isOpen && <button type="button" disabled={!canSubmit} className="ge-button primary" onClick={submitExpense}>Confirm Expense</button>}</div>
      {!canCreateExpense && <p className="expense-help">Add at least one more group member to create an expense.</p>}
    </div>
  </div>;
}
export default AddExpense;
