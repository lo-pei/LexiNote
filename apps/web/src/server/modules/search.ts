import type { DocKind, SessionUser, TiptapDoc } from '@ln/types';
import { SEARCH_BODY_SEP, searchTextOf } from '@ln/utils';
import { getDb } from '../db';

/**
 * 全文检索（FTS5 trigram + LIKE 后备）。
 *
 * 两条路径的原因：trigram 分词器按 3 字符切片，查询不足 3 个字符无法匹配。
 * 中文两字词（「对价」「约因」）恰好是最常见的查法，实测 FTS 命中 0 条，
 * 所以短查询改走 LIKE 全库扫描——222 份文档实测 35ms，可以接受。
 *
 * 权限：所有查询都先按 `VISIBLE_SQL` 过滤，与 documents.ts 的 getDocument 判定一致。
 * 不做「先搜后过滤」，避免把无权文档的标题、片段带进任何出口。
 */

/** 片段里高亮用的控制字符：不吐 HTML，渲染方自己决定用什么标签 */
const HL_OPEN = '\u0001';
const HL_CLOSE = '\u0002';
const SNIPPET_BEFORE = 60;
const SNIPPET_AFTER = 120;
const MAX_TERMS = 6;
const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 80;
/** trigram 分词器的最小查询长度 */
const TRIGRAM_MIN = 3;

/**
 * 可见范围，与 getDocument 的判定逐条对应：
 * 所有者 / 任课教师 / 已发布的教材与英文法律（公共读物）/ 已发布且已选课。
 * 占位符顺序固定为 uid, uid, uid，调用方按此顺序压参。
 */
const VISIBLE_SQL = `
  d.deleted_at IS NULL
  AND (
    d.owner_id = ?
    OR c.teacher_id = ?
    OR (d.kind IN ('TEXTBOOK', 'LAW') AND d.status = 'PUBLISHED')
    OR (
      d.status = 'PUBLISHED'
      AND EXISTS (SELECT 1 FROM enrollments e WHERE e.course_id = d.course_id AND e.student_id = ?)
    )
  )
`;

export interface SearchHit {
  docId: string;
  title: string;
  kind: DocKind;
  /** 班级名优先于课程名：两门课都叫「法律英语」时分不清 */
  courseTitle: string | null;
  /** 命中片段，关键词以 \u0001…\u0002 包裹 */
  snippet: string;
  /** 命中的不同关键词个数 */
  matched: number;
}

export interface SearchResult {
  hits: SearchHit[];
  terms: string[];
  /** fts = 索引检索；like = 短词后备 */
  mode: 'fts' | 'like';
  tookMs: number;
  /** 命中数达到上限，结果不完整 */
  truncated: boolean;
}

interface DocRow {
  id: string;
  title: string;
  kind: DocKind;
  content: string;
  course_title: string | null;
  score?: number;
}

/* ── 查询串处理 ───────────────────────────────────────────── */

/**
 * 切成关键词。剔掉 FTS5 语法字符（引号、星号、括号、冒号、脱字符），
 * 否则用户输入一个 `"` 就会让 MATCH 抛语法错误。
 */
export function parseTerms(raw: string): string[] {
  const cleaned = raw
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return [];

  const seen = new Set<string>();
  const out: string[] = [];
  for (const piece of cleaned.split(' ')) {
    if (piece.length < 2) continue;
    const key = piece.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(piece);
    if (out.length >= MAX_TERMS) break;
  }
  return out;
}

/** 纯 ASCII 词加前缀通配，输入未完成（consid）也能命中 consideration */
function toFtsQuery(terms: string[]): string {
  return terms
    .map((term) => {
      if (/^[A-Za-z0-9]+$/.test(term)) return `"${term}"*`;
      return `"${term.replace(/"/g, '')}"`;
    })
    .join(' ');
}

/* ── 片段与高亮 ───────────────────────────────────────────── */

function plainOf(content: string): string {
  try {
    return searchTextOf(JSON.parse(content) as TiptapDoc).replace(/\s+/g, ' ').trim();
  } catch {
    return '';
  }
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** 长词优先，避免短词先匹配把长词切碎 */
function highlight(text: string, terms: string[]): string {
  const pattern = terms
    .slice()
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp)
    .join('|');
  if (!pattern) return text;
  return text.replace(new RegExp(`(${pattern})`, 'gi'), `${HL_OPEN}$1${HL_CLOSE}`);
}

function buildHit(row: DocRow, terms: string[]): SearchHit | null {
  const body = plainOf(row.content);
  // 分隔符之后是术语释义区：只用于召回，取片段窗口时不能落在这里
  const sepAt = body.indexOf(SEARCH_BODY_SEP);
  const visible = sepAt >= 0 ? body.slice(0, sepAt).trim() : body;

  const lowerBody = body.toLowerCase();
  const lowerVisible = visible.toLowerCase();
  const lowerTitle = row.title.toLowerCase();

  const matched = terms.filter(
    (term) => lowerBody.includes(term.toLowerCase()) || lowerTitle.includes(term.toLowerCase()),
  );
  if (!matched.length) return null;

  // 以正文里最靠前的一处命中为中心取窗口
  const positions = terms.map((term) => lowerVisible.indexOf(term.toLowerCase())).filter((index) => index >= 0);

  let snippet: string;
  if (positions.length) {
    const anchor = Math.min(...positions);
    const start = Math.max(0, anchor - SNIPPET_BEFORE);
    const end = Math.min(visible.length, anchor + SNIPPET_AFTER);
    snippet = `${start > 0 ? '…' : ''}${visible.slice(start, end)}${end < visible.length ? '…' : ''}`;
  } else if (sepAt >= 0) {
    // 正文里没有，命中落在术语释义区（例如搜「对价」只匹配到 consideration 的中文释义）。
    // 这时不能拿正文开头充数——结果里看不到关键词，用户会以为搜错了。
    const lowerTail = body.slice(sepAt + 1).toLowerCase();
    const offsets = terms.map((term) => lowerTail.indexOf(term.toLowerCase())).filter((index) => index >= 0);
    if (offsets.length) {
      const at = sepAt + 1 + Math.min(...offsets);
      const start = Math.max(sepAt + 1, at - 36);
      const end = Math.min(body.length, at + 60);
      snippet = `术语释义：…${body.slice(start, end)}…`;
    } else {
      snippet = visible.slice(0, SNIPPET_AFTER);
    }
  } else {
    // 只命中标题
    snippet = visible.slice(0, SNIPPET_AFTER);
  }

  return {
    docId: row.id,
    title: row.title,
    kind: row.kind,
    courseTitle: row.course_title,
    snippet: highlight(snippet, terms),
    matched: matched.length,
  };
}

/* ── 两条检索路径 ─────────────────────────────────────────── */

interface PathResult {
  hits: SearchHit[];
  truncated: boolean;
  mode: 'fts' | 'like';
}

function ftsSearch(terms: string[], user: SessionUser, kind: DocKind | undefined, limit: number): PathResult {
  const db = getDb();
  const params: (string | number)[] = [toFtsQuery(terms), user.id, user.id, user.id];
  let kindSql = '';
  if (kind) {
    kindSql = 'AND d.kind = ?';
    params.push(kind);
  }
  params.push(limit + 1);

  const rows = db.all<DocRow & { score: number }>(
    `SELECT d.id, d.title, d.kind, d.content,
            COALESCE(cl.name, c.title) AS course_title,
            bm25(doc_fts) AS score
       FROM doc_fts
       JOIN documents d ON d.id = doc_fts.doc_id
       LEFT JOIN courses c ON c.id = d.course_id
       LEFT JOIN classes cl ON cl.id = c.class_id
      WHERE doc_fts MATCH ?
        AND ${VISIBLE_SQL}
        ${kindSql}
      ORDER BY score
      LIMIT ?`,
    ...params,
  );

  const hits: SearchHit[] = [];
  for (const row of rows) {
    const hit = buildHit(row, terms);
    if (hit) hits.push(hit);
  }
  return { hits: hits.slice(0, limit), truncated: rows.length > limit, mode: 'fts' };
}

function likeSearch(terms: string[], user: SessionUser, kind: DocKind | undefined, limit: number): PathResult {
  const db = getDb();
  const params: (string | number)[] = [user.id, user.id, user.id];
  let kindSql = '';
  if (kind) {
    kindSql = 'AND d.kind = ?';
    params.push(kind);
  }
  // content 存的是 ProseMirror JSON，这里只是粗筛；精筛与片段在 buildHit 里做
  const termSql = terms.map(() => '(d.title LIKE ? OR d.content LIKE ?)').join(' AND ');
  for (const term of terms) {
    params.push(`%${term}%`, `%${term}%`);
  }
  params.push(limit * 4);

  const rows = db.all<DocRow>(
    `SELECT d.id, d.title, d.kind, d.content,
            COALESCE(cl.name, c.title) AS course_title
       FROM documents d
       LEFT JOIN courses c ON c.id = d.course_id
       LEFT JOIN classes cl ON cl.id = c.class_id
      WHERE ${VISIBLE_SQL}
        ${kindSql}
        AND ${termSql}
      ORDER BY d.updated_at DESC
      LIMIT ?`,
    ...params,
  );

  const hits: SearchHit[] = [];
  for (const row of rows) {
    const hit = buildHit(row, terms);
    if (hit) hits.push(hit);
    if (hits.length > limit) break;
  }
  // LIKE 粗筛可能把 JSON 转义里的假命中带进来，实际条数按精筛后算
  return { hits: hits.slice(0, limit), truncated: hits.length > limit, mode: 'like' };
}

/* ── 对外入口 ─────────────────────────────────────────────── */

export function searchDocuments(
  raw: string,
  user: SessionUser,
  options: { kind?: DocKind; limit?: number } = {},
): SearchResult {
  const started = Date.now();
  const terms = parseTerms(raw);
  const limit = Math.min(Math.max(options.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
  if (!terms.length) return { hits: [], terms, mode: 'fts', tookMs: 0, truncated: false };

  ensureIndexed();

  // 任一关键词短于 3 字符就走 LIKE：混排查询里 FTS 会漏掉短词部分
  const useFts = terms.every((term) => term.length >= TRIGRAM_MIN);
  let path: PathResult;
  try {
    path = useFts ? ftsSearch(terms, user, options.kind, limit) : likeSearch(terms, user, options.kind, limit);
  } catch (cause) {
    // 索引表缺失或 MATCH 语法异常都退回 LIKE，宁可慢一点也不要搜不出东西
    console.warn('[search] FTS 查询失败，退回 LIKE', cause);
    path = likeSearch(terms, user, options.kind, limit);
  }

  return { ...path, terms, tookMs: Date.now() - started };
}

/* ── 索引维护 ─────────────────────────────────────────────── */

let indexChecked = false;

/**
 * 索引为空时懒建一次。
 * 源码包不含 data/，新库靠 db:seed 建；若不加这一步，搜索会一直是空的，
 * 看起来像功能坏了。只在「文档有索无」时补，不做一致性修复（那交给 CLI）。
 */
function ensureIndexed(): void {
  if (indexChecked) return;
  indexChecked = true;
  try {
    const db = getDb();
    const indexed = db.get<{ c: number }>(`SELECT count(*) AS c FROM doc_fts`)?.c ?? 0;
    if (indexed > 0) return;
    const total = db.get<{ c: number }>(`SELECT count(*) AS c FROM documents WHERE deleted_at IS NULL`)?.c ?? 0;
    if (total > 0) reindexAll();
  } catch {
    // 索引表不存在时搜索退化为空结果，不连累其它功能
  }
}

function rowidOf(docId: string): number | undefined {
  return getDb().get<{ rid: number }>(`SELECT rowid AS rid FROM documents WHERE id = ?`, docId)?.rid;
}

/**
 * 单文档增量索引。用 documents 的 rowid 做主键，删除只需一次 rowid 定位；
 * 若改用 `DELETE ... WHERE doc_id = ?`，FTS5 要扫全表，保存路径会明显变慢。
 */
export function indexDocument(docId: string): void {
  try {
    const db = getDb();
    const rid = rowidOf(docId);
    if (rid === undefined) {
      dropDocument(docId);
      return;
    }
    const row = db.get<{ title: string; content: string }>(`SELECT title, content FROM documents WHERE id = ?`, docId);
    if (!row) return;
    db.run(`DELETE FROM doc_fts WHERE rowid = ?`, rid);
    db.run(
      `INSERT INTO doc_fts(rowid, doc_id, title, body) VALUES (?, ?, ?, ?)`,
      rid,
      docId,
      row.title,
      plainOf(row.content),
    );
  } catch (cause) {
    // 索引不是保存的必要条件：失败只记日志，绝不能让一次保存整体失败
    console.warn('[search] 索引更新失败', docId, cause);
  }
}

export function dropDocument(docId: string): void {
  try {
    const rid = rowidOf(docId);
    if (rid !== undefined) getDb().run(`DELETE FROM doc_fts WHERE rowid = ?`, rid);
  } catch (cause) {
    console.warn('[search] 索引清理失败', docId, cause);
  }
}

/** 全量重建。导入大批文档后跑 `npm run search:index`，或用它兜底修复不一致。 */
export function reindexAll(): { documents: number; tookMs: number } {
  const db = getDb();
  const started = Date.now();
  const rows = db.all<{ rid: number; id: string; title: string; content: string }>(
    `SELECT rowid AS rid, id, title, content FROM documents WHERE deleted_at IS NULL ORDER BY rowid`,
  );
  db.run(`DELETE FROM doc_fts`);
  for (const row of rows) {
    db.run(
      `INSERT INTO doc_fts(rowid, doc_id, title, body) VALUES (?, ?, ?, ?)`,
      row.rid,
      row.id,
      row.title,
      plainOf(row.content),
    );
  }
  return { documents: rows.length, tookMs: Date.now() - started };
}

/** 索引与文档数是否一致，供维护页与测试断言 */
export function indexHealth(): { indexed: number; documents: number } {
  const db = getDb();
  return {
    indexed: db.get<{ c: number }>(`SELECT count(*) AS c FROM doc_fts`)?.c ?? 0,
    documents: db.get<{ c: number }>(`SELECT count(*) AS c FROM documents WHERE deleted_at IS NULL`)?.c ?? 0,
  };
}

/** 供渲染层把 \u0001…\u0002 切成可渲染的片段 */
export const HIGHLIGHT_MARKS = { open: HL_OPEN, close: HL_CLOSE } as const;
