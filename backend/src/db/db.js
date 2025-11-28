const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Ensure data directory exists
// Ensure data directory exists
const dataDir = process.env.CONFIG_DIR || path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'app.db');
const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS qb_containers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    host TEXT NOT NULL,
    port INTEGER NOT NULL,
    username TEXT NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS torrents (
    hash TEXT PRIMARY KEY,
    container_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    size INTEGER NOT NULL,
    progress REAL NOT NULL,
    dlspeed INTEGER NOT NULL,
    upspeed INTEGER NOT NULL,
    downloaded INTEGER DEFAULT 0,
    uploaded INTEGER DEFAULT 0,
    state TEXT NOT NULL,
    eta INTEGER,
    category TEXT,
    tags TEXT,
    tracker TEXT,
    save_path TEXT,
    added_on INTEGER,
    completion_on INTEGER,
    last_activity INTEGER,
    FOREIGN KEY (container_id) REFERENCES qb_containers(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS sync_status (
    container_id INTEGER PRIMARY KEY,
    last_sync INTEGER,
    status TEXT,
    error TEXT,
    FOREIGN KEY (container_id) REFERENCES qb_containers(id) ON DELETE CASCADE
  );
`);

// Migration: Add columns if they don't exist (for existing DBs)
try {
  db.prepare('ALTER TABLE torrents ADD COLUMN tracker TEXT').run();
} catch (e) {}
try {
  db.prepare('ALTER TABLE torrents ADD COLUMN save_path TEXT').run();
} catch (e) {}

// Migration: Add downloaded and uploaded columns if they don't exist
try {
  const tableInfo = db.prepare("PRAGMA table_info(torrents)").all();
  const hasDownloaded = tableInfo.some(col => col.name === 'downloaded');
  const hasUploaded = tableInfo.some(col => col.name === 'uploaded');
  
  if (!hasDownloaded) {
    db.exec('ALTER TABLE torrents ADD COLUMN downloaded INTEGER DEFAULT 0');
    console.log('Added downloaded column to torrents table');
  }
  
  if (!hasUploaded) {
    db.exec('ALTER TABLE torrents ADD COLUMN uploaded INTEGER DEFAULT 0');
    console.log('Added uploaded column to torrents table');
  }
} catch (err) {
  console.error('Migration error:', err);
}

module.exports = db;
