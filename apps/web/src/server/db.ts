import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

/**
 * 数据层入口。
 *
 * 运行时使用 Node 22 内置的 `node:sqlite`：无需原生编译，克隆即可运行。
 * 数据契约见 prisma/schema.prisma（生产环境 PostgreSQL 15+ / JSONB）；
 * 本地 SQLite 适配器与之字段、约束、索引一一对应，切换时只替换本文件与仓储中的方言。
 */

function findRepoRoot(): string {
  let dir = process.cwd();
  for (let i = 0; i < 6; i += 1) {
    if (fs.existsSync(path.join(dir, 'packages', 'db', 'schema.sql'))) return dir;
    const next = path.dirname(dir);
    if (next === dir) break;
    dir = next;
  }
  return process.cwd();
}

export const REPO_ROOT = findRepoRoot();
export const DB_PATH = process.env.LN_DB_PATH
  ? path.resolve(REPO_ROOT, process.env.LN_DB_PATH)
  : path.join(REPO_ROOT, 'data', 'lexinote.db');

type Param = string | number | null;

export class Db {
  private readonly db: DatabaseSync;

  constructor(file: string) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    this.db = new DatabaseSync(file);
    this.db.exec('PRAGMA journal_mode = WAL;');
    this.db.exec('PRAGMA foreign_keys = ON;');
    const schema = fs.readFileSync(path.join(REPO_ROOT, 'packages', 'db', 'schema.sql'), 'utf8');
    this.db.exec(schema);
    this.migrate();
  }

  /**
   * 旧库迁移：schema.sql 里的 CREATE TABLE IF NOT EXISTS 不会改动既有表结构，
   * 因此这里补两件事——把 users 换成以 login_no 为账号的形态，以及给 courses 补 class_id。
   * 用户表无法靠 ALTER 去掉 email 的 NOT NULL，只能重建；重建期间必须关掉外键约束。
   */
  private migrate(): void {
    const userCols = this.columns('users');
    const emailCol = userCols.find((c) => c.name === 'email');
    const hasLoginNo = userCols.some((c) => c.name === 'login_no');

    if (!hasLoginNo || emailCol?.notnull === 1) {
      this.db.exec('PRAGMA foreign_keys = OFF');
      try {
        this.db.exec('BEGIN');
        this.db.exec(`
          CREATE TABLE users__rebuild (
            id            TEXT PRIMARY KEY,
            login_no      TEXT NOT NULL UNIQUE,
            email         TEXT UNIQUE,
            name          TEXT NOT NULL,
            role          TEXT NOT NULL DEFAULT 'STUDENT' CHECK (role IN ('ADMIN','TEACHER','STUDENT')),
            password_hash TEXT NOT NULL,
            created_at    TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
          )`);

        const loginNoExpr = hasLoginNo
          ? `COALESCE(NULLIF(lower(login_no), ''), NULLIF(lower(substr(email, 1, instr(email, '@') - 1)), ''), id)`
          : `COALESCE(NULLIF(lower(substr(email, 1, instr(email, '@') - 1)), ''), id)`;

        this.db.exec(`
          INSERT INTO users__rebuild (id, login_no, email, name, role, password_hash, created_at, updated_at)
          SELECT id, ${loginNoExpr}, NULLIF(email, ''), name, role, password_hash, created_at, updated_at
          FROM users`);

        this.db.exec('DROP TABLE users');
        this.db.exec('ALTER TABLE users__rebuild RENAME TO users');
        this.db.exec('COMMIT');
        console.warn('[db] users 表已迁移为「学号登录」结构，登录账号取原邮箱前缀。');
      } catch (error) {
        this.db.exec('ROLLBACK');
        throw error;
      } finally {
        this.db.exec('PRAGMA foreign_keys = ON');
      }
    }

    if (!this.columns('courses').some((c) => c.name === 'class_id')) {
      this.db.exec('ALTER TABLE courses ADD COLUMN class_id TEXT REFERENCES classes(id)');
    }
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_courses_class ON courses(class_id)');

    // 词表分「自建」与「内置术语表」两类；词条区分用户自建与内置词库来源。
    if (!this.columns('wordbooks').some((c) => c.name === 'kind')) {
      this.db.exec(`ALTER TABLE wordbooks ADD COLUMN kind TEXT NOT NULL DEFAULT 'CUSTOM'`);
    }
    if (!this.columns('vocabulary_entries').some((c) => c.name === 'origin')) {
      this.db.exec(`ALTER TABLE vocabulary_entries ADD COLUMN origin TEXT NOT NULL DEFAULT 'USER'`);
    }
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_vocab_origin ON vocabulary_entries(origin)');

    this.migrateDocuments();
  }

  /**
   * 文档表迁移：documents 的 kind 带 CHECK 约束，SQLite 无法 ALTER 放宽，
   * 只能重建表。每次新增一种文档类型都要走一遍，因此这里的判断按「缺哪一种」写，
   * 重建时按现有列取值，教材章节的 textbook_id / chapter_no 不会被这次迁移抹掉。
   * 判断依据直接读 sqlite_master 里的建表语句，比看列更准确——
   * 列都在但 CHECK 仍旧限制旧类型的情况同样要重建。
   */
  private migrateDocuments(): void {
    const row = this.db
      .prepare(`SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'documents'`)
      .get() as { sql: string } | undefined;
    const needsRebuild = Boolean(row && !row.sql.includes("'LAW'"));

    if (needsRebuild) {
      const cols = this.columns('documents');
      const pick = (name: string, fallback: string) => (cols.some((c) => c.name === name) ? name : fallback);

      this.db.exec('PRAGMA foreign_keys = OFF');
      try {
        this.db.exec('BEGIN');
        this.db.exec(`
          CREATE TABLE documents__rebuild (
            id            TEXT PRIMARY KEY,
            owner_id      TEXT NOT NULL REFERENCES users(id),
            course_id     TEXT REFERENCES courses(id),
            parent_doc_id TEXT REFERENCES documents(id),
            textbook_id   TEXT REFERENCES textbooks(id),
            chapter_no    INTEGER,
            legal_slug    TEXT,
            legal_category TEXT,
            legal_published_on TEXT,
            title         TEXT NOT NULL,
            subtitle      TEXT,
            content       TEXT NOT NULL,
            status        TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','PUBLISHED')),
            kind          TEXT NOT NULL DEFAULT 'NOTE' CHECK (kind IN ('COURSEWARE','NOTE','TEXTBOOK','LAW')),
            sort_order    INTEGER NOT NULL DEFAULT 0,
            word_count    INTEGER NOT NULL DEFAULT 0,
            created_at    TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
            deleted_at    TEXT
          )`);
        this.db.exec(`
          INSERT INTO documents__rebuild
            (id, owner_id, course_id, parent_doc_id, textbook_id, chapter_no,
             legal_slug, legal_category, legal_published_on,
             title, subtitle, content, status, kind, sort_order, word_count, created_at, updated_at, deleted_at)
          SELECT id, owner_id, course_id, parent_doc_id,
                 ${pick('textbook_id', 'NULL')}, ${pick('chapter_no', 'NULL')},
                 ${pick('legal_slug', 'NULL')}, ${pick('legal_category', 'NULL')},
                 ${pick('legal_published_on', 'NULL')},
                 title, subtitle, content, status, kind, sort_order, ${pick('word_count', '0')},
                 created_at, updated_at, deleted_at
          FROM documents`);
        this.db.exec('DROP TABLE documents');
        this.db.exec('ALTER TABLE documents__rebuild RENAME TO documents');
        this.db.exec('COMMIT');
        console.warn('[db] documents 表已重建：kind 放宽至四种类型，并补出英文法律的两列。');
      } catch (error) {
        this.db.exec('ROLLBACK');
        throw error;
      } finally {
        this.db.exec('PRAGMA foreign_keys = ON');
      }
    } else {
      // 新库走 schema.sql，这里只兜底列缺失的情况
      const cols = this.columns('documents');
      if (!cols.some((c) => c.name === 'textbook_id')) {
        this.db.exec('ALTER TABLE documents ADD COLUMN textbook_id TEXT REFERENCES textbooks(id)');
      }
      if (!cols.some((c) => c.name === 'chapter_no')) {
        this.db.exec('ALTER TABLE documents ADD COLUMN chapter_no INTEGER');
      }
      if (!cols.some((c) => c.name === 'legal_slug')) {
        this.db.exec('ALTER TABLE documents ADD COLUMN legal_slug TEXT');
      }
      if (!cols.some((c) => c.name === 'legal_category')) {
        this.db.exec('ALTER TABLE documents ADD COLUMN legal_category TEXT');
      }
      if (!cols.some((c) => c.name === 'legal_published_on')) {
        this.db.exec('ALTER TABLE documents ADD COLUMN legal_published_on TEXT');
      }
      if (!cols.some((c) => c.name === 'word_count')) {
        this.db.exec('ALTER TABLE documents ADD COLUMN word_count INTEGER NOT NULL DEFAULT 0');
      }
    }

    this.db.exec('CREATE INDEX IF NOT EXISTS idx_documents_course ON documents(course_id, kind, status)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_documents_owner ON documents(owner_id, kind)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_documents_textbook ON documents(textbook_id, chapter_no)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_documents_legal ON documents(legal_category, sort_order)');
    this.db.exec(
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_documents_legal_slug ON documents(legal_slug) WHERE legal_slug IS NOT NULL',
    );
  }

  /** 一次性初始化标记：键存在即视为已完成 */
  meta(key: string): string | null {
    const row = this.db.prepare('SELECT value FROM app_meta WHERE key = ?').get(key) as
      | { value: string }
      | undefined;
    return row?.value ?? null;
  }

  setMeta(key: string, value: string): void {
    this.db.prepare('INSERT INTO app_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?').run(
      key,
      value,
      value,
    );
  }

  private columns(table: string): { name: string; notnull: number }[] {
    return this.db.prepare(`PRAGMA table_info(${table})`).all() as { name: string; notnull: number }[];
  }

  all<T>(sql: string, ...params: Param[]): T[] {
    return this.db.prepare(sql).all(...params) as T[];
  }

  get<T>(sql: string, ...params: Param[]): T | undefined {
    return this.db.prepare(sql).get(...params) as T | undefined;
  }

  run(sql: string, ...params: Param[]): { changes: number | bigint; lastInsertRowid: number | bigint } {
    return this.db.prepare(sql).run(...params);
  }

  exec(sql: string): void {
    this.db.exec(sql);
  }

  transaction<T>(fn: () => T): T {
    this.db.exec('BEGIN');
    try {
      const out = fn();
      this.db.exec('COMMIT');
      return out;
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }
}

const globalForDb = globalThis as unknown as { __lnDb?: Db };

export function getDb(): Db {
  if (!globalForDb.__lnDb) globalForDb.__lnDb = new Db(DB_PATH);
  return globalForDb.__lnDb;
}

/* ── 行解析助手 ─────────────────────────────────────────── */

export function parseJson<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'object') return value as T;
  try {
    return JSON.parse(String(value)) as T;
  } catch {
    return fallback;
  }
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function id(prefix = ''): string {
  const raw = globalThis.crypto.randomUUID().replace(/-/g, '').slice(0, 20);
  return prefix ? `${prefix}_${raw}` : raw;
}
