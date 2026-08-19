# Splittr

**Splittr** is a college-level MERN expense-sharing application for small groups. It helps friends, roommates, and travel groups manage shared expenses, track debts, settle balances, and reduce the number of payments required through a heap-based **Smart Split** algorithm.

### Live Demo

**Frontend:** [https://splittr-virid.vercel.app/](https://splittr-virid.vercel.app/)

**Backend API:** [https://splittr-tf3n.onrender.com/](https://splittr-tf3n.onrender.com/)

---

## Features

### Authentication

* Username/password registration and login
* JWT-based authentication
* Protected group and financial operations
* Profile management
* Update first name, last name, and password
* Signed-out users can browse the public landing page

### Groups

* Create groups with unique invite codes
* Join existing groups using invite codes
* Group-scoped members, expenses, debts, and balances
* Shared workspace for all members of the same group
* Leave a group when your net balance is zero
* Delete a group as the owner when all members have zero balances

### Expense Management

* Create shared expenses
* Automatic expense splitting
* Custom borrower amounts
* Edit existing expenses
* Delete expenses
* Transactional recalculation of debts and balances after edits/deletions
* Integer-paise representation for exact monetary calculations

### Debt & Settlement Management

* Track direct debts between group members
* View each member's net balance
* Partial debt settlement
* Full debt settlement
* Clear outstanding debts
* Transactional financial updates
* Validation to prevent invalid or excessive settlements

### Smart Split

Splittr maintains a debt graph and derives a simplified settlement graph from users' net balances.

The Smart Split algorithm:

```text
Expenses
   ↓
Pairwise debts
   ↓
Net balances
   ↓
Debtors + Creditors
   ↓
Heap-based optimization
   ↓
Reduced settlement transactions
```

For example:

```text
Before optimization: 8 payments
After optimization:  5 payments

3 payments eliminated
```

Smart Split is stored **per group**, so every member of a group sees the same Smart Split setting and settlement recommendations.

The current synchronization uses lightweight polling so that multiple open clients converge on the same group state without introducing unnecessary real-time infrastructure.

---

## Architecture

```text
                    ┌─────────────────────┐
                    │      React          │
                    │      Frontend       │
                    │      Vercel         │
                    └──────────┬──────────┘
                               │ HTTPS
                               ▼
                    ┌─────────────────────┐
                    │     Express.js      │
                    │      REST API       │
                    │       Render        │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │      MongoDB        │
                    │       Atlas         │
                    └─────────────────────┘
```

The backend is organized around:

```text
server/
├── controllers/
├── middleware/
├── models/
├── routes/
├── services/
└── server.js
```

The frontend contains:

```text
client/
└── src/
    ├── components/
    ├── styles/
    └── assets/
```

---

## Tech Stack

### Frontend

* React
* JavaScript
* CSS
* Create React App

### Backend

* Node.js
* Express.js
* REST APIs
* JWT authentication
* bcryptjs

### Database

* MongoDB
* Mongoose
* MongoDB transactions
* Compound/group-scoped indexes

### Algorithms & Engineering

* Heap-based debt minimization
* Integer arithmetic for monetary values
* Transactional state updates
* Input validation
* Error handling
* Git/GitHub

---

## Money Representation

All persisted financial amounts use **integer paise** rather than floating-point rupee values.

For example:

```text
₹90.00 → 9000 paise
₹125.50 → 12550 paise
```

This avoids floating-point precision problems when calculating balances and settlements.

---

## Database Model

Financial state is scoped to a group.

Conceptually:

```text
User
 └── Group Membership
        └── Group
             ├── Expenses
             ├── Debts
             ├── User Balances
             └── Smart Split State
```

This prevents data from different groups from being mixed together.

The server also synchronizes MongoDB indexes on startup so that obsolete indexes from the earlier global-ledger version do not conflict with the group-aware schema.

---

## Financial Consistency

State-changing financial operations use MongoDB transactions.

For example, creating an expense can update:

```text
Expense
   +
Pairwise Debts
   +
User Net Balances
   +
Smart Split
```

as one atomic operation.

Likewise, settlements update the relevant debt and balances transactionally.

This prevents partially applied financial operations.

---

## API

### Authentication

| Method  | Endpoint         | Purpose                    |
| ------- | ---------------- | -------------------------- |
| `POST`  | `/auth/register` | Create an account          |
| `POST`  | `/auth/login`    | Sign in                    |
| `GET`   | `/auth/me`       | Get the authenticated user |
| `PATCH` | `/auth/me`       | Update profile             |

### Groups

| Method   | Endpoint                       | Purpose                                          |
| -------- | ------------------------------ | ------------------------------------------------ |
| `GET`    | `/groups`                      | List groups for the authenticated user           |
| `POST`   | `/groups`                      | Create a group                                   |
| `POST`   | `/groups/join`                 | Join using an invite code                        |
| `GET`    | `/groups/:groupId/dashboard`   | Get group members, expenses, debts, and balances |
| `POST`   | `/groups/:groupId/leave`       | Leave a group                                    |
| `DELETE` | `/groups/:groupId`             | Delete a group                                   |
| `PATCH`  | `/groups/:groupId/smart-split` | Update the group's Smart Split setting           |

### Expenses

| Method   | Endpoint                               | Purpose           |
| -------- | -------------------------------------- | ----------------- |
| `POST`   | `/groups/:groupId/expenses`            | Create an expense |
| `PATCH`  | `/groups/:groupId/expenses/:expenseId` | Edit an expense   |
| `DELETE` | `/groups/:groupId/expenses/:expenseId` | Delete an expense |

### Debts

| Method   | Endpoint                           | Purpose                     |
| -------- | ---------------------------------- | --------------------------- |
| `GET`    | `/groups/:groupId/debts`           | Get direct debts            |
| `GET`    | `/groups/:groupId/optimisedDebts`  | Get Smart Split suggestions |
| `POST`   | `/groups/:groupId/debts/settle`    | Record a settlement         |
| `DELETE` | `/groups/:groupId/debts/:from/:to` | Clear a debt                |

---

## Local Development

### Prerequisites

* Node.js 18+
* npm
* MongoDB Atlas or another MongoDB deployment that supports transactions

### Clone

```bash
git clone https://github.com/nybzmr/splittr.git
cd splittr
```

### Backend

Create:

```text
server/.env
```

using:

```text
MONGODB_URI=<mongodb-connection-string>
PORT=3001
CORS_ORIGIN=http://localhost:3000
JWT_SECRET=<long-random-secret>
```

Install dependencies:

```bash
cd server
npm install
npm start
```

The backend runs on:

```text
http://localhost:3001
```

### Frontend

Open another terminal:

```bash
cd client
npm install
npm start
```

The frontend runs on:

```text
http://localhost:3000
```

---

## Production Deployment

Splittr is deployed using:

```text
Frontend → Vercel
Backend  → Render
Database → MongoDB Atlas
```

## Environment Variables

### Backend

```text
MONGODB_URI
PORT
CORS_ORIGIN
JWT_SECRET
```

### Frontend

```text
REACT_APP_API_URL
```

For production:

```text
REACT_APP_API_URL=https://splittr-tf3n.onrender.com
```

Do not commit `.env` files or real secrets.

---

## Typical Workflow

```text
1. Sign up / Sign in
        ↓
2. Create a group
        ↓
3. Share invite code
        ↓
4. Other users join
        ↓
5. Add shared expenses
        ↓
6. Track debts and balances
        ↓
7. Enable Smart Split
        ↓
8. View optimized settlements
        ↓
9. Settle / clear debts
        ↓
10. Leave or close the group
```

---

## Data Migration Note

This version introduces **group-scoped financial data**.

Databases created by the older global-ledger version may require migration or a fresh development database.

The server runs MongoDB `syncIndexes()` for group-aware collections on startup to repair obsolete indexes. Keep a backup before applying schema/index changes to an existing database.

---

## Project Status

Splittr is currently a **college-level full-stack project** focused on:

* backend correctness
* financial state management
* database transactions
* authentication
* group-based data isolation
* algorithmic debt optimization
* practical React UI/UX

The project intentionally avoids unnecessary distributed infrastructure and keeps the architecture understandable and maintainable.

---

## Repository

**GitHub:** [https://github.com/nybzmr/splittr](https://github.com/nybzmr/splittr)

---

<p align="center">
  Made by <strong>Nayaab Zameer</strong>
</p>
