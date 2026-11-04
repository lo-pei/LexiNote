import type { TiptapDoc, TiptapNode } from '@ln/types';

/* ── 句子切分（精读模式的锚点单位） ─────────────────────────── */

const ABBREVIATIONS = new Set([
  'v', 'vs', 'co', 'ltd', 'inc', 'mr', 'mrs', 'ms', 'dr', 'prof', 'st', 'jr', 'sr',
  'e.g', 'i.e', 'cf', 'ibid', 'u.s', 'u.k', 'a.c', 'q.b', 'all e.r', 's.c.r', 'f.2d', 'f.3d', 'u.s.c', 'c.f.r',
]);

/** 只有后接编号时才是缩写；否则视为句末（"The answer is no." 不应被吞掉） */
const NUMERIC_ABBREVIATIONS = new Set(['no', 'p', 'pp', 'sec', 'art', 'para', 'vol', 'ch', 'ed', 'eds']);

export interface Sentence {
  text: string;
  start: number;
  end: number;
}

/**
 * 面向法律英语的句子切分：在 [.!?] 之后切，除非命中缩写表、
 * 或后一个字符不是句首形态。返回的 start/end 是相对整段的字符偏移。
 */
export function splitSentences(input: string): Sentence[] {
  const text = input.replace(/\s+/g, ' ').trim();
  if (!text) return [];

  const out: Sentence[] = [];
  let cursor = 0;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch !== '.' && ch !== '!' && ch !== '?') continue;

    let j = i + 1;
    while (j < text.length && (text[j] === '"' || text[j] === "'" || text[j] === ')')) j += 1;
    if (j >= text.length) break;
    if (text[j] !== ' ') continue;

    const before = text.slice(cursor, i);
    const lastToken = (before.match(/([A-Za-z][A-Za-z.]*)$/)?.[1] ?? '').toLowerCase().replace(/\.$/, '');
    const nextChar = text.slice(j + 1).match(/^\s*(\S)/)?.[1] ?? '';
    if (!nextChar) break;

    const isNumericAbbrev = NUMERIC_ABBREVIATIONS.has(lastToken);
    if (isNumericAbbrev && !/\d/.test(nextChar)) {
      // 「no.」后面不是数字 —— 按句末处理，继续向下
    } else if (isNumericAbbrev || ABBREVIATIONS.has(lastToken)) {
      continue;
    }

    if (!/[A-Z0-9"'(\u4e00-\u9fa5]/.test(nextChar)) continue;

    const sentence = text.slice(cursor, i + 1).trim();
    if (sentence) out.push({ text: sentence, start: cursor, end: i + 1 });
    cursor = j + 1;
    i = j;
  }

  const tail = text.slice(cursor).trim();
  if (tail) out.push({ text: tail, start: cursor, end: text.length });

  return out.length ? out : [{ text, start: 0, end: text.length }];
}

/* ── 计数 ─────────────────────────────────────────────────── */

export function countWords(text: string): number {
  const latin = text.match(/[A-Za-z][A-Za-z'’-]*/g)?.length ?? 0;
  const cjk = text.match(/[\u4e00-\u9fa5]/g)?.length ?? 0;
  return latin + cjk;
}

export function docToPlainText(doc: TiptapDoc | null | undefined): string {
  if (!doc) return '';
  const walk = (node: TiptapNode): string => {
    if (node.type === 'text') return node.text ?? '';
    // 术语节点的可见文字在 content 里，node.text 通常为空；
    // 只取 node.text 会让正文中的每个术语词整段消失（字数少算、导出缺词）。
    if (node.type === 'legalTerm') {
      return node.text ?? (node.content ?? []).map((child) => child.text ?? '').join('');
    }
    const inner = (node.content ?? []).map(walk).join(node.type === 'paragraph' || node.type === 'heading' ? '' : '');
    return node.type === 'paragraph' || node.type === 'heading' ? `${inner}\n` : inner;
  };
  return (doc.content ?? []).map(walk).join('');
}

/** 检索正文里，正文与「术语释义区」的分隔符 */
export const SEARCH_BODY_SEP = '\u0003';

/**
 * 检索用正文：在 docToPlainText 基础上补齐术语节点的中文释义。
 *
 * 术语在正文里显示为 "consideration"，中文释义存在 attrs.definition。
 * 不纳入索引的话，学生搜「对价」找不到标注过对价的段落——而这正是最该命中的地方
 * （实测某份课件 content 里有「对价」，纯文本里一次都搜不到）。
 *
 * 释义统一追加在 SEARCH_BODY_SEP 之后：片段生成时只从分隔符之前取窗口，
 * 结果里才不会显示成一串术语表。
 */
export function searchTextOf(doc: TiptapDoc | null | undefined): string {
  const plain = docToPlainText(doc);
  if (!doc) return plain;

  const pairs: string[] = [];
  const seen = new Set<string>();
  const walk = (node: TiptapNode): void => {
    if (node.type === 'legalTerm') {
      const attrs = node.attrs ?? {};
      const word = (node.content ?? []).map((child) => child.text ?? '').join('') || (node.text ?? '');
      const definition = typeof attrs.definition === 'string' ? attrs.definition : '';
      const key = `${word}|${definition}`;
      if ((word || definition) && !seen.has(key)) {
        seen.add(key);
        // 部分法条导入记录里 word 自带外层括号（注释段落被误标成术语），
        // 拼完会出现「精髓。））」这种连续右括号。只规整索引文本，不动原文。
        const unit = (definition ? `${word}（${definition}）` : word).replace(/）{2,}/g, '）');
        pairs.push(unit);
      }
    }
    (node.content ?? []).forEach(walk);
  };
  walk(doc);

  if (!pairs.length) return plain;
  return `${plain}\n${SEARCH_BODY_SEP}\n${pairs.join(' ')}`;
}

/* ── 日期 ─────────────────────────────────────────────────── */

const DATE_FMT = new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
const DATETIME_FMT = new Intl.DateTimeFormat('zh-CN', {
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return DATE_FMT.format(d).replace(/\//g, '.');
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return DATETIME_FMT.format(d).replace(/\//g, '.');
}

export function formatRelative(iso: string | null | undefined): string {
  if (!iso) return '—';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '—';
  const diff = Date.now() - then;
  const min = Math.round(diff / 60000);
  if (min < 1) return '刚刚';
  if (min < 60) return `${min} 分钟前`;
  const hour = Math.round(min / 60);
  if (hour < 24) return `${hour} 小时前`;
  const day = Math.round(hour / 24);
  if (day < 7) return `${day} 天前`;
  return formatDate(iso);
}

/* ── 掌握度 ───────────────────────────────────────────────── */

export const MASTERY_LABELS = ['生词', '眼熟', '能译', '会用'] as const;

export function masteryLabel(level: number): string {
  return MASTERY_LABELS[Math.max(0, Math.min(3, Math.round(level)))] ?? '生词';
}

/* ── 轻量 diff（快照对比，说明书 §5.10 备选方案） ──────────── */

export type DiffOp = 'equal' | 'insert' | 'delete';

export interface DiffChunk {
  op: DiffOp;
  text: string;
}

/** 以词为单位做最长公共子序列 diff；段落级调用，输入规模可控 */
export function wordDiff(before: string, after: string): DiffChunk[] {
  const a = before.split(/(\s+)/).filter(Boolean);
  const b = after.split(/(\s+)/).filter(Boolean);
  const n = a.length;
  const m = b.length;

  if (n * m > 250_000) {
    return [
      { op: 'delete', text: before },
      { op: 'insert', text: after },
    ];
  }

  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      dp[i]![j] = a[i] === b[j] ? dp[i + 1]![j + 1]! + 1 : Math.max(dp[i + 1]![j]!, dp[i]![j + 1]!);
    }
  }

  const chunks: DiffChunk[] = [];
  const push = (op: DiffOp, text: string) => {
    const last = chunks[chunks.length - 1];
    if (last && last.op === op) last.text += text;
    else chunks.push({ op, text });
  };

  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      push('equal', a[i]!);
      i += 1;
      j += 1;
    } else if (dp[i + 1]![j]! >= dp[i]![j + 1]!) {
      push('delete', a[i]!);
      i += 1;
    } else {
      push('insert', b[j]!);
      j += 1;
    }
  }
  while (i < n) {
    push('delete', a[i]!);
    i += 1;
  }
  while (j < m) {
    push('insert', b[j]!);
    j += 1;
  }
  return chunks;
}

export function diffStats(chunks: DiffChunk[]): { added: number; removed: number } {
  let added = 0;
  let removed = 0;
  for (const c of chunks) {
    if (c.op === 'insert') added += countWords(c.text);
    if (c.op === 'delete') removed += countWords(c.text);
  }
  return { added, removed };
}

/* ── 初始化缩写 ───────────────────────────────────────────── */

export function initialsOf(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '?';
  const cjk = trimmed.match(/[\u4e00-\u9fa5]/g);
  if (cjk && cjk.length) return cjk.slice(-2).join('');
  return trimmed
    .split(/\s+/)
    .map((p) => p[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();
}
