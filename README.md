# Casino Platform Prototype

This project is a prototype multi-game gambling platform that demonstrates a shared wallet system powering several mini-games and an admin dashboard. The server is built with Node.js and Express, while the client is implemented with vanilla HTML, CSS, and JavaScript.

## Features
- Shared credit balance persisted in `balances.json` for every player username.
- Express API routes for player profile management, betting charges, payouts, and admin operations.
- Lobby page for loading player profiles and navigating between Slot Machine, High/Low, and Coin Flip games.
- Individual game pages that interact with the wallet API to place bets and process winnings.
- Admin dashboard for viewing users, inspecting play history, adjusting balances, and deleting accounts.

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (version 16 or newer recommended)

### Installation
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm start
   ```
3. Open the lobby in your browser at [http://localhost:3000/lobby.html](http://localhost:3000/lobby.html).

The admin dashboard is available at [http://localhost:3000/admin.html](http://localhost:3000/admin.html).

## Testing the API
You can use `curl` or any REST client to interact with the API. Example to fetch a profile:
```bash
curl "http://localhost:3000/api/profile?username=demo"
```

## Project Structure
```
├── balances.json        # Persistent player balance store
├── public/              # Frontend pages (lobby, games, admin)
├── server.js            # Express server and API routes
├── package.json         # Node.js project metadata and scripts
└── README.md            # Project documentation (this file)
```

## Notes
- The server prevents balances from going negative and logs every credit change with a timestamped history entry.
- Sample players are included in `balances.json` for quick experimentation.

