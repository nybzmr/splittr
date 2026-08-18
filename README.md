# Splittr

Splittr is a college-level MERN expense-sharing app for small groups. Users can
create accounts, create or join groups with an invite code, add shared
expenses, track debts, record settlements, and view Smart Split suggestions
that reduce the number of payments needed to balance a group.

## Current Features

- Username/password authentication with JWT
- Create a group and receive an invite code
- Join an existing group using the invite code
- Group-scoped expenses, debts, balances, and Smart Split data
- Shared group page: every member sees the same group ledger
- Automatic expense splitting
- Partial and full debt settlement
- Heap-based Smart Split optimization
- Integer-paise money representation
- MongoDB transactions for financial mutations

## Tech Stack

- Frontend: React, JavaScript, CSS
- Backend: Node.js, Express.js
- Database: MongoDB with Mongoose
- Authentication: JWT + bcryptjs
- Algorithm: heap-based Smart Split debt optimization

## Local Setup

Prerequisites:

- Node.js 18+
- npm
- MongoDB Atlas or another MongoDB deployment that supports transactions

1. Copy the environment file:

```bash
cp server/.env.example server/.env
```

Set:

```text
MONGODB_URI=<mongodb-connection-string>
PORT=3001
CORS_ORIGIN=http://localhost:3000
JWT_SECRET=<long-random-secret>
```

2. Install/start backend:

```bash
cd server
npm install
npm start
```

3. Install/start frontend in another terminal:

```bash
cd client
npm install
npm start
```

Open `http://localhost:3000`.

## Group Workflow

1. Register a Splittr account.
2. Sign in.
3. Create a group.
4. Share the generated invite code.
5. Another authenticated user signs in and enters the invite code.
6. Both users can select the same group and see the same members, expenses,
debts, balances, and Smart Split state.

## Money Representation

Amounts are represented as integer paise. For example:

```text
₹90.00 -> 9000
```

This avoids floating-point errors when updating financial state.

## API Overview

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `/auth/register` | Create account |
| POST | `/auth/login` | Sign in |
| GET | `/auth/me` | Get authenticated user |
| GET | `/groups` | List groups for current user |
| POST | `/groups` | Create group |
| POST | `/groups/join` | Join using invite code |
| GET | `/groups/:groupId/dashboard` | Get group ledger + members |
| POST | `/groups/:groupId/expenses` | Create expense |
| GET | `/groups/:groupId/debts` | Get direct debts |
| GET | `/groups/:groupId/optimisedDebts` | Get Smart Split suggestions |
| POST | `/groups/:groupId/debts/settle` | Record settlement |
| DELETE | `/groups/:groupId/debts/:from/:to` | Clear a debt |

## Important Note

This version introduces group-scoped financial data. Existing databases created
by the earlier global-ledger version need migration or a fresh database before
running this version.


## Existing MongoDB database after group support

The server now runs `syncIndexes()` for the group-aware collections on startup. This removes obsolete pre-group unique indexes (for example a global `username` or `(from,to)` index) and creates the current compound indexes scoped by `groupId`.

Restart the backend after updating to this version. For this college project, keep a backup of the development database before applying schema/index changes.
