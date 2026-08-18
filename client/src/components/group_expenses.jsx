import React, { useState } from "react";
import "../styles/group_expenses.css";
import Expense from "./expense";
import AddExpense from "./add_expense";

function formatMoney(paise) {
  const sign = paise < 0 ? "-" : "";
  return `${sign}₹${Math.abs(paise / 100).toFixed(2)}`;
}

function GroupExpenses(props) {
  const [editingExpense, setEditingExpense] = useState(null);
  const expenses = props.group.expenses;
  const balance = props.group.usersMinusActive.outstandingBalance;

  async function saveEdit(expense) {
    const saved = await props.onEdit(expense);
    if (saved) setEditingExpense(null);
    return saved;
  }

  return (
    <section className="panel expenses-panel">
      <div className="panel-header">
        <div>
          <span className="eyebrow">Group ledger</span>
          <h2>Expenses</h2>
          <p>Every shared expense and settlement in one place.</p>
        </div>
        <div className={`balance-chip ${balance > 0 ? "negative" : balance < 0 ? "positive" : "neutral"}`}>
          <span>{balance > 0 ? "You owe" : balance < 0 ? "You are owed" : "Settled"}</span>
          <strong>{formatMoney(balance)}</strong>
        </div>
      </div>

      <AddExpense
        onClick={props.onAddExpense}
        author={props.group.activeUser}
        groupUsers={props.group.users}
        activeUser={props.group.activeUser}
      />

      {editingExpense && (
        <div className="edit-banner">
          <div><strong>Editing expense</strong><span>{editingExpense.title}</span></div>
          <button className="button button-ghost" onClick={() => setEditingExpense(null)}>Cancel</button>
        </div>
      )}

      <div className="expense-list">
        {expenses.length === 0 ? (
          <div className="empty-state"><strong>No expenses yet</strong><span>Add the first shared expense for this group.</span></div>
        ) : expenses.map((expense) => (
          <Expense
            value={expense}
            currentUser={props.group.activeUser}
            key={expense._id || expense.creationDatetime}
            onEdit={setEditingExpense}
            onDelete={props.onDeleteExpense}
          />
        ))}
      </div>

      {editingExpense && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header"><div><span className="eyebrow">Edit transaction</span><h3>Update expense</h3></div><button className="icon-button" onClick={() => setEditingExpense(null)}>×</button></div>
            <EditExpenseForm expense={editingExpense} groupUsers={props.group.users} onSave={saveEdit} />
          </div>
        </div>
      )}
    </section>
  );
}

function EditExpenseForm({ expense, groupUsers, onSave }) {
  const [title, setTitle] = useState(expense.title);
  const [amount, setAmount] = useState((expense.amount / 100).toFixed(2));
  const [lender, setLender] = useState(expense.lender);
  const [borrowers, setBorrowers] = useState(expense.borrowers.map(([username, value]) => ({ username, amount: (value / 100).toFixed(2) })));
  const toPaise = (value) => Math.round(Number(value || 0) * 100);
  const total = toPaise(amount);
  const borrowerTotal = borrowers.reduce((sum, item) => sum + toPaise(item.amount), 0);
  const valid = title.trim() && lender && borrowers.length && borrowerTotal <= total && borrowers.every((b) => b.username && toPaise(b.amount) > 0) && new Set(borrowers.map((b) => b.username)).size === borrowers.length && borrowers.every((b) => b.username !== lender);

  function update(index, field, value) {
    setBorrowers((current) => current.map((item, i) => i === index ? { ...item, [field]: value } : item));
  }

  async function submit(event) {
    event.preventDefault();
    if (!valid) return;
    await onSave({ _id: expense._id, title: title.trim(), lender, amount: total, borrowers: borrowers.map((b) => [b.username, toPaise(b.amount)]) });
  }

  return <form className="form-grid" onSubmit={submit}>
    <label>Title<input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={50} /></label>
    <label>Amount<input type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} /></label>
    <label>Lender<select value={lender} onChange={(e) => setLender(e.target.value)}>{groupUsers.map((u) => <option key={u.username}>{u.username}</option>)}</select></label>
    <div className="borrower-edit-block"><div className="form-label">Borrowers</div>{borrowers.map((b, i) => <div className="borrower-edit-row" key={i}><select value={b.username} onChange={(e) => update(i, "username", e.target.value)}><option value="">Select</option>{groupUsers.filter((u) => u.username !== lender).map((u) => <option key={u.username}>{u.username}</option>)}</select><input type="number" min="0.01" step="0.01" value={b.amount} onChange={(e) => update(i, "amount", e.target.value)} /></div>)}</div>
    <div className="modal-footer"><span className="form-helper">Borrowers: ₹{(borrowerTotal / 100).toFixed(2)} / ₹{(total / 100).toFixed(2)}</span><button className="button button-primary" disabled={!valid}>Save changes</button></div>
  </form>;
}

export default GroupExpenses;
