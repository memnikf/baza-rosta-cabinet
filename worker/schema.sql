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

CREATE TABLE IF NOT EXISTS tests (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id        TEXT NOT NULL REFERENCES users(tilda_user_id),
  test_name      TEXT NOT NULL,
  score          INTEGER,
  interpretation TEXT DEFAULT '',
  created_at     TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_tests_user ON tests(user_id, id);

CREATE TABLE IF NOT EXISTS recommendations (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    TEXT NOT NULL REFERENCES users(tilda_user_id),
  category   TEXT DEFAULT 'Совет',
  text       TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_recom_user ON recommendations(user_id, id);

CREATE TABLE IF NOT EXISTS practice_messages (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    TEXT NOT NULL REFERENCES users(tilda_user_id),
  role       TEXT NOT NULL CHECK (role IN ('user','assistant')),
  content    TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_practice_user ON practice_messages(user_id, id);

-- База знаний Елизаветы: пополняется через админку, подмешивается в контекст ИИ
CREATE TABLE IF NOT EXISTS knowledge (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  category   TEXT DEFAULT 'Материал',        -- Тест / Практика / Материал / Факт о курсе
  title      TEXT NOT NULL,
  content    TEXT NOT NULL,
  enabled    INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);
