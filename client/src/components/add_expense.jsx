import React, { useEffect, useMemo, useState } from "react";
import "../styles/add_expense.css";
import minus from "../assets/minus.svg";

function toPaise(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number * 100) : 0;
}

function AddExpense(props) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [lender, setLender] = useState(props.activeUser);
  const [borrowers, setBorrowers] = useState([{ username: "", amount: "" }]);
  const [automaticSplit, setAutomaticSplit] = useState(true);

  useEffect(() => {
    if (props.activeUser) setLender(props.activeUser);
  }, [props.activeUser]);

  const amountInPaise = toPaise(amount);
  const groupUsers = useMemo(
    () => (Array.isArray(props.groupUsers) ? props.groupUsers : []),
    [props.groupUsers],
  );
  const availableUsers = useMemo(
    () => groupUsers.filter((user) => user.username !== lender),
    [groupUsers, lender],
  );
  const availableUsernames = useMemo(
    () => new Set(availableUsers.map((user) => user.username)),
    [availableUsers],
  );

  useEffect(() => {
    if (!automaticSplit || amountInPaise <= 0 || borrowers.length === 0) return;
    const participantCount = borrowers.length + 1;
    const baseShare = Math.floor(amountInPaise / participantCount);
    let remainder = amountInPaise % participantCount;
    setBorrowers((current) =>
      current.map((borrower) => ({
        ...borrower,
        amount: ((baseShare + (remainder-- > 0 ? 1 : 0)) / 100).toFixed(2),
      })),
    );
  }, [amountInPaise, automaticSplit, borrowers.length]);

  useEffect(() => {
    setBorrowers((current) =>
      current.map((borrower) =>
        borrower.username && !availableUsernames.has(borrower.username)
          ? { ...borrower, username: "" }
          : borrower,
      ),
    );
  }, [availableUsernames]);

  const validBorrowers = borrowers.every(
    (borrower) =>
      availableUsernames.has(borrower.username) &&
      toPaise(borrower.amount) > 0,
  );
  const borrowerNames = borrowers
    .map((borrower) => borrower.username)
    .filter(Boolean);
  const hasDuplicates = new Set(borrowerNames).size !== borrowerNames.length;
  const borrowerTotal = borrowers.reduce(
    (total, borrower) => total + toPaise(borrower.amount),
    0,
  );
  const hasBorrowerSlots = borrowers.length < availableUsers.length;
  const canCreateExpense = groupUsers.length >= 2;
  const validationMessage = (() => {
    if (!isOpen || !canCreateExpense) return "";
    if (hasDuplicates) return "Each borrower can only be selected once.";
    if (borrowerTotal > amountInPaise) return "Borrower shares cannot exceed the expense total.";
    if (!validBorrowers && amountInPaise > 0) return "Select a borrower and enter a positive share.";
    return "";
  })();
  const canSubmit =
    title.trim() &&
    lender &&
    amountInPaise > 0 &&
    validBorrowers &&
    !hasDuplicates &&
    borrowerTotal <= amountInPaise;

  function resetForm() {
    setTitle("");
    setAmount("");
    setLender(props.activeUser);
    setBorrowers([{ username: "", amount: "" }]);
    setAutomaticSplit(true);
    setIsOpen(false);
  }

  async function submitExpense() {
    if (!canSubmit) return;
    const created = await props.onClick({
      title: title.trim(),
      author: props.author,
      lender,
      borrowers: borrowers.map((borrower) => [
        borrower.username,
        toPaise(borrower.amount),
      ]),
      amount: amountInPaise,
    });
    if (created) resetForm();
  }

  function updateBorrower(index, field, value) {
    if (field === "amount") setAutomaticSplit(false);
    setBorrowers((current) =>
      current.map((borrower, borrowerIndex) =>
        borrowerIndex === index ? { ...borrower, [field]: value } : borrower,
      ),
    );
  }

  function addBorrower() {
    if (!hasBorrowerSlots) return;
    const selectedBorrowers = new Set(borrowers.map((borrower) => borrower.username));
    const nextUser = availableUsers.find(
      (user) => !selectedBorrowers.has(user.username),
    );
    setBorrowers((current) => [
      ...current,
      { username: nextUser?.username || "", amount: "" },
    ]);
  }

  return (
    <div>
      {isOpen && canCreateExpense && (
        <div className="overflow-container overflow-container-expand">
          <div className="input-container">
            <header className="add-expense-title">Title</header>
            <input className="title-input" maxLength="50" value={title} onChange={(event) => setTitle(event.target.value)} />
          </div>
          <div className="input-container">
            <header className="add-expense-amount">Amount</header>
            <input className="amount-input" type="number" min="0.01" step="0.01" placeholder="₹" value={amount} onChange={(event) => setAmount(event.target.value)} />
          </div>
          <div className="input-container">
            <header className="add-expense-lender">Lender</header>
            <select className="user-dropdown" value={lender} onChange={(event) => setLender(event.target.value)}>
              {props.groupUsers.map((user) => <option key={user.username} value={user.username}>{user.username}</option>)}
            </select>
          </div>
          {borrowers.map((borrower, index) => (
            <div className="input-container" key={index}>
              <header className="add-expense-borrower">Borrower</header>
              <div className="borrower-container">
                <select className="user-dropdown" value={borrower.username} onChange={(event) => updateBorrower(index, "username", event.target.value)}>
                  <option value="">--- Select a user ---</option>
                  {availableUsers.map((user) => <option key={user.username} value={user.username}>{user.username}</option>)}
                </select>
                <input className="borrower-split" type="number" min="0.01" step="0.01" placeholder="₹" value={borrower.amount} onChange={(event) => updateBorrower(index, "amount", event.target.value)} />
                {borrowers.length > 1 && (
                  <button type="button" className="add-expense-plus" aria-label="Remove borrower" onClick={() => setBorrowers((current) => current.filter((_, borrowerIndex) => borrowerIndex !== index))}><img alt="" className="borrower-cross" src={minus} /></button>
                )}
              </div>
            </div>
          ))}
          <button type="button" className="ge-button" disabled={!hasBorrowerSlots} onClick={addBorrower}>Add borrower</button>
          {validationMessage && <p className="group-members-msg">{validationMessage}</p>}
        </div>
      )}
      <div className={[
        "add-expense-container",
        isOpen ? "add-expense-container-expand" : "",
        !canCreateExpense ? "add-expense-container-help" : "",
      ].filter(Boolean).join(" ")}>
        <div className="button-container">
          <button type="button" disabled={!canCreateExpense} title={canCreateExpense ? undefined : "Add another group member before creating an expense."} onClick={() => setIsOpen((open) => !open)} className="ge-button">{isOpen ? "Close" : "Add Expense"}</button>
          {isOpen && <button type="button" disabled={!canSubmit} className="ge-button" onClick={submitExpense}>Confirm Expense</button>}
        </div>
        {!canCreateExpense && <p className="expense-help">Add at least one more group member to create an expense.</p>}
      </div>
    </div>
  );
}

export default AddExpense;
