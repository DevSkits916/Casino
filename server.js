const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "lobby.html"));
});

const DATA_FILE = path.join(__dirname, "balances.json");
const DEFAULT_STARTING_BALANCE = 1000;

function ensureDataDirectory() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function loadData() {
  ensureDataDirectory();
  if (!fs.existsSync(DATA_FILE)) {
    const initial = { players: {} };
    saveData(initial);
    return initial;
  }
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    if (!parsed.players || typeof parsed.players !== "object") {
      return { players: {} };
    }
    return parsed;
  } catch (err) {
    return { players: {} };
  }
}

function saveData(data) {
  ensureDataDirectory();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function makeHistoryEntry(game, delta, desc) {
  return {
    ts: new Date().toISOString(),
    game,
    delta,
    desc,
  };
}

function getOrCreateUser(data, username) {
  if (!username) {
    throw new Error("USERNAME_REQUIRED");
  }
  if (!data.players[username]) {
    data.players[username] = {
      balance: DEFAULT_STARTING_BALANCE,
      history: [
        {
          ts: new Date().toISOString(),
          game: "seed",
          delta: 0,
          desc: "initial seed",
        },
      ],
    };
    saveData(data);
  }
  return data.players[username];
}

app.get("/api/profile", (req, res) => {
  try {
    const username = (req.query.username || "").trim();
    const data = loadData();
    const user = getOrCreateUser(data, username);
    saveData(data);
    res.json({ ok: true, username, balance: user.balance });
  } catch (err) {
    if (err.message === "USERNAME_REQUIRED") {
      res.status(400).json({ ok: false, error: "USERNAME_REQUIRED" });
    } else {
      console.error(err);
      res.status(500).json({ ok: false, error: "SERVER_ERROR" });
    }
  }
});

app.post("/api/profile/save", (req, res) => {
  try {
    const { username, balance } = req.body || {};
    const name = (username || "").trim();
    const data = loadData();
    const user = getOrCreateUser(data, name);
    const newBalance = Number.isFinite(balance)
      ? Math.max(0, Math.floor(balance))
      : user.balance;
    user.balance = newBalance;
    user.history.push(makeHistoryEntry("manual-save", 0, "session save"));
    saveData(data);
    res.json({ ok: true });
  } catch (err) {
    if (err.message === "USERNAME_REQUIRED") {
      res.status(400).json({ ok: false, error: "USERNAME_REQUIRED" });
    } else {
      console.error(err);
      res.status(500).json({ ok: false, error: "SERVER_ERROR" });
    }
  }
});

app.post("/api/game/charge", (req, res) => {
  try {
    const { username, game, amount, desc } = req.body || {};
    const name = (username || "").trim();
    const data = loadData();
    const user = getOrCreateUser(data, name);
    const wager = Number.isFinite(amount) ? Math.max(0, Math.floor(amount)) : 0;
    if (wager <= 0) {
      return res.status(400).json({ ok: false, error: "INVALID_AMOUNT" });
    }
    if (user.balance < wager) {
      return res.json({ ok: false, error: "INSUFFICIENT_FUNDS", balance: user.balance });
    }
    user.balance -= wager;
    user.history.push(
      makeHistoryEntry(game || "unknown-game", -wager, desc || "charge")
    );
    saveData(data);
    res.json({ ok: true, balance: user.balance });
  } catch (err) {
    if (err.message === "USERNAME_REQUIRED") {
      res.status(400).json({ ok: false, error: "USERNAME_REQUIRED" });
    } else {
      console.error(err);
      res.status(500).json({ ok: false, error: "SERVER_ERROR" });
    }
  }
});

app.post("/api/game/payout", (req, res) => {
  try {
    const { username, game, amount, desc } = req.body || {};
    const name = (username || "").trim();
    const data = loadData();
    const user = getOrCreateUser(data, name);
    const payout = Number.isFinite(amount) ? Math.max(0, Math.floor(amount)) : 0;
    user.balance += payout;
    user.history.push(
      makeHistoryEntry(game || "unknown-game", payout, desc || "payout")
    );
    saveData(data);
    res.json({ ok: true, balance: user.balance });
  } catch (err) {
    if (err.message === "USERNAME_REQUIRED") {
      res.status(400).json({ ok: false, error: "USERNAME_REQUIRED" });
    } else {
      console.error(err);
      res.status(500).json({ ok: false, error: "SERVER_ERROR" });
    }
  }
});

app.get("/api/admin/users", (req, res) => {
  const data = loadData();
  const users = Object.entries(data.players).map(([username, info]) => ({
    username,
    balance: info.balance,
  }));
  res.json({ ok: true, users });
});

app.get("/api/admin/user-detail", (req, res) => {
  try {
    const username = (req.query.username || "").trim();
    if (!username) {
      throw new Error("USERNAME_REQUIRED");
    }
    const data = loadData();
    const user = data.players[username];
    if (!user) {
      return res.json({ ok: false, error: "NO_SUCH_USER" });
    }
    res.json({ ok: true, username, balance: user.balance, history: user.history });
  } catch (err) {
    if (err.message === "USERNAME_REQUIRED") {
      res.status(400).json({ ok: false, error: "USERNAME_REQUIRED" });
    } else {
      console.error(err);
      res.status(500).json({ ok: false, error: "SERVER_ERROR" });
    }
  }
});

app.post("/api/admin/set-balance", (req, res) => {
  try {
    const { username, balance, note } = req.body || {};
    const name = (username || "").trim();
    const data = loadData();
    const user = getOrCreateUser(data, name);
    const newBalance = Number.isFinite(balance) ? Math.max(0, Math.floor(balance)) : 0;
    const delta = newBalance - user.balance;
    user.balance = newBalance;
    user.history.push(
      makeHistoryEntry("admin-adjust", delta, note || "admin set balance")
    );
    saveData(data);
    res.json({ ok: true, balance: user.balance });
  } catch (err) {
    if (err.message === "USERNAME_REQUIRED") {
      res.status(400).json({ ok: false, error: "USERNAME_REQUIRED" });
    } else {
      console.error(err);
      res.status(500).json({ ok: false, error: "SERVER_ERROR" });
    }
  }
});

app.post("/api/admin/delete-user", (req, res) => {
  try {
    const { username } = req.body || {};
    const name = (username || "").trim();
    if (!name) {
      throw new Error("USERNAME_REQUIRED");
    }
    const data = loadData();
    if (data.players[name]) {
      delete data.players[name];
      saveData(data);
    }
    res.json({ ok: true });
  } catch (err) {
    if (err.message === "USERNAME_REQUIRED") {
      res.status(400).json({ ok: false, error: "USERNAME_REQUIRED" });
    } else {
      console.error(err);
      res.status(500).json({ ok: false, error: "SERVER_ERROR" });
    }
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
