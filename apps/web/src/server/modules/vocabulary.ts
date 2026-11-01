import type {
  SessionUser,
  SourceType,
  VocabularyEntry,
  Wordbook,
  WordbookExportDTO,
  WordbookItem,
} from '@ln/types';
import fs from 'node:fs';
import path from 'node:path';
import { masteryLabel } from '@ln/utils';
import { REPO_ROOT, getDb, parseJson } from '../db';
import type { Db } from '../db';
import { badRequest, forbidden, notFound } from '../http';
import { recordEvent } from './events';

const uid = (p: string) => `${p}_${globalThis.crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;

/* ── 内置词库（《法律英语术语表·张法连》，见 tooling/scripts/extract-glossary.mjs） ──
 *
 * 词表由部署者用自己手头的电子版生成，放在 data/glossary.zhang-falian.json，
 * 不随仓库发布：一是版权，二是不是每台机器都需要。文件缺失时整套内置词库
 * 自动跳过，生词本只剩「自定义单词本」，其余功能不受影响。
 */

const GLOSSARY_DOMAIN = '法律英语';
const GLOSSARY_FLAG = 'glossary:zhang-falian:v1';
const GLOSSARY_FILE = path.join(REPO_ROOT, 'data', 'glossary.zhang-falian.json');
const CUSTOM_BOOK = { name: '自定义单词本', description: '阅读时点开的术语、手动添加的词都在这里' };
const GLOSSARY_BOOK = { name: '法律英语单词本', description: '内置词库 · 张法连《法律英语术语表》' };

interface GlossaryRow {
  term: string;
  phonetic: string | null;
  definitionZh: string;
  definitionEn: string | null;
}

let glossaryCache: GlossaryRow[] | null = null;

function loadGlossary(): GlossaryRow[] {
  if (glossaryCache) return glossaryCache;
  try {
    const rows = JSON.parse(fs.readFileSync(GLOSSARY_FILE, 'utf8'));
    glossaryCache = Array.isArray(rows) ? (rows as GlossaryRow[]) : [];
  } catch {
    glossaryCache = [];
  }
  return glossaryCache;
}

/** 把内置术语表灌进 vocabulary_entries；只做一次，靠 app_meta 打标。 */
function ensureGlossaryEntries(db: Db): void {
  if (db.meta(GLOSSARY_FLAG)) return;
  const rows = loadGlossary();
  if (!rows.length) return;
  db.transaction(() => {
    for (const row of rows) {
      db.run(
        `INSERT OR IGNORE INTO vocabulary_entries (id, term, phonetic, definition_zh, definition_en, examples, legal_domain, origin)
         VALUES (?, ?, ?, ?, ?, NULL, ?, 'GLOSSARY')`,
        uid('voc'),
        row.term,
        row.phonetic,
        row.definitionZh,
        row.definitionEn,
        GLOSSARY_DOMAIN,
      );
    }
    db.setMeta(GLOSSARY_FLAG, String(rows.length));
  });
}

/** 内置术语表里的词条一次性收进某个用户的「法律英语单词本」（幂等）。 */
function fillGlossaryBook(userId: string, wordbookId: string): void {
  getDb().run(
    `INSERT OR IGNORE INTO wordbook_items
       (id, user_id, wordbook_id, entry_id, source_type, source_doc_id, source_context, mastery_level, added_at)
     SELECT 'wbi_' || lower(hex(randomblob(8))), ?, ?, e.id, 'MANUAL', NULL, NULL, 0, datetime('now')
     FROM vocabulary_entries e WHERE e.origin = 'GLOSSARY'`,
    userId,
    wordbookId,
  );
}

/**
 * 每个账号默认两个词表：空的自建词表 + 内置法律英语术语表。
 * 老库（只有「我的生词」）在首次访问时补齐并改名。
 */
function ensureDefaultBooks(user: SessionUser): void {
  const db = getDb();
  db.run(`UPDATE wordbooks SET name = ? WHERE user_id = ? AND name = '我的生词' AND kind = 'CUSTOM'`, CUSTOM_BOOK.name, user.id);

  const books = db.all<{ id: string; kind: string }>(`SELECT id, kind FROM wordbooks WHERE user_id = ?`, user.id);

  if (!books.some((b) => b.kind === 'CUSTOM')) {
    db.run(
      `INSERT INTO wordbooks (id, user_id, name, kind, description, created_at) VALUES (?, ?, ?, 'CUSTOM', ?, ?)`,
      uid('wb'),
      user.id,
      CUSTOM_BOOK.name,
      CUSTOM_BOOK.description,
      new Date(Date.now() - 2000).toISOString(),
    );
  }

  if (!books.some((b) => b.kind === 'GLOSSARY')) {
    const id = uid('wb');
    db.run(
      `INSERT INTO wordbooks (id, user_id, name, kind, description, created_at) VALUES (?, ?, ?, 'GLOSSARY', ?, ?)`,
      id,
      user.id,
      GLOSSARY_BOOK.name,
      GLOSSARY_BOOK.description,
      new Date(Date.now() - 1000).toISOString(),
    );
    fillGlossaryBook(user.id, id);
  }
}

export function listWordbooks(user: SessionUser): Wordbook[] {
  const db = getDb();
  ensureGlossaryEntries(db);
  ensureDefaultBooks(user);

  const rows = db.all<{ id: string; user_id: string; name: string; kind: Wordbook['kind']; description: string | null; n: number }>(
    `SELECT w.*, (SELECT COUNT(*) FROM wordbook_items i WHERE i.wordbook_id = w.id) AS n
     FROM wordbooks w WHERE w.user_id = ?
     ORDER BY CASE w.kind WHEN 'CUSTOM' THEN 0 ELSE 1 END, w.created_at ASC`,
    user.id,
  );
  return rows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    name: r.name,
    kind: r.kind,
    description: r.description,
    itemCount: r.n,
  }));
}

export function createWordbook(user: SessionUser, name: string, description?: string): Wordbook {
  const clean = name.trim();
  if (!clean) throw badRequest('词表名称不能为空。', 'name');
  const id = uid('wb');
  getDb().run(
    `INSERT INTO wordbooks (id, user_id, name, kind, description, created_at) VALUES (?, ?, ?, 'CUSTOM', ?, ?)`,
    id,
    user.id,
    clean,
    description?.trim() || null,
    new Date().toISOString(),
  );
  return { id, userId: user.id, name: clean, kind: 'CUSTOM', description: description ?? null, itemCount: 0 };
}

function ownBook(wordbookId: string, user: SessionUser): { id: string; name: string; kind: Wordbook['kind'] } {
  const row = getDb().get<{ id: string; name: string; user_id: string; kind: Wordbook['kind'] }>(
    `SELECT id, name, user_id, kind FROM wordbooks WHERE id = ?`,
    wordbookId,
  );
  if (!row) throw notFound('词表不存在。');
  if (row.user_id !== user.id) throw forbidden('只能访问自己的词表。');
  return { id: row.id, name: row.name, kind: row.kind };
}

interface ItemRow {
  id: string;
  user_id: string;
  wordbook_id: string;
  entry_id: string;
  source_type: SourceType;
  source_doc_id: string | null;
  source_context: string | null;
  mastery_level: number;
  added_at: string;
  source_title: string | null;
  term: string;
  phonetic: string | null;
  definition_zh: string;
  definition_en: string | null;
  examples: string | null;
  legal_domain: string | null;
}

function mapItem(r: ItemRow): WordbookItem {
  return {
    id: r.id,
    userId: r.user_id,
    wordbookId: r.wordbook_id,
    entryId: r.entry_id,
    sourceType: r.source_type,
    sourceDocId: r.source_doc_id,
    sourceDocTitle: r.source_title,
    sourceContext: r.source_context,
    masteryLevel: r.mastery_level,
    addedAt: r.added_at,
    entry: {
      id: r.entry_id,
      term: r.term,
      phonetic: r.phonetic,
      definitionZh: r.definition_zh,
      definitionEn: r.definition_en,
      examples: parseJson(r.examples, null),
      legalDomain: r.legal_domain,
    } satisfies VocabularyEntry,
  };
}

const ITEM_COLUMNS = `i.*, d.title AS source_title, e.term, e.phonetic, e.definition_zh, e.definition_en, e.examples, e.legal_domain`;
const ITEM_FROM = `FROM wordbook_items i
   JOIN vocabulary_entries e ON e.id = i.entry_id
   LEFT JOIN documents d ON d.id = i.source_doc_id
  WHERE i.wordbook_id = ?`;

export function listItems(wordbookId: string, user: SessionUser): WordbookItem[] {
  ownBook(wordbookId, user);
  const rows = getDb().all<ItemRow>(
    `SELECT ${ITEM_COLUMNS} ${ITEM_FROM} ORDER BY i.added_at DESC`,
    wordbookId,
  );
  return rows.map(mapItem);
}

export interface ItemPage {
  items: WordbookItem[];
  total: number;
}

/**
 * 分页取词条：内置术语表两千余条，必须服务端分页 + 搜索，
 * 否则一次性铺到页面上既慢也没法用。
 */
export function pageItems(
  wordbookId: string,
  user: SessionUser,
  opts: { q?: string; starts?: string; offset?: number; limit?: number } = {},
): ItemPage {
  const book = ownBook(wordbookId, user);
  const q = (opts.q ?? '').trim();
  const starts = (opts.starts ?? '').trim();
  const limit = Math.max(1, Math.min(200, opts.limit ?? 40));
  const offset = Math.max(0, opts.offset ?? 0);

  const filters: string[] = [];
  const params: (string | number)[] = [wordbookId];
  if (q) {
    filters.push(`(e.term LIKE ? OR e.definition_zh LIKE ?)`);
    params.push(`%${q}%`, `%${q}%`);
  }
  if (starts) {
    // 字母索引按词首匹配，和搜索框的「包含」语义分开
    filters.push(`e.term LIKE ?`);
    params.push(`${starts}%`);
  }
  const filter = filters.length ? ` AND ${filters.join(' AND ')}` : '';

  const total =
    getDb().get<{ n: number }>(`SELECT COUNT(*) AS n ${ITEM_FROM}${filter}`, ...params)?.n ?? 0;

  const order = book.kind === 'GLOSSARY' ? `e.term COLLATE NOCASE ASC, i.added_at ASC` : `i.added_at DESC`;
  const rows = getDb().all<ItemRow>(
    `SELECT ${ITEM_COLUMNS} ${ITEM_FROM}${filter} ORDER BY ${order} LIMIT ? OFFSET ?`,
    ...params,
    limit,
    offset,
  );

  return { items: rows.map(mapItem), total };
}

/** 内置术语表的字母索引，供词表页做 A–Z 跳转 */
export function glossaryIndex(wordbookId: string, user: SessionUser): { letter: string; n: number }[] {
  const book = ownBook(wordbookId, user);
  if (book.kind !== 'GLOSSARY') return [];
  return getDb()
    .all<{ letter: string; n: number }>(
      `SELECT upper(substr(e.term, 1, 1)) AS letter, COUNT(*) AS n
         FROM wordbook_items i JOIN vocabulary_entries e ON e.id = i.entry_id
        WHERE i.wordbook_id = ? AND e.term GLOB '[A-Za-z]*'
        GROUP BY letter ORDER BY letter`,
      wordbookId,
    )
    .filter((row) => /^[A-Z]$/.test(row.letter));
}

export interface AddItemInput {
  wordbookId: string;
  term: string;
  phonetic?: string;
  definitionZh: string;
  sourceType: SourceType;
  sourceDocId?: string | null;
  sourceContext?: string | null;
  courseId?: string | null;
}

export function addItem(user: SessionUser, input: AddItemInput): { itemId: string; created: boolean } {
  const book = ownBook(input.wordbookId, user);
  if (book.kind === 'GLOSSARY') throw badRequest('「法律英语单词本」是内置词库，请把新词收进自定义单词本。', 'wordbookId');
  const term = input.term.trim();
  const definition = input.definitionZh.trim();
  if (!term || !definition) throw badRequest('术语与释义都不能为空。');

  const db = getDb();
  let entry = db.get<{ id: string }>(
    `SELECT id FROM vocabulary_entries WHERE term = ? AND definition_zh = ?`,
    term,
    definition,
  );
  if (!entry) {
    const id = uid('voc');
    db.run(
      `INSERT INTO vocabulary_entries (id, term, phonetic, definition_zh, definition_en, examples, legal_domain)
       VALUES (?, ?, ?, ?, NULL, NULL, NULL)`,
      id,
      term,
      input.phonetic?.trim() || null,
      definition,
    );
    entry = { id };
  }

  const existing = db.get<{ id: string }>(
    `SELECT id FROM wordbook_items WHERE wordbook_id = ? AND entry_id = ?`,
    input.wordbookId,
    entry.id,
  );
  if (existing) return { itemId: existing.id, created: false };

  const itemId = uid('wbi');
  db.run(
    `INSERT INTO wordbook_items (id, user_id, wordbook_id, entry_id, source_type, source_doc_id, source_context, mastery_level, added_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`,
    itemId,
    user.id,
    input.wordbookId,
    entry.id,
    input.sourceType,
    input.sourceDocId ?? null,
    input.sourceContext?.slice(0, 400) ?? null,
    new Date().toISOString(),
  );

  recordEvent(user.id, 'WORD_ADDED', {
    term,
    ...(input.courseId ? { courseId: input.courseId } : {}),
  });
  return { itemId, created: true };
}

export function updateMastery(itemId: string, level: number, user: SessionUser): void {
  const db = getDb();
  const row = db.get<{ user_id: string }>(`SELECT user_id FROM wordbook_items WHERE id = ?`, itemId);
  if (!row) throw notFound('词条不存在。');
  if (row.user_id !== user.id) throw forbidden();
  db.run(
    `UPDATE wordbook_items SET mastery_level = ? WHERE id = ?`,
    Math.max(0, Math.min(3, Math.round(level))),
    itemId,
  );
}

export function removeItem(itemId: string, user: SessionUser): void {
  const db = getDb();
  const row = db.get<{ user_id: string }>(`SELECT user_id FROM wordbook_items WHERE id = ?`, itemId);
  if (!row) throw notFound('词条不存在。');
  if (row.user_id !== user.id) throw forbidden();
  db.run(`DELETE FROM wordbook_items WHERE id = ?`, itemId);
}

/**
 * 删除整本词表（连带词条）。
 * 内置词库是只读的共享资源，不让人删；自定义词表随便删，删完可以再建。
 */
export function deleteWordbook(wordbookId: string, user: SessionUser): void {
  const book = ownBook(wordbookId, user);
  if (book.kind === 'GLOSSARY') {
    throw forbidden('内置词库不可删除。可以在其中移除词条。');
  }
  const db = getDb();
  db.run(`DELETE FROM wordbook_items WHERE wordbook_id = ?`, book.id);
  db.run(`DELETE FROM wordbooks WHERE id = ?`, book.id);
}

/** 导出统一 DTO（说明书 §5.8）：三个渲染器只消费这一份数据 */
export function buildExportDTO(wordbookId: string, user: SessionUser): WordbookExportDTO {
  const book = ownBook(wordbookId, user);
  const items = listItems(wordbookId, user);
  const rows = items.map((item) => ({
    term: item.entry.term,
    phonetic: item.entry.phonetic ?? '',
    definitionZh: item.entry.definitionZh,
    definitionEn: item.entry.definitionEn ?? '',
    source: item.sourceDocTitle
      ? `${item.sourceType === 'COURSE' ? '课件' : '笔记'} · ${item.sourceDocTitle}`
      : item.sourceType === 'MANUAL'
        ? '手动添加'
        : item.sourceType === 'FORUM'
          ? '课堂讨论'
          : '—',
    context: item.sourceContext ?? '',
    example: item.entry.examples?.[0]?.sentence ?? '',
    mastery: masteryLabel(item.masteryLevel),
    addedAt: item.addedAt.slice(0, 10),
  }));

  return {
    wordbookName: book.name,
    ownerName: user.name,
    generatedAt: new Date().toISOString(),
    rows,
    meta: {
      total: rows.length,
      mastered: items.filter((i) => i.masteryLevel >= 2).length,
      sources: [...new Set(rows.map((r) => r.source).filter((s) => s !== '—'))],
    },
  };
}
