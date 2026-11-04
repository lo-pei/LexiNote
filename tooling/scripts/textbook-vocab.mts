/**
 * 教材核心词表。
 *
 * 教材正文里的 legalTerm 节点本身就带音标与释义，导入时只服务「点开看释义」，
 * 翻不了、复习不了。这里把全书术语汇总一遍，按「出现在几讲」排序，取出跨讲复现的
 * 那部分作为核心词，写到 data/textbook-vocab.local.json；生词本首次访问时据此建一本
 * 「教材核心词」。
 *
 * 为什么按跨讲复现而不是按出现次数：evidence 在一讲里出现 200 次，只能说明那一讲在讲证据；
 * 一个词在十几讲里都出现，才是整本书的通用骨架。次数只作为同档内的次级排序。
 *
 * 运行：npx tsx tooling/scripts/textbook-vocab.mts [bookId] [minChapters]
 * 默认 tb_hejiahong_4e、跨讲≥5（约 110 个词）。
 *
 * 输出文件落在 data/ 下，已被 .gitignore 排除：术语与释义来自教材正文，有版权，
 * 仓库只留这份可复现的抽取逻辑。
 */
import fs from 'node:fs';
import path from 'node:path';
import { Db, DB_PATH, REPO_ROOT } from '../../apps/web/src/server/db';

interface Node {
  type?: string;
  attrs?: Record<string, unknown> | null;
  content?: Node[];
}

interface Acc {
  term: string;
  phonetic: string;
  definition: string;
  count: number;
  chapters: Set<string>;
}

const OUT_FILE = path.join(REPO_ROOT, 'data', 'textbook-vocab.local.json');

function walk(node: Node | Node[] | undefined, hit: (attrs: Record<string, unknown>) => void): void {
  if (!node) return;
  if (Array.isArray(node)) {
    for (const child of node) walk(child, hit);
    return;
  }
  if (node.type === 'legalTerm' && node.attrs) hit(node.attrs);
  for (const child of node.content ?? []) walk(child, hit);
}

function main(): void {
  const bookId = process.argv[2] ?? 'tb_hejiahong_4e';
  const minChapters = Number(process.argv[3] ?? 5);

  const db = new Db(DB_PATH);
  const book = db.get<{ id: string; title: string; author: string }>(
    `SELECT id, title, author FROM textbooks WHERE id = ?`,
    bookId,
  );
  if (!book) {
    console.error(`没有 id 为 ${bookId} 的教材。`);
    process.exit(1);
  }

  const docs = db.all<{ id: string; title: string; content: string }>(
    `SELECT id, title, content FROM documents WHERE textbook_id = ? AND kind = 'TEXTBOOK' ORDER BY id`,
    bookId,
  );

  const map = new Map<string, Acc>();
  for (const doc of docs) {
    let parsed: Node;
    try {
      parsed = JSON.parse(doc.content) as Node;
    } catch {
      continue;
    }
    walk(parsed, (attrs) => {
      const term = String(attrs.termId ?? '').trim();
      if (!term) return;
      const key = term.toLowerCase();
      const hit = map.get(key) ?? {
        term,
        phonetic: String(attrs.phonetic ?? '').trim(),
        definition: String(attrs.definition ?? '').trim(),
        count: 0,
        chapters: new Set<string>(),
      };
      hit.count += 1;
      hit.chapters.add(doc.title);
      if (!hit.phonetic) hit.phonetic = String(attrs.phonetic ?? '').trim();
      if (!hit.definition) hit.definition = String(attrs.definition ?? '').trim();
      map.set(key, hit);
    });
  }

  const all = [...map.values()];
  const core = all
    .map((item) => ({
      term: item.term,
      phonetic: item.phonetic,
      definition: item.definition,
      count: item.count,
      chapters: item.chapters.size,
    }))
    .filter((item) => item.chapters >= minChapters && item.definition)
    .sort((a, b) => b.chapters - a.chapters || b.count - a.count || a.term.localeCompare(b.term));

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(
    OUT_FILE,
    `${JSON.stringify(
      {
        book: { id: book.id, title: book.title, author: book.author, chapters: docs.length },
        minChapters,
        generatedAt: new Date().toISOString(),
        totalTermNodes: all.reduce((sum, item) => sum + item.count, 0),
        uniqueTerms: all.length,
        terms: core,
      },
      null,
      1,
    )}\n`,
    'utf8',
  );

  console.log(`全书 ${docs.length} 讲，术语节点 ${all.reduce((sum, i) => sum + i.count, 0)} 个，去重 ${all.length} 个`);
  console.log(`跨讲 ≥ ${minChapters} 的核心词 ${core.length} 个 → ${OUT_FILE}`);
  for (const item of core.slice(0, 12)) {
    console.log(`  ${item.chapters} 讲 / ${item.count} 次  ${item.term}  ${item.definition.slice(0, 24)}`);
  }
}

main();
