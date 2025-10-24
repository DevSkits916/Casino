const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const DEFAULT_DATA_FILE = path.join(__dirname, 'balances.json');
const DATA_FILE = (() => {
  const configured = process.env.DATA_FILE;
  if (!configured) {
    return DEFAULT_DATA_FILE;
  }
  return path.isAbsolute(configured)
    ? configured
    : path.join(__dirname, configured);
})();

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
    fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2));
    return initial;
  }
  const raw = fs.readFileSync(DATA_FILE, 'utf-8');
  try {
    const parsed = JSON.parse(raw);
    if (!parsed.players || typeof parsed.players !== 'object') {
      return { players: {} };
    }
    return parsed;
  } catch (err) {
    console.error('Failed to parse balances.json, resetting.', err);
    return { players: {} };
  }
}

let data = loadData();

console.log(`Using balance data file at ${DATA_FILE}`);

function saveData() {
  ensureDataDirectory();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function ensureUser(username) {
  if (!username) {
    throw new Error('USERNAME_REQUIRED');
  }
  if (!data.players[username]) {
    data.players[username] = {
      balance: 1000,
      history: []
    };
    data.players[username].history.push(makeHistoryEntry('system', 0, 'auto-create profile'));
    saveData();
  }
  return data.players[username];
}

function makeHistoryEntry(game, delta, desc) {
  return {
    ts: new Date().toISOString(),
    game,
    delta,
    desc
  };
}

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/profile', (req, res) => {
  try {
    const username = (req.query.username || '').trim();
    const user = ensureUser(username);
    saveData();
    res.json({ ok: true, username, balance: user.balance });
  } catch (err) {
    if (err.message === 'USERNAME_REQUIRED') {
      res.status(400).json({ ok: false, error: 'USERNAME_REQUIRED' });
    } else {
      console.error(err);
      res.status(500).json({ ok: false, error: 'SERVER_ERROR' });
    }
  }
});

app.post('/api/profile/save', (req, res) => {
  try {
    const { username, balance } = req.body || {};
    const name = (username || '').trim();
    const user = ensureUser(name);
    const newBalance = Number.isFinite(balance) ? Math.max(0, Math.floor(balance)) : user.balance;
    user.balance = newBalance;
    user.history.push(makeHistoryEntry('manual-save', 0, 'session save'));
    saveData();
    res.json({ ok: true });
  } catch (err) {
    if (err.message === 'USERNAME_REQUIRED') {
      res.status(400).json({ ok: false, error: 'USERNAME_REQUIRED' });
    } else {
      console.error(err);
      res.status(500).json({ ok: false, error: 'SERVER_ERROR' });
    }
  }
});

app.post('/api/game/charge', (req, res) => {
  try {
    const { username, game, amount, desc } = req.body || {};
    const name = (username || '').trim();
    const wager = Number.isFinite(amount) ? Math.max(0, Math.floor(amount)) : 0;
    if (wager <= 0) {
      return res.status(400).json({ ok: false, error: 'INVALID_AMOUNT' });
    }
    const user = ensureUser(name);
    if (user.balance - wager < 0) {
      return res.status(200).json({ ok: false, error: 'INSUFFICIENT_FUNDS', balance: user.balance });
    }
    user.balance -= wager;
    user.history.push(makeHistoryEntry(game || 'unknown-game', -wager, desc || 'charge'));
    saveData();
    res.json({ ok: true, balance: user.balance });
  } catch (err) {
    if (err.message === 'USERNAME_REQUIRED') {
      res.status(400).json({ ok: false, error: 'USERNAME_REQUIRED' });
    } else {
      console.error(err);
      res.status(500).json({ ok: false, error: 'SERVER_ERROR' });
    }
  }
});

app.post('/api/game/payout', (req, res) => {
  try {
    const { username, game, amount, desc } = req.body || {};
    const name = (username || '').trim();
    const payout = Number.isFinite(amount) ? Math.max(0, Math.floor(amount)) : 0;
    if (payout < 0) {
      return res.status(400).json({ ok: false, error: 'INVALID_AMOUNT' });
    }
    const user = ensureUser(name);
    user.balance += payout;
    user.history.push(makeHistoryEntry(game || 'unknown-game', payout, desc || 'payout'));
    saveData();
    res.json({ ok: true, balance: user.balance });
  } catch (err) {
    if (err.message === 'USERNAME_REQUIRED') {
      res.status(400).json({ ok: false, error: 'USERNAME_REQUIRED' });
    } else {
      console.error(err);
      res.status(500).json({ ok: false, error: 'SERVER_ERROR' });
    }
  }
});

app.get('/api/admin/users', (req, res) => {
  const users = Object.entries(data.players).map(([username, info]) => ({
    username,
    balance: info.balance
  }));
  res.json({ ok: true, users });
});

app.get('/api/admin/user-detail', (req, res) => {
  try {
    const username = (req.query.username || '').trim();
    const user = ensureUser(username);
    res.json({ ok: true, username, balance: user.balance, history: user.history });
  } catch (err) {
    if (err.message === 'USERNAME_REQUIRED') {
      res.status(400).json({ ok: false, error: 'USERNAME_REQUIRED' });
    } else {
      console.error(err);
      res.status(500).json({ ok: false, error: 'SERVER_ERROR' });
    }
  }
});

app.post('/api/admin/set-balance', (req, res) => {
  try {
    const { username, balance, note } = req.body || {};
    const name = (username || '').trim();
    const targetBalance = Number.isFinite(balance) ? Math.max(0, Math.floor(balance)) : 0;
    const user = ensureUser(name);
    const old = user.balance;
    user.balance = targetBalance;
    const delta = targetBalance - old;
    user.history.push(makeHistoryEntry('admin-adjust', delta, note || 'admin set balance'));
    saveData();
    res.json({ ok: true, balance: user.balance });
  } catch (err) {
    if (err.message === 'USERNAME_REQUIRED') {
      res.status(400).json({ ok: false, error: 'USERNAME_REQUIRED' });
    } else {
      console.error(err);
      res.status(500).json({ ok: false, error: 'SERVER_ERROR' });
    }
  }
});

app.post('/api/admin/delete-user', (req, res) => {
  try {
    const { username } = req.body || {};
    const name = (username || '').trim();
    if (!name) {
      throw new Error('USERNAME_REQUIRED');
    }
    if (data.players[name]) {
      delete data.players[name];
      saveData();
    }
    res.json({ ok: true });
  } catch (err) {
    if (err.message === 'USERNAME_REQUIRED') {
      res.status(400).json({ ok: false, error: 'USERNAME_REQUIRED' });
    } else {
      console.error(err);
      res.status(500).json({ ok: false, error: 'SERVER_ERROR' });
    }
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
