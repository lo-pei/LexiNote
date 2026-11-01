-- LexiNote schema (SQLite dialect)
-- 与 prisma/schema.prisma 的模型一一对应；JSON 列以 TEXT 存储并在仓储层解析。

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- 一次性初始化标记（内置词库是否已灌入等），避免每次启动重复写入。
CREATE TABLE IF NOT EXISTS app_meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- 账号即学号（教师为工号）。email 退居联系方式，可为空。
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  login_no      TEXT NOT NULL UNIQUE,
  email         TEXT UNIQUE,
  name          TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'STUDENT' CHECK (role IN ('ADMIN','TEACHER','STUDENT')),
  password_hash TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

/* ── 班级（教学班） ────────────────────────────────────────
   join_code 是 6 位班级码，教师可随时重置或关闭；
   邀请走 class_invites.token，可限次数与有效期。       */

CREATE TABLE IF NOT EXISTS classes (
  id          TEXT PRIMARY KEY,
  teacher_id  TEXT NOT NULL REFERENCES users(id),
  name        TEXT NOT NULL,
  term        TEXT,
  description TEXT,
  join_code   TEXT NOT NULL UNIQUE,
  join_open   INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_classes_teacher ON classes(teacher_id);

CREATE TABLE IF NOT EXISTS class_members (
  id           TEXT PRIMARY KEY,
  class_id     TEXT NOT NULL REFERENCES classes(id),
  user_id      TEXT NOT NULL REFERENCES users(id),
  login_no     TEXT,
  display_name TEXT,
  member_role  TEXT NOT NULL DEFAULT 'STUDENT' CHECK (member_role IN ('STUDENT','ASSISTANT')),
  source       TEXT NOT NULL DEFAULT 'CODE' CHECK (source IN ('CODE','INVITE','INVITED','MANUAL')),
  invited_by   TEXT REFERENCES users(id),
  joined_at    TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (class_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_class_members_user ON class_members(user_id);
CREATE INDEX IF NOT EXISTS idx_class_members_class ON class_members(class_id, joined_at);

CREATE TABLE IF NOT EXISTS class_invites (
  id          TEXT PRIMARY KEY,
  class_id    TEXT NOT NULL REFERENCES classes(id),
  token       TEXT NOT NULL UNIQUE,
  created_by  TEXT NOT NULL REFERENCES users(id),
  note        TEXT,
  max_uses    INTEGER NOT NULL DEFAULT 0,
  used_count  INTEGER NOT NULL DEFAULT 0,
  expires_at  TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_class_invites_class ON class_invites(class_id, created_at DESC);

CREATE TABLE IF NOT EXISTS courses (
  id          TEXT PRIMARY KEY,
  teacher_id  TEXT NOT NULL REFERENCES users(id),
  class_id    TEXT REFERENCES classes(id),
  title       TEXT NOT NULL,
  description TEXT,
  term        TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS enrollments (
  id          TEXT PRIMARY KEY,
  student_id  TEXT NOT NULL REFERENCES users(id),
  course_id   TEXT NOT NULL REFERENCES courses(id),
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (student_id, course_id)
);

CREATE TABLE IF NOT EXISTS documents (
  id            TEXT PRIMARY KEY,
  owner_id      TEXT NOT NULL REFERENCES users(id),
  course_id     TEXT REFERENCES courses(id),
  parent_doc_id TEXT REFERENCES documents(id),
  title         TEXT NOT NULL,
  subtitle      TEXT,
  content       TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','PUBLISHED')),
  kind          TEXT NOT NULL DEFAULT 'NOTE' CHECK (kind IN ('COURSEWARE','NOTE')),
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at    TEXT
);
CREATE INDEX IF NOT EXISTS idx_documents_course ON documents(course_id, kind, status);
CREATE INDEX IF NOT EXISTS idx_documents_owner ON documents(owner_id, kind);

CREATE TABLE IF NOT EXISTS document_snapshots (
  id          TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES documents(id),
  user_id     TEXT NOT NULL REFERENCES users(id),
  content     TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_snapshots_doc ON document_snapshots(document_id, created_at DESC);

CREATE TABLE IF NOT EXISTS sidebar_items (
  id         TEXT PRIMARY KEY,
  doc_id     TEXT NOT NULL REFERENCES documents(id),
  type       TEXT NOT NULL CHECK (type IN ('EXTENSION','ARTICLE','TEACHER_NOTE')),
  title      TEXT NOT NULL,
  content    TEXT NOT NULL,
  level      TEXT NOT NULL DEFAULT 'OPTIONAL' CHECK (level IN ('REQUIRED','OPTIONAL')),
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_sidebar_doc ON sidebar_items(doc_id, sort_order);

CREATE TABLE IF NOT EXISTS translation_templates (
  id             TEXT PRIMARY KEY,
  source_hash    TEXT NOT NULL UNIQUE,
  source_text    TEXT NOT NULL,
  translation    TEXT NOT NULL,
  lang_pair      TEXT NOT NULL DEFAULT 'en-zh',
  term_overrides TEXT,
  created_by     TEXT NOT NULL REFERENCES users(id),
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS vocabulary_entries (
  id            TEXT PRIMARY KEY,
  term          TEXT NOT NULL,
  phonetic      TEXT,
  definition_zh TEXT NOT NULL,
  definition_en TEXT,
  examples      TEXT,
  legal_domain  TEXT,
  origin        TEXT NOT NULL DEFAULT 'USER' CHECK (origin IN ('USER','GLOSSARY')),
  UNIQUE (term, definition_zh)
);

CREATE TABLE IF NOT EXISTS wordbooks (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id),
  name        TEXT NOT NULL,
  kind        TEXT NOT NULL DEFAULT 'CUSTOM' CHECK (kind IN ('CUSTOM','GLOSSARY')),
  description TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS wordbook_items (
  id             TEXT PRIMARY KEY,
  user_id        TEXT NOT NULL REFERENCES users(id),
  wordbook_id    TEXT NOT NULL REFERENCES wordbooks(id),
  entry_id       TEXT NOT NULL REFERENCES vocabulary_entries(id),
  source_type    TEXT NOT NULL CHECK (source_type IN ('COURSE','DOCUMENT','FORUM','MANUAL')),
  source_doc_id  TEXT,
  source_context TEXT,
  mastery_level  INTEGER NOT NULL DEFAULT 0,
  added_at       TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (wordbook_id, entry_id)
);
CREATE INDEX IF NOT EXISTS idx_wordbook_items_user ON wordbook_items(user_id, added_at DESC);

CREATE TABLE IF NOT EXISTS forum_topics (
  id                  TEXT PRIMARY KEY,
  course_id           TEXT NOT NULL REFERENCES courses(id),
  author_id           TEXT NOT NULL REFERENCES users(id),
  type                TEXT NOT NULL CHECK (type IN ('QUESTION','ASSIGNMENT')),
  title               TEXT NOT NULL,
  body                TEXT NOT NULL,
  is_graded           INTEGER NOT NULL DEFAULT 0,
  due_at              TEXT,
  allowed_reply_roles TEXT NOT NULL DEFAULT '["TEACHER","STUDENT"]',
  created_at          TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_topics_course ON forum_topics(course_id, created_at DESC);

CREATE TABLE IF NOT EXISTS forum_posts (
  id             TEXT PRIMARY KEY,
  topic_id       TEXT NOT NULL REFERENCES forum_topics(id),
  author_id      TEXT NOT NULL REFERENCES users(id),
  parent_post_id TEXT REFERENCES forum_posts(id),
  body           TEXT NOT NULL,
  is_answer      INTEGER NOT NULL DEFAULT 0,
  score          INTEGER,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_posts_topic ON forum_posts(topic_id, created_at);

CREATE TABLE IF NOT EXISTS annotations (
  id          TEXT PRIMARY KEY,
  target_type TEXT NOT NULL CHECK (target_type IN ('POST','DOCUMENT_SNAPSHOT')),
  target_id   TEXT NOT NULL,
  anchor      TEXT NOT NULL,
  author_id   TEXT NOT NULL REFERENCES users(id),
  content     TEXT NOT NULL,
  is_private  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_annotations_target ON annotations(target_type, target_id);

CREATE TABLE IF NOT EXISTS learning_events (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id),
  event_type TEXT NOT NULL,
  payload    TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_events_user ON learning_events(user_id, event_type, created_at);

-- 聚合表：仪表盘只读这里（说明书 §5.10 / §10.8）
CREATE TABLE IF NOT EXISTS analytics_daily (
  id                TEXT PRIMARY KEY,
  day               TEXT NOT NULL,
  course_id         TEXT NOT NULL,
  student_id        TEXT NOT NULL,
  note_saves        INTEGER NOT NULL DEFAULT 0,
  term_clicks       INTEGER NOT NULL DEFAULT 0,
  words_added       INTEGER NOT NULL DEFAULT 0,
  forum_replies     INTEGER NOT NULL DEFAULT 0,
  translation_checks INTEGER NOT NULL DEFAULT 0,
  translation_hits  INTEGER NOT NULL DEFAULT 0,
  UNIQUE (day, course_id, student_id)
);
CREATE INDEX IF NOT EXISTS idx_analytics_course ON analytics_daily(course_id, day);

CREATE TABLE IF NOT EXISTS skill_configs (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL UNIQUE,
  yaml       TEXT NOT NULL,
  version    INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS dev_logs (
  id         TEXT PRIMARY KEY,
  phase      TEXT NOT NULL,
  goal       TEXT NOT NULL,
  decisions  TEXT NOT NULL,
  status     TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);
