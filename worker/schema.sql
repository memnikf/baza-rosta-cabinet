-- База Роста AI — схема D1
-- Применить: npx wrangler d1 execute baza-rosta-db --remote --file=./schema.sql

CREATE TABLE IF NOT EXISTS users (
  tilda_user_id TEXT PRIMARY KEY,
  email         TEXT DEFAULT '',
  name          TEXT DEFAULT 'Пользователь',
  memory_json   TEXT DEFAULT '{}',            -- память ИИ: цели, проблемы, факты, предпочтения
  created_at    TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS messages (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    TEXT NOT NULL REFERENCES users(tilda_user_id),
  role       TEXT NOT NULL CHECK (role IN ('user','assistant')),
  content    TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_messages_user ON messages(user_id, id);

CREATE TABLE IF NOT EXISTS states (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    TEXT NOT NULL REFERENCES users(tilda_user_id),
  mood       INTEGER,
  energy     INTEGER,
  stress     INTEGER,
  confidence INTEGER,
  motivation INTEGER,
  happiness  INTEGER,
  note       TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_states_user ON states(user_id, id);

CREATE TABLE IF NOT EXISTS diary (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    TEXT NOT NULL REFERENCES users(tilda_user_id),
  entry_json TEXT NOT NULL,                   -- diary_entry как есть (emotion, main_problem, ...)
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_diary_user ON diary(user_id, id);
