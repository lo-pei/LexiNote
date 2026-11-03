/**
 * 教材导入。
 *
 * 把「教材整理」目录下的分讲 Markdown 灌进数据库：一本书写一行 textbooks，
 * 每讲写一行 documents（kind = 'TEXTBOOK'），正文转 Tiptap JSON 后交给阅读工作台。
 *
 * 运行：npx tsx tooling/scripts/import-textbook.mts hejia
 *      npx tsx tooling/scripts/import-textbook.mts hejia "D:/自定义/教材目录"
 *
 * 为什么脚本放在仓库里、正文却不在：教材正文有版权，导入后的正文落在 data/lexinote.db，
 * 该目录已被 .gitignore 排除；仓库只留这份可复现的导入逻辑与书目元信息。
 *
 * 重复运行是安全的：先按 bookId 删掉旧章节再整体重写，不会累积副本。
 */
import fs from 'node:fs';
import path from 'node:path';
import type { TiptapDoc, TiptapNode } from '@ln/types';
import { countWords, textOf } from '@ln/utils';
import { Db, DB_PATH } from '../../apps/web/src/server/db';
import { bullets, doc, h, p, slugTerm } from '../content/builder';

/* ── 术语标注 ───────────────────────────────────────────── */

/**
 * 通用英语高频词。词库里确实收录了 court / law / case 这类词条，
 * 但它们标在正文里只会把整页变成虚线，读者反而找不到真正要查的词。
 */
const GENERIC = new Set(
  `a an the and or but if then than that this these those it its he she they them his her their we you i
not no so such all any some more most other into over under about after before between during through up down
out off again further once here when where why how what which who whom whose is are was were be been being have
has had do does did can may must shall should would could will there also only just very same own both each few
many much either neither nor yet still even ever never always often sometimes
case fact order title process decision act rule state person party time way end part point form word number level
area term book law legal court right power justice action cause matter thing place hand side line interest
question information opinion authority statement agreement
make made take taken give given get got go went come came see seen know known think thought say said
one two three first second third new old good bad great long short high low small large full
english american british united states state york`.split(/\s+/).filter(Boolean),
);

interface TermHit {
  term: string;
  phonetic: string;
  definition: string;
}

export interface TermMatcher {
  re: RegExp;
  byKey: Map<string, TermHit>;
  size: number;
}

const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * 从内置词库挑选可标注的术语。
 *
 * 规则来自对教材正文的实测：全量标注每 100 词命中 11.7 处，其中 will（遗嘱 vs 助动词）、
 * but（but-for test 的截断条目）、There（释义与词形不符）会造成明显误导；court / right /
 * power 各有两三条同形释义，同一处会重复标注。因此：
 *   1. 多词术语全收——几乎不会误标，且正是精读要讲的搭配；
 *   2. 单词术语要求「全库唯一释义 + 长度 ≥5 + 不在通用词表」；
 *   3. 只收纯英文字条，含标点或中文的跳过。
 * 收紧后密度约每 100 词 6 处。
 */
export function buildTermMatcher(db: Db): TermMatcher {
  const rows = db.all<{ term: string; phonetic: string | null; definition_zh: string }>(
    `SELECT term, phonetic, definition_zh FROM vocabulary_entries WHERE origin = 'GLOSSARY'`,
  );

  const homographs = new Map<string, number>();
  for (const r of rows) {
    const key = r.term.trim().toLowerCase();
    homographs.set(key, (homographs.get(key) ?? 0) + 1);
  }

  const picked = new Map<string, TermHit>();
  for (const r of rows) {
    const raw = r.term.trim();
    const key = raw.toLowerCase().replace(/\s+/g, ' ');
    if (!key || !r.definition_zh) continue;
    if (!/^[a-z][a-z\s'’-]*$/i.test(raw)) continue;
    const multiWord = /\s/.test(key);
    if (!multiWord) {
      if ((homographs.get(raw.toLowerCase()) ?? 0) !== 1) continue;
      if (key.length < 5 || GENERIC.has(key)) continue;
    }
    if (!picked.has(key)) {
      picked.set(key, { term: raw, phonetic: r.phonetic ?? '', definition: r.definition_zh });
    }
  }

  const list = [...picked.values()].sort((a, b) => b.term.length - a.term.length);
  const body = list.map((t) => escapeRe(t.term).replace(/\s+/g, '\\s+')).join('|');
  return {
    re: new RegExp(`(?<![A-Za-z])(${body})(?![A-Za-z])`, 'gi'),
    byKey: picked,
    size: list.length,
  };
}

/** 把一段纯文本按术语切开；未命中的部分原样保留为 text 节点 */
function splitByTerms(text: string, matcher: TermMatcher): TiptapNode[] {
  const out: TiptapNode[] = [];
  let cursor = 0;
  matcher.re.lastIndex = 0;

  for (let m = matcher.re.exec(text); m; m = matcher.re.exec(text)) {
    const key = m[0].toLowerCase().replace(/\s+/g, ' ');
    const hit = matcher.byKey.get(key);
    if (!hit) continue;
    if (m.index > cursor) out.push({ type: 'text', text: text.slice(cursor, m.index) });
    out.push({
      type: 'legalTerm',
      attrs: { termId: slugTerm(hit.term), phonetic: hit.phonetic, definition: hit.definition },
      content: [{ type: 'text', text: m[0] }],
    });
    cursor = m.index + m[0].length;
  }

  if (!out.length) return [{ type: 'text', text }];
  if (cursor < text.length) out.push({ type: 'text', text: text.slice(cursor) });
  return out;
}

/** 只标段落正文；标题进目录，标了反而干扰浏览 */
export function annotateTerms(nodes: TiptapNode[], matcher: TermMatcher): { nodes: TiptapNode[]; marks: number } {
  let marks = 0;
  const walk = (node: TiptapNode): TiptapNode => {
    if (node.type === 'text') return node;
    const children = node.content;
    if (!children?.length) return node;
    if (node.type === 'paragraph') {
      // 段落里的内容在导入阶段一定是纯 text（源 Markdown 没有行内标记）
      const text = children.map((c) => c.text ?? '').join('');
      if (!text) return node;
      const parts = splitByTerms(text, matcher);
      marks += parts.filter((part) => part.type === 'legalTerm').length;
      return { ...node, content: parts };
    }
    return { ...node, content: children.map(walk) };
  };
  return { nodes: nodes.map(walk), marks };
}

interface BookSpec {
  id: string;
  title: string;
  subtitle: string;
  author: string;
  publisher: string;
  edition: string;
  year: string;
  isbn: string;
  description: string;
  /** 分讲 Markdown 所在目录；命令行第二参数可覆盖 */
  dir: string;
  /** 该目录里不导入的文件名 */
  skip: string[];
}

const BOOKS: Record<string, BookSpec> = {
  hejia: {
    id: 'tb_hejiahong_4e',
    title: '法律英语（第四版）',
    subtitle: 'Legal English',
    author: '何家弘 编',
    publisher: '法律出版社',
    edition: '第四版',
    // 第 4 版首印 2008 年；OCR 到的版权页是 2015 年 7 月印次，年份统一取首印，与推荐书目一致
    year: '2008',
    isbn: '978-7-5036-8606-1',
    description:
      '国家级规划教材，二十二讲从法律制度讲到证据规则。每讲按背景知识、课文、注释、练习排列，适合系统打底。',
    dir: 'D:/A/大学/4研究生课程产出/06法律英语/教材整理/法律英语_第四版_何家弘',
    skip: ['00-总目录.md'],
  },
};

/* ── Markdown → Tiptap ─────────────────────────────────── */

/** 段内换行合并：英文补空格，中文直接接；行尾连字符视为断词 */
function joinLines(lines: string[]): string {
  let out = '';
  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    if (!out) {
      out = t;
      continue;
    }
    if (out.endsWith('-') && /^[a-z]/.test(t)) {
      out = out.slice(0, -1) + t;
      continue;
    }
    const cjkEnd = /[\u4e00-\u9fa5，。；：、）》”’！？]$/.test(out);
    const cjkStart = /^[\u4e00-\u9fa5（《“‘！？]/.test(t);
    out += cjkEnd || cjkStart ? t : ` ${t}`;
  }
  return out;
}

interface ParsedMd {
  title: string;
  subtitle: string | null;
  content: TiptapDoc;
}

export function parseMarkdown(raw: string): ParsedMd {
  const lines = raw.replace(/\r\n/g, '\n').split('\n');

  let title = '';
  const metaLines: string[] = [];
  const body: string[] = [];
  let seenBody = false;

  for (const line of lines) {
    const t = line.trimEnd();
    if (!seenBody && t.startsWith('# ')) {
      title = t.slice(2).trim();
      continue;
    }
    if (!seenBody && t.startsWith('>')) {
      metaLines.push(t.replace(/^>\s?/, '').trim());
      continue;
    }
    if (!seenBody && !t.trim()) {
      // 文件头与正文之间的空行，继续等待正文
      if (metaLines.length) continue;
      continue;
    }
    seenBody = true;
    body.push(t);
  }

  // 引用块第一行是英文讲名，其余是「教材 / 原书页码」这类整理时加的注记，不进正文
  const subtitle = metaLines.find((line) => line.length > 0) ?? null;

  const nodes: TiptapNode[] = [];
  let i = 0;
  while (i < body.length) {
    const line = body[i] ?? '';
    const stripped = line.trim();

    if (!stripped) {
      i += 1;
      continue;
    }

    // 表格（仅总目录出现）整块跳过
    if (stripped.startsWith('|')) {
      while (i < body.length && (body[i] ?? '').trim().startsWith('|')) i += 1;
      continue;
    }

    // 标题：md 的一级留给文档 title，正文从二级起；编辑器只支持 1–3 级，整体上提一级
    const heading = /^(#{2,4})\s+(.*)$/.exec(stripped);
    if (heading) {
      const level = (heading[1]!.length - 1) as 1 | 2 | 3;
      nodes.push(h(level, heading[2]!.trim()));
      i += 1;
      continue;
    }
    if (/^#\s/.test(stripped)) {
      i += 1;
      continue;
    }

    // 无序列表
    if (/^[-*]\s+/.test(stripped)) {
      const items: string[] = [];
      while (i < body.length && /^[-*]\s+/.test((body[i] ?? '').trim())) {
        items.push((body[i] ?? '').trim().replace(/^[-*]\s+/, ''));
        i += 1;
      }
      nodes.push(bullets(items));
      continue;
    }

    // 其余按段落：连续非空行合为一段
    // 编号行（「1. Questions about the text:」）不转列表——原书就是题号 + 独立段落的版式，
    // 列表化会把题干与设问拆散，反而不忠实。
    const para: string[] = [];
    while (i < body.length) {
      const cur = (body[i] ?? '').trim();
      if (!cur || cur.startsWith('#') || cur.startsWith('|') || /^[-*]\s+/.test(cur)) break;
      para.push(cur);
      i += 1;
    }
    if (para.length) nodes.push(p(joinLines(para)));
  }

  return { title, subtitle, content: doc(...nodes) };
}

/* ── 章节序号与标题 ─────────────────────────────────────── */

/** 从文件名推章节序号：前言 0，正文第 N 讲，附录 91/92 排到 901/902 置于卷末 */
function chapterNoOf(fileName: string): number {
  if (/^00-/.test(fileName)) return 0;
  const lesson = /第\s*(\d+)\s*课/.exec(fileName);
  if (lesson) return Number(lesson[1]);
  if (/^\d{2}-附录/.test(fileName)) return 900 + Number(fileName.slice(0, 2)) - 90;
  return 999;
}

/** 「第1课 法律制度」→「第 1 课 法律制度」，中文与数字之间留空是中文排版惯例 */
function tidyTitle(title: string): string {
  return title.replace(/^第\s*(\d+)\s*课/, (_m, n: string) => `第 ${n} 课`);
}

export interface ImportResult {
  book: string;
  chapters: { no: number; title: string; words: number; marks: number; file: string }[];
  totalWords: number;
  totalMarks: number;
  termPool: number;
}

/* ── 主流程 ─────────────────────────────────────────────── */

function pickOwnerId(db: Db): string {
  const preferred = db.get<{ id: string }>(`SELECT id FROM users WHERE login_no = 't202601'`);
  if (preferred) return preferred.id;
  const teacher = db.get<{ id: string }>(`SELECT id FROM users WHERE role IN ('TEACHER','ADMIN') LIMIT 1`);
  if (!teacher) throw new Error('库里没有教师账号，先跑 npm run db:seed。');
  return teacher.id;
}

export function importBook(db: Db, spec: BookSpec, dir: string, opts: { terms?: boolean } = {}): ImportResult {
  const withTerms = opts.terms !== false;
  const matcher = withTerms ? buildTermMatcher(db) : null;

  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.md') && !spec.skip.includes(f))
    .sort();

  if (!files.length) throw new Error(`目录里没有可分讲的 Markdown：${dir}`);

  const ownerId = pickOwnerId(db);
  const iso = new Date().toISOString();

  db.run(
    `INSERT INTO textbooks (id, title, subtitle, author, publisher, edition, year, isbn, description,
                            owner_id, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       title = excluded.title, subtitle = excluded.subtitle, author = excluded.author,
       publisher = excluded.publisher, edition = excluded.edition, year = excluded.year,
       isbn = excluded.isbn, description = excluded.description, updated_at = excluded.updated_at`,
    spec.id,
    spec.title,
    spec.subtitle,
    spec.author,
    spec.publisher,
    spec.edition,
    spec.year,
    spec.isbn,
    spec.description,
    ownerId,
    iso,
    iso,
  );

  // 重导：先清旧章节，避免同一讲出现两条
  db.run(`DELETE FROM documents WHERE textbook_id = ? AND kind = 'TEXTBOOK'`, spec.id);

  const chapters: ImportResult['chapters'] = [];
  let order = 0;

  for (const file of files) {
    const raw = fs.readFileSync(path.join(dir, file), 'utf8');
    const parsed = parseMarkdown(raw);
    const no = chapterNoOf(file);
    const title = tidyTitle(parsed.title || file.replace(/\.md$/, ''));
    const id = `doc_tb_${spec.id.replace(/^tb_/, '')}_${String(no).padStart(3, '0')}`;

    let content = parsed.content;
    let marks = 0;
    if (matcher) {
      const annotated = annotateTerms(content.content ?? [], matcher);
      content = { ...content, content: annotated.nodes };
      marks = annotated.marks;
    }
    const words = countWords(textOf(content));

    db.run(
      `INSERT INTO documents (id, owner_id, course_id, parent_doc_id, textbook_id, chapter_no,
                              title, subtitle, content, status, kind, sort_order, word_count,
                              created_at, updated_at)
       VALUES (?, ?, NULL, NULL, ?, ?, ?, ?, ?, 'PUBLISHED', 'TEXTBOOK', ?, ?, ?, ?)`,
      id,
      ownerId,
      spec.id,
      no,
      title,
      parsed.subtitle,
      JSON.stringify(content),
      order,
      words,
      iso,
      iso,
    );

    chapters.push({ no, title, words, marks, file });
    order += 1;
  }

  chapters.sort((a, b) => a.no - b.no);
  return {
    book: spec.title,
    chapters,
    totalWords: chapters.reduce((s, c) => s + c.words, 0),
    totalMarks: chapters.reduce((s, c) => s + c.marks, 0),
    termPool: matcher?.size ?? 0,
  };
}

/* ── 命令行入口 ─────────────────────────────────────────── */

// 只在被直接执行时跑命令行逻辑，被 import 时（例如做解析自检）保持安静
const invokedDirectly = /import-textbook\.mts$/.test((process.argv[1] ?? '').replace(/\\/g, '/'));

if (invokedDirectly) {
  const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const key = args[0];
  if (!key || !BOOKS[key]) {
    console.error(`用法：npx tsx tooling/scripts/import-textbook.mts <bookKey> [md目录] [--no-terms]`);
    console.error(`可用 bookKey：${Object.keys(BOOKS).join('、')}`);
    process.exit(1);
  }

  const withTerms = !process.argv.includes('--no-terms');
  const spec = BOOKS[key]!;
  const dir = args[1] ?? spec.dir;

  if (!fs.existsSync(dir)) {
    console.error(`目录不存在：${dir}`);
    process.exit(1);
  }

  console.log(`库文件：${DB_PATH}`);
  console.log(`教材：${spec.title} ← ${dir}`);
  console.log(`术语标注：${withTerms ? '开' : '关'}`);

  const db = new Db(DB_PATH);
  const result = importBook(db, spec, dir, { terms: withTerms });

  const density = result.totalWords ? ((result.totalMarks / (result.totalWords * 1.6)) * 100).toFixed(1) : '0';
  console.log(
    `\n导入完成：${result.chapters.length} 篇，${result.totalWords.toLocaleString('zh-CN')} 字，` +
      `标注术语 ${result.totalMarks.toLocaleString('zh-CN')} 处（词池 ${result.termPool} 条，约 ${density}/100 字）`,
  );
  for (const c of result.chapters) {
    console.log(
      `  ${String(c.no).padStart(3, ' ')}  ${c.title.padEnd(22, ' ')} ${String(c.words).padStart(7, ' ')} 字  ` +
        `${String(c.marks).padStart(5, ' ')} 处  ${c.file}`,
    );
  }
}
