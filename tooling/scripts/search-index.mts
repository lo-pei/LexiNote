/**
 * 全文检索索引的全量重建。
 * 运行：npm run search:index
 *
 * 什么时候需要跑：
 *   1. 导入教材 / 英文法律 / 班级材料之后（这些脚本直接写 documents，不走 saveDocument，
 *      因此不会触发应用层的增量索引）；
 *   2. 搜索结果与文档明显不一致时，用它兜底修复。
 *
 * 日常编辑不需要跑：saveDocument / createDocument 会同步更新索引。
 *
 * 建表语句必须与 apps/web/src/server/db.ts 的 migrateSearch() 保持一致，
 * 否则应用层与 CLI 会各自建出结构不同的表。
 */
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { searchTextOf, countWords } from '@ln/utils';
import type { TiptapDoc } from '@ln/types';

const ROOT = process.cwd();
const DB_PATH = process.env.LN_DB_PATH
  ? path.resolve(ROOT, process.env.LN_DB_PATH)
  : path.join(ROOT, 'data', 'lexinote.db');

if (!fs.existsSync(DB_PATH)) {
  console.error(`找不到数据库：${DB_PATH}`);
  console.error('先跑 npm run db:seed 建库，再执行本脚本。');
  process.exit(1);
}

const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL;');

db.exec(
  `CREATE VIRTUAL TABLE IF NOT EXISTS doc_fts USING fts5(
     doc_id UNINDEXED,
     title,
     body,
     tokenize = 'trigram'
   )`,
);

/**
 * 与应用层同一套文本口径：正文 + 术语释义区。
 * 两边必须一致，否则 CLI 建出来的索引与增量索引的内容不同，
 * 会出现「刚导入的搜不到、点进文档保存一次反而能搜到」这种诡异现象。
 */
function plainOf(content: string): string {
  try {
    return searchTextOf(JSON.parse(content) as TiptapDoc)
      .replace(/\s+/g, ' ')
      .trim();
  } catch {
    return '';
  }
}

const rows = db
  .prepare(`SELECT rowid AS rid, id, title, content FROM documents WHERE deleted_at IS NULL ORDER BY rowid`)
  .all() as { rid: number; id: string; title: string; content: string }[];

const before = (db.prepare('SELECT count(*) AS c FROM doc_fts').get() as { c: number }).c;
const started = Date.now();

db.exec('BEGIN');
try {
  db.exec('DELETE FROM doc_fts');
  const insert = db.prepare('INSERT INTO doc_fts(rowid, doc_id, title, body) VALUES (?, ?, ?, ?)');
  let words = 0;
  let empty = 0;
  for (const row of rows) {
    const body = plainOf(row.content);
    if (!body) empty += 1;
    words += countWords(body);
    insert.run(row.rid, row.id, row.title, body);
  }
  db.exec('COMMIT');

  const tookMs = Date.now() - started;
  console.log(`索引重建完成：${rows.length} 份文档（原 ${before} 条），${words.toLocaleString('en-US')} 词`);
  console.log(`耗时 ${tookMs}ms${empty ? `，其中 ${empty} 份正文为空` : ''}`);
  console.log(`数据库：${DB_PATH}`);
} catch (cause) {
  db.exec('ROLLBACK');
  console.error('索引重建失败，已回滚：', cause);
  process.exit(1);
} finally {
  db.close();
}
