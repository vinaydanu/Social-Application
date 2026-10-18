const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

// Ensure data directory exists
const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'connectsphere.db');
const db = new DatabaseSync(dbPath);

// Enable foreign keys
db.exec('PRAGMA foreign_keys = ON;');

// Initialize tables and indexes
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL COLLATE NOCASE,
    email TEXT UNIQUE NOT NULL COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    date_of_birth TEXT,
    gender TEXT,
    avatar_color TEXT DEFAULT '#1877f2',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login_at DATETIME
  );

  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
`);

/**
 * Parameterized helper queries to guarantee SQL injection safety
 */

// User queries
const insertUserStmt = db.prepare(`
  INSERT INTO users (first_name, last_name, username, email, password_hash, date_of_birth, gender, avatar_color)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const findUserByIdStmt = db.prepare(`
  SELECT id, first_name, last_name, username, email, date_of_birth, gender, avatar_color, created_at, last_login_at
  FROM users
  WHERE id = ?
`);

const findUserWithHashByIdentifierStmt = db.prepare(`
  SELECT id, first_name, last_name, username, email, password_hash, date_of_birth, gender, avatar_color, created_at, last_login_at
  FROM users
  WHERE email = ? OR username = ?
`);

const updateLastLoginStmt = db.prepare(`
  UPDATE users
  SET last_login_at = CURRENT_TIMESTAMP
  WHERE id = ?
`);

// Post queries
const insertPostStmt = db.prepare(`
  INSERT INTO posts (user_id, content)
  VALUES (?, ?)
`);

const getAllPostsStmt = db.prepare(`
  SELECT 
    posts.id, 
    posts.content, 
    posts.created_at, 
    users.id AS user_id, 
    users.first_name, 
    users.last_name, 
    users.username, 
    users.avatar_color
  FROM posts
  JOIN users ON posts.user_id = users.id
  ORDER BY posts.created_at DESC
  LIMIT 50
`);

module.exports = {
  db,
  
  createUser({ firstName, lastName, username, email, passwordHash, dateOfBirth = null, gender = null, avatarColor = '#1877f2' }) {
    const result = insertUserStmt.run(
      firstName.trim(),
      lastName.trim(),
      username.trim().toLowerCase(),
      email.trim().toLowerCase(),
      passwordHash,
      dateOfBirth,
      gender,
      avatarColor
    );
    return {
      id: Number(result.lastInsertRowid),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      username: username.trim().toLowerCase(),
      email: email.trim().toLowerCase(),
      avatarColor
    };
  },

  findUserById(id) {
    return findUserByIdStmt.get(id);
  },

  findUserWithHashByIdentifier(identifier) {
    const cleanIdentifier = identifier.trim().toLowerCase();
    return findUserWithHashByIdentifierStmt.get(cleanIdentifier, cleanIdentifier);
  },

  updateLastLogin(id) {
    return updateLastLoginStmt.run(id);
  },

  createPost(userId, content) {
    const result = insertPostStmt.run(userId, content.trim());
    return {
      id: Number(result.lastInsertRowid),
      userId,
      content: content.trim()
    };
  },

  getAllPosts() {
    return getAllPostsStmt.all();
  }
};
