# Lucky Stripe Arcade

Lucky Stripe Arcade is a lightweight Node.js/Express project that showcases a shared wallet powering three classic mini-games—Slots, High/Low, and Coin Flip—plus an open admin dashboard for managing player balances and history logs. Player balances are persisted on disk so that credits carry forward between visits.

## Features
- **Shared wallet:** Each username has a balance and transaction history stored in `balances.json`.
- **Multiple games:** Slots, High/Low, and Coin Flip each consume and award credits via the API.
- **Persistent data:** Every balance change is written back to disk immediately.
- **Admin dashboard:** View all users, inspect a user’s history, adjust balances, or delete accounts.
- **Simple frontend:** Static HTML pages served directly from Express and wired up with `fetch()` calls.

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) 16 or newer

### Installation
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the server:
   ```bash
   npm start
   ```
3. Open the lobby at [http://localhost:3000/lobby.html](http://localhost:3000/lobby.html). Use the links on the lobby to launch each game with the active username.

The admin dashboard lives at [http://localhost:3000/admin.html](http://localhost:3000/admin.html).

## API Overview
All routes return JSON. Balances never drop below zero.

| Method & Path | Description |
| --- | --- |
| `GET /api/profile?username=<name>` | Create or load a profile and return the balance. |
| `POST /api/profile/save` | Persist the supplied balance and append a history entry. |
| `POST /api/game/charge` | Deduct credits for a wager; rejects if funds are insufficient. |
| `POST /api/game/payout` | Add winnings to the balance. |
| `GET /api/admin/users` | List all users and their balances. |
| `GET /api/admin/user-detail?username=<name>` | Fetch balance and full history for a user. |
| `POST /api/admin/set-balance` | Force-set a balance with a note (logged as `admin-adjust`). |
| `POST /api/admin/delete-user` | Remove a user and their history. |

## Project Structure
```
├── balances.json         # Persistent player store (JSON)
├── package.json          # Node metadata and dependencies
├── server.js             # Express server and API definitions
└── public/
    ├── lobby.html        # Profile loader + navigation hub
    ├── slots.html        # Slots mini-game
    ├── highlow.html      # High/Low card guessing game
    ├── coinflip.html     # Coin flip wager game
    └── admin.html        # Admin dashboard
```

## Development Notes
- New users automatically receive 1000 starting credits and a seed history entry.
- Every wager and payout is recorded with a timestamp, game label, delta, and description.
- The frontend uses query parameters (`?u=<username>`) to keep track of the active profile between pages.

## Troubleshooting
- **Balances not updating?** Confirm that the API responses show `ok: true`. Errors return `{ ok: false, error: "..." }`.
- **Permission errors writing `balances.json`?** Ensure the Node process has write permissions to the project directory, or change the path by setting `DATA_FILE` before starting the server.
- **Want to reset balances?** Stop the server and edit or delete `balances.json`; it will be recreated on demand.

---

## Deploying to Render (from a phone)
1. Use your phone’s browser to create a new Git repository (e.g., on GitHub) and upload all project files exactly as provided.
2. Still on your phone, open the Render dashboard and choose **New &gt; Web Service**.
3. Connect the repository you just created when prompted.
4. Set the **Environment** to **Node**.
5. Set the **Build Command** to `npm install`.
6. Set the **Start Command** to `node server.js`.
7. Render automatically injects `process.env.PORT`; the server already uses it when listening.
8. After deployment finishes, Render supplies a public URL such as `https://your-app-name.onrender.com`—open `https://your-app-name.onrender.com/lobby.html` to reach the lobby, and use `/api/...` paths for API calls.
9. The Render free tier may sleep when idle; the service will wake automatically on the next request (a short cold start is normal).
