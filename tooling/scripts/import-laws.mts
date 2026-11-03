/**
 * 英文法律导入。
 *
 * 把 npc-laws-en 目录下按部门法归档的 Markdown 灌进数据库：一篇写一行 documents
 * （kind = 'LAW'），正文转 Tiptap JSON 后交给阅读工作台。分类骨架不落库——
 * 只有固定七类，读 content/legal-library.ts 即可，见 modules/laws.ts 的说明。
 *
 * 运行：npx tsx tooling/scripts/import-laws.mts
 *      npx tsx tooling/scripts/import-laws.mts "D:/A项目/npc-laws-en" --no-terms
 *      npx tsx tooling/scripts/import-laws.mts --only 02
 *
 * 正文来自全国人大官网英文版（Translation for Reference Only），已公开可访问；
 * 导入后的正文落在 data/lexinote.db（已被 .gitignore 排除），仓库只留可复现的解析逻辑。
 *
 * 重复运行是安全的：先删掉旧的 LAW 篇目再整体重写，不会累积副本。
 */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import type { TiptapDoc, TiptapNode } from '@ln/types';
import { countWords, textOf } from '@ln/utils';
import { Db, DB_PATH } from '../../apps/web/src/server/db';
import { doc, h, p } from '../content/builder';
import { annotateTerms, buildTermMatcher } from './import-textbook.mts';

const DEFAULT_DIR = 'D:/A项目/npc-laws-en';

/* ── 标题清洗 ───────────────────────────────────────────── */

/** 标题里的长前缀不进入 URL：`Law of the People's Republic of China on ...` 只留后半段 */
function shortLabel(title: string): string {
  return title
    .replace(/^Law of the People['’]s Republic of China on\s+/i, '')
    .replace(/^Law of the People['’]s Republic of China\b\s*/i, '')
    .replace(
      /^Decision of the Standing Committee of the National People['’]s Congress on\s+/i,
      'Decision on ',
    )
    .replace(/^Decision of the Standing Committee of the National People['’]s Congress\b\s*/i, 'Decision ');
}

function slugify(title: string, date: string): string {
  const base = shortLabel(title)
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 58)
    .replace(/-+$/, '');
  const year = /^\d{4}/.test(date) ? date.slice(0, 4) : '';
  return year ? `${base || 'law'}-${year}` : base || 'law';
}

/* ── Markdown → Tiptap ─────────────────────────────────── */

/**
 * 章节编号的写法：阿拉伯数字、罗马数字（含 Unicode Ⅰ Ⅱ Ⅲ）、英文数词（Section Four）。
 * 少了英文数词那一支，「Section Four Institutional Setup…」会漏成普通段落，
 * 于是前面的目录块识别不出来，右侧目录整份重复一次。
 */
const NUMERAL =
  '(?:[IVXLCDMⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩⅪⅫ0-9]+|One|Two|Three|Four|Five|Six|Seven|Eight|Nine|Ten|Eleven|Twelve|Thirteen|Fourteen|Fifteen|Sixteen|Seventeen|Eighteen|Nineteen|Twenty)';

/**
 * 章节标题：`Chapter I General Provisions`，也有把标题放到下一行写的。
 * 编号后不用 \b：Unicode 罗马数字不是 \w，Ⅸ 后面接空格时 \b 不成立，
 * 那样「Chapter Ⅸ」会漏成普通段落，整章的目录项跟着丢。
 */
const HEADING_RE = new RegExp(`^(Book|Part|Title|Chapter|Section|Subsection)\\s+(${NUMERAL})(?=\\s|$)(.*)$`, 'i');
const LOOSE_HEADING_RE = new RegExp(`^(Book|Part|Title|Chapter|Section|Subsection)\\s+(${NUMERAL})\\s*$`, 'i');
const STANDALONE_RE = /^(Preface|Preamble|Contents|Appendix|Annex|Supplementary Provisions?|General Provisions)\s*$/i;

/** 章节种类 → 正文标题级别：Book/Part 最高，Chapter 次之，Section 再次 */
function headingLevel(kind: string): 1 | 2 | 3 {
  const k = kind.toLowerCase();
  if (k === 'book' || k === 'part' || k === 'title') return 1;
  if (k === 'chapter') return 2;
  return 3;
}

export interface ParsedLaw {
  title: string;
  content: TiptapDoc;
  /** 解析出的章节数，用于导入后核对 */
  headings: number;
  paragraphs: number;
}

const textOfNode = (node: TiptapNode): string => (node.content ?? []).map((c) => c.text ?? '').join('');

/**
 * 去掉正文开头重复的章节目录。
 *
 * 官网译文常在 `Contents` 之后把章名再列一遍（Chapter I…、Section 1…），
 * 与后面的正文逐字相同。这一段若照收，右侧目录会整份重复一次。
 * 判据：第一个章节标题再次出现，且两者之间全是标题节点（没有正文段落）——
 * 这就是目录块，删掉前一份，保留正文。
 */
function stripRepeatedOutline(nodes: TiptapNode[]): TiptapNode[] {
  const heads = nodes.map((node, index) => ({ node, index })).filter((item) => item.node.type === 'heading');
  if (heads.length < 4) return nodes;

  const first = textOfNode(heads[0]!.node);
  const again = heads.findIndex((item, idx) => idx > 0 && textOfNode(item.node) === first);
  if (again <= 0) return nodes;

  const start = heads[0]!.index;
  const end = heads[again]!.index;
  const middle = nodes.slice(start, end);
  if (!middle.length || middle.some((node) => node.type !== 'heading')) return nodes;

  return [...nodes.slice(0, start), ...nodes.slice(end)];
}

export function parseLawMarkdown(raw: string): ParsedLaw {
  const lines = raw.replace(/\r\n/g, '\n').split('\n');

  let title = '';
  const body: string[] = [];
  let inHead = true;

  for (const line of lines) {
    const t = line.trim();

    // 头部：一级标题、元数据表格、沿革引用，直到第一条分隔线
    if (inHead) {
      if (t.startsWith('# ')) {
        title = t.slice(2).trim();
        continue;
      }
      if (t === '---') {
        inHead = false;
        continue;
      }
      if (!t || t.startsWith('|') || t.startsWith('>')) continue;
      // 头部里出现别的内容（少数文件没有分隔线），就地转入正文
      inHead = false;
    }

    body.push(t);
  }

  const nodes: TiptapNode[] = [];

  // 分隔线之后正文常以书名再起一行，与文档标题重复，去掉最前面那一处
  let firstContent = 0;
  while (firstContent < body.length && !body[firstContent]!.trim()) firstContent += 1;
  const leading = body[firstContent]?.trim() ?? '';
  if (
    title &&
    leading &&
    leading.length <= title.length + 12 &&
    leading.toLowerCase().startsWith(title.toLowerCase().slice(0, Math.min(28, title.length)))
  ) {
    body[firstContent] = '';
  }

  /** 合并段落内被硬换行拆开的行：英文补空格，行尾连字符视为断词 */
  const joinLines = (items: string[]): string => {
    let out = '';
    for (const item of items) {
      const t = item.trim();
      if (!t) continue;
      if (!out) {
        out = t;
        continue;
      }
      if (out.endsWith('-') && /^[a-z]/.test(t)) {
        out = out.slice(0, -1) + t;
        continue;
      }
      out += ` ${t}`;
    }
    return out;
  };

  let i = 0;
  while (i < body.length) {
    const line = body[i] ?? '';
    const t = line.trim();

    if (!t) {
      i += 1;
      continue;
    }

    // 重复的书名（分隔线之后正文又以标题开头一次）
    if (!nodes.length && title && t.toLowerCase() === title.toLowerCase()) {
      i += 1;
      continue;
    }

    const heading = HEADING_RE.exec(t);
    if (heading) {
      const level = headingLevel(heading[1]!);
      let text = `${heading[1]} ${heading[2]}${heading[3] ? ` ${heading[3].trim()}` : ''}`.trim();
      i += 1;
      // 只有编号、标题在下一行的情况
      if (!heading[3]?.trim()) {
        while (i < body.length && !(body[i] ?? '').trim()) i += 1;
        const next = (body[i] ?? '').trim();
        if (next && !HEADING_RE.test(next) && !/^Article\b/i.test(next) && next.length < 160) {
          text = `${text} ${next}`;
          i += 1;
        }
      }
      nodes.push(h(level, text.replace(/\s+/g, ' ')));
      continue;
    }

    if (STANDALONE_RE.test(t)) {
      i += 1;
      // 单独一行的 Contents 只是页面目录残留，正文标题另起，直接丢掉
      if (/^Contents$/i.test(t)) continue;
      nodes.push(h(2, t));
      continue;
    }

    if (LOOSE_HEADING_RE.test(t)) {
      // 上面 HEADING_RE 已覆盖，这里只兜底带行尾空格的写法
      i += 1;
      continue;
    }

    // 其余按段落：连续非空行合为一段，遇到章标题/空行即断开
    const para: string[] = [];
    while (i < body.length) {
      const cur = (body[i] ?? '').trim();
      if (!cur) break;
      if (para.length && (HEADING_RE.test(cur) || STANDALONE_RE.test(cur))) break;
      para.push(cur);
      i += 1;
    }
    if (para.length) nodes.push(p(joinLines(para)));
  }

  const cleaned = stripRepeatedOutline(nodes);
  return {
    title,
    content: doc(...cleaned),
    headings: cleaned.filter((node) => node.type === 'heading').length,
    paragraphs: cleaned.filter((node) => node.type === 'paragraph').length,
  };
}

/* ── 目录扫描 ───────────────────────────────────────────── */

interface LawFile {
  category: string;
  file: string;
  path: string;
  date: string;
}

const CATEGORY_DIR_RE = /^(\d{2})\s+(.+)$/;

function scan(dir: string, only: string | null): LawFile[] {
  const out: LawFile[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const match = CATEGORY_DIR_RE.exec(entry.name);
    if (!match) continue;
    const category = match[1]!;
    if (only && category !== only) continue;

    for (const file of fs.readdirSync(path.join(dir, entry.name)).sort()) {
      if (!file.endsWith('.md')) continue;
      const date = /^(\d{4}-\d{2}-\d{2})/.exec(file)?.[1] ?? '';
      out.push({ category, file, path: path.join(dir, entry.name, file), date });
    }
  }
  return out;
}

/* ── 主流程 ─────────────────────────────────────────────── */

function pickOwnerId(db: Db): string {
  const preferred = db.get<{ id: string }>(`SELECT id FROM users WHERE login_no = 't202601'`);
  if (preferred) return preferred.id;
  const teacher = db.get<{ id: string }>(`SELECT id FROM users WHERE role IN ('TEACHER','ADMIN') LIMIT 1`);
  if (!teacher) throw new Error('库里没有教师账号，先跑 npm run db:seed。');
  return teacher.id;
}

export interface ImportLawsResult {
  docs: number;
  words: number;
  marks: number;
  termPool: number;
  categories: { code: string; docs: number; words: number }[];
  slugs: string[];
}

export function importLaws(
  db: Db,
  dir: string,
  opts: { terms?: boolean; only?: string | null } = {},
): ImportLawsResult {
  const withTerms = opts.terms !== false;
  const matcher = withTerms ? buildTermMatcher(db) : null;
  const files = scan(dir, opts.only ?? null);
  if (!files.length) throw new Error(`目录里没有分好类的 Markdown：${dir}`);

  const ownerId = pickOwnerId(db);
  const iso = new Date().toISOString();

  // 重导：先清旧篇目，避免同一条法律出现两份
  db.run(`DELETE FROM documents WHERE kind = 'LAW'`);

  const used = new Map<string, number>();
  const perCategory = new Map<string, { docs: number; words: number }>();
  const slugs: string[] = [];
  let words = 0;
  let marks = 0;

  files.sort((a, b) => (a.category === b.category ? a.file.localeCompare(b.file) : a.category.localeCompare(b.category)));

  for (const item of files) {
    const raw = fs.readFileSync(item.path, 'utf8');
    const parsed = parseLawMarkdown(raw);
    const title = parsed.title || item.file.replace(/^\d{4}-\d{2}-\d{2}\s+|\.md$/g, '');

    // slug 冲突（同名法律的修订版）追加序号，保证地址唯一
    let slug = slugify(title, item.date);
    const seen = used.get(slug) ?? 0;
    used.set(slug, seen + 1);
    if (seen) slug = `${slug}-${seen + 1}`;

    let content = parsed.content;
    let docMarks = 0;
    if (matcher) {
      const annotated = annotateTerms(content.content ?? [], matcher);
      content = { ...content, content: annotated.nodes };
      docMarks = annotated.marks;
    }
    const wordCount = countWords(textOf(content));

    const id = `doc_law_${createHash('sha1').update(slug).digest('hex').slice(0, 14)}`;
    const stats = perCategory.get(item.category) ?? { docs: 0, words: 0 };
    stats.docs += 1;
    stats.words += wordCount;
    perCategory.set(item.category, stats);
    words += wordCount;
    marks += docMarks;
    slugs.push(slug);

    db.run(
      `INSERT INTO documents (id, owner_id, course_id, parent_doc_id, textbook_id, chapter_no,
                              legal_slug, legal_category, legal_published_on,
                              title, subtitle, content, status, kind, sort_order, word_count,
                              created_at, updated_at)
       VALUES (?, ?, NULL, NULL, NULL, NULL, ?, ?, ?, ?, NULL, ?, 'PUBLISHED', 'LAW', ?, ?, ?, ?)`,
      id,
      ownerId,
      slug,
      item.category,
      item.date || null,
      title,
      JSON.stringify(content),
      orderOf(item.category),
      wordCount,
      iso,
      iso,
    );
  }

  return {
    docs: files.length,
    words,
    marks,
    termPool: matcher?.size ?? 0,
    categories: [...perCategory.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([code, stats]) => ({ code, ...stats })),
    slugs,
  };
}

/** 分类内排序键：同一分类下按发布日排，列表由 SQL 的日期倒序决定，这里只留位 */
function orderOf(category: string): number {
  return Number(category) * 1000;
}

/* ── 命令行入口 ─────────────────────────────────────────── */

const invokedDirectly = /import-laws\.mts$/.test((process.argv[1] ?? '').replace(/\\/g, '/'));

if (invokedDirectly) {
  const args = process.argv.slice(2);
  const onlyIndex = args.indexOf('--only');
  const only = onlyIndex >= 0 ? (args[onlyIndex + 1] ?? null) : null;
  // --only 的值不是位置参数，先剔掉，剩下第一个才是源目录
  const positional = args.filter((a, idx) => !a.startsWith('--') && idx !== onlyIndex + 1);
  const dir = positional[0] ?? DEFAULT_DIR;
  const withTerms = !args.includes('--no-terms');

  if (!fs.existsSync(dir)) {
    console.error(`目录不存在：${dir}`);
    process.exit(1);
  }

  console.log(`库文件：${DB_PATH}`);
  console.log(`源目录：${dir}${only ? `（仅 ${only} 类）` : ''}`);
  console.log(`术语标注：${withTerms ? '开' : '关'}`);

  const started = Date.now();
  const db = new Db(DB_PATH);
  const result = importLaws(db, dir, { terms: withTerms, only });

  console.log(
    `\n导入完成：${result.docs} 篇，${result.words.toLocaleString('zh-CN')} 词，` +
      `标注术语 ${result.marks.toLocaleString('zh-CN')} 处（词池 ${result.termPool} 条），` +
      `耗时 ${((Date.now() - started) / 1000).toFixed(1)} 秒`,
  );
  for (const c of result.categories) {
    console.log(`  ${c.code}  ${String(c.docs).padStart(3, ' ')} 篇  ${String(c.words).padStart(8, ' ')} 词`);
  }
}
