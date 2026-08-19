const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, 'voltstake.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  balance INTEGER NOT NULL DEFAULT 1000,
  xrpl_destination_tag INTEGER UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS bets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  game TEXT NOT NULL,
  stake INTEGER NOT NULL,
  payout INTEGER NOT NULL DEFAULT 0,
  result TEXT NOT NULL,
  multiplier REAL,
  meta TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS wallet_transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  type TEXT NOT NULL,
  balance_after INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS mines_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  stake INTEGER NOT NULL,
  grid_size INTEGER NOT NULL,
  mine_count INTEGER NOT NULL,
  mine_positions TEXT NOT NULL,
  revealed TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- XRPL (Testnet) integration: every user is assigned a unique destination tag.
-- All deposits go to the single vault address; the tag identifies the depositor.
CREATE TABLE IF NOT EXISTS xrpl_deposits (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  tx_hash TEXT UNIQUE NOT NULL,
  amount_drops TEXT NOT NULL,
  amount_xrp REAL NOT NULL,
  credited_vlt INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS xrpl_withdrawals (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  amount_vlt INTEGER NOT NULL,
  amount_xrp REAL NOT NULL,
  destination_address TEXT NOT NULL,
  destination_tag INTEGER,
  tx_hash TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  error TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS xrpl_sync_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  last_ledger_index INTEGER,
  last_marker TEXT
);
INSERT OR IGNORE INTO xrpl_sync_state (id, last_ledger_index, last_marker) VALUES (1, NULL, NULL);
`);

// Lightweight migration: add XRPL columns to users if they don't exist yet
function ensureColumn(table, column, definition) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);
  if (!cols.includes(column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

// 1. Ajoute la colonne sans contrainte UNIQUE
ensureColumn('users', 'xrpl_destination_tag', 'INTEGER');

// 2. Applique l'unicité via un index dédié
db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_xrpl_tag ON users(xrpl_destination_tag);`);

module.exports = db;
