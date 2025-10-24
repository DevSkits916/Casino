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

## Deployment

### Deploying to Render
The repository includes a [`render.yaml`](./render.yaml) blueprint that provisions a Render web service with a persistent disk for the wallet data file. To deploy:

1. Push this repository to your own Git provider (GitHub, GitLab, etc.).
2. Log in to [Render](https://render.com) and select **New > Blueprint**.
3. Provide the repository URL and, when prompted, confirm the settings from `render.yaml` (service name, Node runtime, and disk size). You can adjust the region or service name if needed.
4. Render will run `npm install` during the build step and start the service with `npm start`.

The blueprint configures an environment variable `DATA_FILE=/var/data/balances.json` and attaches a 1&nbsp;GB persistent disk mounted at `/var/data`. This ensures wallet balances survive restarts and deploys.

#### Manual setup without the blueprint
If you prefer to create the service manually:

1. Create a new **Web Service** from your repository.
2. Set **Runtime** to Node and **Build Command** to `npm install`, **Start Command** to `npm start`.
3. Add an environment variable `DATA_FILE` pointing to a location on a persistent disk (for example `/var/data/balances.json`).
4. Attach a persistent disk mounted at the directory that contains the data file (e.g. mount `/var/data`).

### Configuring the data store location
Locally the server writes to `balances.json` in the project root. You can override the path by setting the `DATA_FILE` environment variable before starting the server:

```bash
DATA_FILE=./tmp/custom-balances.json npm start
```

Relative paths are resolved against the project directory; absolute paths are used as-is. The server will create any missing directories in the path.

## Project Structure
```
├── balances.json        # Persistent player balance store
├── public/              # Frontend pages (lobby, games, admin)
├── server.js            # Express server and API routes
├── package.json         # Node.js project metadata and scripts
├── render.yaml          # Render blueprint for automated deployment
└── README.md            # Project documentation (this file)
```

## Notes
- The server prevents balances from going negative and logs every credit change with a timestamped history entry.
- Sample players are included in `balances.json` for quick experimentation.

