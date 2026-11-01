/**
 * 文本归一化 —— 说明书 §4.3。
 * 顺序固定：trim → 连续空白压成单空格 → 统一引号 → 统一破折号 → 转小写。
 * 任何改动都会让既有模板的 sourceHash 失效，因此放置在此单一位置。
 */

export function normalizeSource(input: string): string {
  let s = input.trim();
  s = s.replace(/\s+/g, ' ');
  s = s.replace(/[\u2018\u2019\u02BC]/g, "'");
  s = s.replace(/[\u201C\u201D\u00AB\u00BB]/g, '"');
  s = s.replace(/[\u2010-\u2015\u2212]/g, '\u2014');
  s = s.replace(/\u2026/g, '...');
  return s.toLowerCase();
}

/** 浏览器与 Node 20+ 共用（globalThis.crypto.subtle） */
export async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function hashSource(input: string): Promise<string> {
  return sha256Hex(normalizeSource(input));
}

/** 展示用：把归一化文本还原成可读的一行（保留原始大小写由调用方负责） */
export function collapseWhitespace(input: string): string {
  return input.replace(/\s+/g, ' ').trim();
}
