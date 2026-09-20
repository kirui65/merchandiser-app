// SQLite (expo-sqlite) setup for the local offline queue.
//
// Table: pending_sales
//   localId     TEXT PRIMARY KEY   -- client-generated UUID, the idempotency key
//   payload     TEXT               -- JSON-encoded sale fields (outletId, productId, qty, unitPrice, timestamp, photoUrl)
//   syncStatus  TEXT               -- 'pending' | 'synced' | 'failed'
//   attempts    INTEGER DEFAULT 0
//   lastError   TEXT
//   createdAt   TEXT

import * as SQLite from 'expo-sqlite';

const DB_NAME = 'merchandiser.db';

let dbInstance = null;

export function getDb() {
  if (!dbInstance) {
    dbInstance = SQLite.openDatabaseSync(DB_NAME);
  }
  return dbInstance;
}

export function initDb() {
  const db = getDb();
  db.execSync(`
    CREATE TABLE IF NOT EXISTS pending_sales (
      localId TEXT PRIMARY KEY NOT NULL,
      payload TEXT NOT NULL,
      syncStatus TEXT NOT NULL DEFAULT 'pending',
      attempts INTEGER NOT NULL DEFAULT 0,
      lastError TEXT,
      createdAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS pending_pings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      timestamp TEXT NOT NULL,
      syncStatus TEXT NOT NULL DEFAULT 'pending',
      attempts INTEGER NOT NULL DEFAULT 0,
      lastError TEXT,
      createdAt TEXT NOT NULL,
      UNIQUE(lat, lng, timestamp)
    );
  `);
  return db;
}
