import React, { useRef } from "react";
import "../styles/group_expenses.css";
import Expense from "./expense";
import AddExpense from "./add_expense";

function GroupExpenses(props) {
  // Array of expenses & debts
  const expenses = props.group.expenses;

  // Ref kept for the existing transition container.
  const containerRef = useRef(null);

  // Add expense data to db
  async function addExpense(expense) {
    // Call route to add expense to db
    return props.onClick(expense);
  }

  return (
    <div className="group-expenses-container">
      <h1 className="group-name">{props.group.name}</h1>
      <h2 className="balance">
        {props.group.usersMinusActive.outstandingBalance > 0
          ? "You owe: "
          : "You are owed: "}
        <span
          style={{
            backgroundColor:
              props.group.usersMinusActive.outstandingBalance === 0
                ? "lightgrey"
                : "",
          }}
          className={
            props.group.usersMinusActive.outstandingBalance > 0
              ? "balance-value user-balance-red"
              : "balance-value user-balance-green"
          }
        >
          {props.group.usersMinusActive.outstandingBalance < 0
            ? "₹" +
              String(
                (props.group.usersMinusActive.outstandingBalance / 100).toFixed(
                  2,
                ),
              ).substring(1)
            : "₹" +
              (props.group.usersMinusActive.outstandingBalance / 100).toFixed(
                2,
              )}
        </span>
      </h2>
      <div className="expense-container" ref={containerRef}>
        <AddExpense
          onClick={addExpense}
          author={props.group.activeUser}
          groupUsers={props.group.users}
          activeUser={props.group.activeUser}
          usersMinusActive={props.group.usersMinusActive}
        ></AddExpense>
        {expenses.map((expense) => (
          <Expense
            value={expense}
            key={expense._id || expense.creationDatetime}
          ></Expense>
        ))}
      </div>
    </div>
  );
}

export default GroupExpenses;
