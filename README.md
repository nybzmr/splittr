# Splittr

Splittr is a MERN expense-splitting app for small groups. It lets members add
shared expenses, track who owes whom, settle debts partially or fully, and view
Smart Split suggestions that reduce the number of payments needed to balance
the group.

## Features

- Add and view group members
- Create shared expenses in rupees
- Split expenses automatically across selected borrowers
- Track direct debts and each member's net balance
- Record partial and full settlements
- Switch the active user to view balances from that user's perspective
- Use Smart Split to show optimized payment suggestions

## Tech Stack

- Frontend: React, JavaScript, CSS
- Backend: Node.js, Express.js
- Database: MongoDB with Mongoose
- Algorithm: heap-based Smart Split debt optimization

## Project Structure

```text
client/                 React frontend
  src/components/       App screens and UI components
  src/styles/           Component styles
  src/assets/           UI assets

server/                 Express API
  controllers/          User, expense, debt, and Smart Split logic
  middleware/           Request validation and error handling
  models/               Mongoose schemas
  routes/               REST API routes
```

## Local Setup

Prerequisites:

- Node.js 18 or newer
- npm
- MongoDB Atlas cluster or another MongoDB replica set

MongoDB transactions require a replica set. MongoDB Atlas works out of the box.

1. Clone the repository:

```bash
git clone <your-repository-url>
cd splittr
```

2. Configure the backend environment:

```bash
cp server/.env.example server/.env
```

Edit `server/.env` and set your MongoDB connection string:

```text
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-url>/<database-name>
PORT=3001
CORS_ORIGIN=http://localhost:3000
```

3. Install and start the backend:

```bash
cd server
npm install
npm start
```

The API should run at `http://localhost:3001`.

4. In a second terminal, install and start the frontend:

```bash
cd client
npm install
npm start
```

The app should open at `http://localhost:3000`.

## Environment Variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `MONGODB_URI` | Yes | MongoDB connection string |
| `PORT` | No | API port, defaults to `3001` |
| `CORS_ORIGIN` | No | Allowed frontend origin, defaults to `http://localhost:3000` |
| `REACT_APP_API_URL` | No | Optional API base URL when not using the local proxy |

Do not commit `.env` files or real database credentials.

## API Overview

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Check API health |
| `GET` | `/users` | List group members |
| `POST` | `/users` | Add a group member |
| `GET` | `/users/:username` | Get one group member |
| `DELETE` | `/users/:username` | Delete an unused group member |
| `GET` | `/expenses` | List expense history |
| `POST` | `/expenses` | Create an expense |
| `GET` | `/debts` | List direct outstanding debts |
| `POST` | `/debts/add` | Add a direct debt |
| `POST` | `/debts/settle` | Record a settlement |
| `GET` | `/optimisedDebts` | List Smart Split suggestions |

Amounts are stored as integer paise. For example, `₹90.00` is sent to the API
as `9000`.

## Manual Verification

After starting both servers:

1. Open `http://localhost:3000`.
2. Add at least two members if the database is empty.
3. Click `Add Expense`; confirm the title, amount, lender, borrower, and split
   amount inputs are visible.
4. Create a `₹120` expense paid by one member and borrowed by another. The
   borrower's share should auto-fill as `60.00`.
5. Confirm the expense and verify it appears in the expense history.
6. Switch active users and confirm balances reverse correctly.
7. Record a partial settlement and verify the balance decreases.
8. Toggle Smart Split and verify it shows optimized suggestions as a read-only
   view.

## Development Checks

Run the frontend production build:

```bash
cd client
npm run build
```

Check backend JavaScript syntax:

```bash
cd server
node --check server.js
node --check app.js
```

## Author

Nayaab Zameer
