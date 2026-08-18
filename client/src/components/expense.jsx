import React, { useState } from "react";
import "../styles/expense.css";

function formatMoney(paise) {
  return `₹${(paise / 100).toFixed(2)}`;
}

function Expense({ value, currentUser, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const isAuthor = value.author === currentUser;
  const isSettlement = value.title === "SETTLEMENT";
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <article className="expense-card">
      <button type="button" className="expense-summary" onClick={() => setExpanded((v) => !v)} aria-expanded={expanded}>
        <div className="expense-date">
          <span>{new Date(value.creationDatetime).toLocaleDateString(undefined, { month: "short" })}</span>
          <strong>{new Date(value.creationDatetime).getDate()}</strong>
        </div>
        <div className="expense-main">
          <div className="expense-title-row">
            <h3>{value.title}</h3>
            {isSettlement && <span className="tag tag-neutral">Settlement</span>}
          </div>
          <p>{value.lender} paid · {value.borrowers.length} participant{value.borrowers.length === 1 ? "" : "s"}</p>
        </div>
        <div className="expense-amount">{formatMoney(value.amount)}</div>
        <div className={`expense-chevron ${expanded ? "expanded" : ""}`}>⌄</div>
      </button>

      {expanded && (
        <div className="expense-details">
          <div className="expense-detail-head">
            <div>
              <span className="eyebrow">Paid by</span>
              <strong>{value.lender}</strong>
            </div>
            <div>
              <span className="eyebrow">Added by</span>
              <strong>{value.author}</strong>
            </div>
          </div>
          <div className="expense-split-list">
            {value.borrowers.map(([user, amount], index) => (
              <div className="expense-split-row" key={`${user}-${index}`}>
                <span>{user}</span><strong>{formatMoney(amount)}</strong>
              </div>
            ))}
          </div>
          {isAuthor && !isSettlement && (
            <div className="expense-actions">
              {confirmDelete ? (
                <>
                  <span className="confirm-text">Delete this expense?</span>
                  <button className="button button-danger" onClick={() => onDelete(value._id)}>Delete</button>
                  <button className="button button-ghost" onClick={() => setConfirmDelete(false)}>Cancel</button>
                </>
              ) : (
                <>
                  <button className="button button-secondary" onClick={() => onEdit(value)}>Edit</button>
                  <button className="button button-danger-ghost" onClick={() => setConfirmDelete(true)}>Delete</button>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </article>
  );
}

export default Expense;
