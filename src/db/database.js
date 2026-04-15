const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', '..', 'data', 'codelens.db');

let db;

function initDB() {
  // Ensure data directory exists
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  db = new Database(DB_PATH);

  // Enable WAL mode for better concurrent performance
  db.pragma('journal_mode = WAL');

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      avatar TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS submissions (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      user_id TEXT,
      code TEXT NOT NULL,
      language TEXT NOT NULL,
      original_code TEXT,
      optimized_code TEXT,
      time_complexity TEXT,
      space_complexity TEXT,
      dead_code_items TEXT,
      optimization_suggestions TEXT,
      efficiency_rating REAL,
      rating_breakdown TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_session_id ON submissions(session_id);
    CREATE INDEX IF NOT EXISTS idx_created_at ON submissions(created_at);
  `);

  // Add user_id column if it doesn't exist (migration for existing DBs)
  try {
    db.exec(`ALTER TABLE submissions ADD COLUMN user_id TEXT REFERENCES users(id)`);
  } catch (e) {
    // Column already exists, ignore
  }

  // Create index on user_id after migration
  try {
    db.exec(`CREATE INDEX IF NOT EXISTS idx_user_id ON submissions(user_id)`);
  } catch (e) {
    // ignore
  }

  console.log('  ✓ Database initialized');
  return db;
}

function getDB() {
  if (!db) {
    initDB();
  }
  return db;
}

// ── User Functions ──
function createUser({ id, email, name, passwordHash, avatar }) {
  const db = getDB();
  const stmt = db.prepare(`
    INSERT INTO users (id, email, name, password_hash, avatar)
    VALUES (?, ?, ?, ?, ?)
  `);
  stmt.run(id, email, name, passwordHash, avatar || null);
}

function getUserByEmail(email) {
  const db = getDB();
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email);
}

function getUserById(id) {
  const db = getDB();
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}

// ── Submission Functions ──
function saveSubmission(submission) {
  const db = getDB();
  const stmt = db.prepare(`
    INSERT INTO submissions (id, session_id, user_id, code, language, original_code, optimized_code,
      time_complexity, space_complexity, dead_code_items, optimization_suggestions,
      efficiency_rating, rating_breakdown)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    submission.id,
    submission.session_id,
    submission.user_id || null,
    submission.code,
    submission.language,
    submission.original_code || submission.code,
    submission.optimized_code || '',
    submission.time_complexity || '',
    submission.space_complexity || '',
    JSON.stringify(submission.dead_code_items || []),
    JSON.stringify(submission.optimization_suggestions || []),
    submission.efficiency_rating || 0,
    JSON.stringify(submission.rating_breakdown || {})
  );
}

function getHistory(sessionId, userId, limit = 50) {
  const db = getDB();
  let stmt;
  let rows;

  if (userId) {
    // Authenticated user — get all their submissions
    stmt = db.prepare(`
      SELECT * FROM submissions
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `);
    rows = stmt.all(userId, limit);
  } else {
    // Guest mode — session-based
    stmt = db.prepare(`
      SELECT * FROM submissions
      WHERE session_id = ? AND user_id IS NULL
      ORDER BY created_at DESC
      LIMIT ?
    `);
    rows = stmt.all(sessionId, limit);
  }

  return rows.map(row => ({
    ...row,
    dead_code_items: JSON.parse(row.dead_code_items || '[]'),
    optimization_suggestions: JSON.parse(row.optimization_suggestions || '[]'),
    rating_breakdown: JSON.parse(row.rating_breakdown || '{}')
  }));
}

function getSubmissionById(id, sessionId, userId) {
  const db = getDB();
  let row;

  if (userId) {
    row = db.prepare('SELECT * FROM submissions WHERE id = ? AND user_id = ?').get(id, userId);
  } else {
    row = db.prepare('SELECT * FROM submissions WHERE id = ? AND session_id = ?').get(id, sessionId);
  }

  if (!row) return null;

  return {
    ...row,
    dead_code_items: JSON.parse(row.dead_code_items || '[]'),
    optimization_suggestions: JSON.parse(row.optimization_suggestions || '[]'),
    rating_breakdown: JSON.parse(row.rating_breakdown || '{}')
  };
}

function deleteSubmission(id, sessionId, userId) {
  const db = getDB();
  if (userId) {
    return db.prepare('DELETE FROM submissions WHERE id = ? AND user_id = ?').run(id, userId);
  }
  return db.prepare('DELETE FROM submissions WHERE id = ? AND session_id = ?').run(id, sessionId);
}

function clearHistory(sessionId, userId) {
  const db = getDB();
  if (userId) {
    return db.prepare('DELETE FROM submissions WHERE user_id = ?').run(userId);
  }
  return db.prepare('DELETE FROM submissions WHERE session_id = ?').run(sessionId);
}

// Migrate guest submissions to user account
function migrateGuestSubmissions(sessionId, userId) {
  const db = getDB();
  const stmt = db.prepare('UPDATE submissions SET user_id = ? WHERE session_id = ? AND user_id IS NULL');
  return stmt.run(userId, sessionId);
}

module.exports = {
  initDB, getDB,
  createUser, getUserByEmail, getUserById,
  saveSubmission, getHistory, getSubmissionById, deleteSubmission, clearHistory,
  migrateGuestSubmissions
};
