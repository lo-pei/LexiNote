import type { LawCategoryDetail, LawEntry, LawLibrary, SessionUser } from '@ln/types';
import { getDb } from '../db';
import { notFound } from '../http';
import { LAW_CATEGORIES } from '../content/legal-library';
import { getDocument } from './documents';
import type { DocumentWithMeta } from '@ln/types';

/**
 * 英文法律专题。
 *
 * 与教材同构：正文存 documents（kind = 'LAW'），只读，借阅读工作台的术语、
 * 译文、生词能力。差别在归拢方式——教材按「书 → 讲」，法律按「部门法 → 单行法」，
 * 分类只有固定七类，故不建表，骨架直接读 content/legal-library.ts。
 *
 * 可见性：公开读物，凡登录用户可读，不看选课。
 */

interface LawRow {
  id: string;
  legal_slug: string;
  legal_category: string | null;
  legal_published_on: string | null;
  title: string;
  word_count: number;
}

export function listLawLibrary(): LawLibrary {
  const rows = getDb().all<LawRow>(
    `SELECT id, legal_slug, legal_category, legal_published_on, title, word_count
       FROM documents
      WHERE kind = 'LAW' AND deleted_at IS NULL AND legal_slug IS NOT NULL
      ORDER BY COALESCE(legal_published_on, '0000') DESC, title ASC`,
  );

  const grouped = new Map<string, LawEntry[]>();
  for (const row of rows) {
    const code = row.legal_category ?? '';
    const list = grouped.get(code) ?? [];
    list.push({
      id: row.id,
      slug: row.legal_slug,
      title: row.title,
      publishedOn: row.legal_published_on,
      words: row.word_count,
    });
    grouped.set(code, list);
  }

  const categories: LawCategoryDetail[] = LAW_CATEGORIES.map((meta) => {
    const entries = grouped.get(meta.code) ?? [];
    return {
      code: meta.code,
      title: meta.title,
      titleZh: meta.titleZh,
      note: meta.note,
      docCount: entries.length,
      wordCount: entries.reduce((sum, entry) => sum + entry.words, 0),
      entries,
    };
  });

  return {
    categories,
    totalDocs: rows.length,
    totalWords: rows.reduce((sum, row) => sum + row.word_count, 0),
  };
}

/** 按篇目标识取正文；slug 不命中一律当作不存在 */
export function getLawDocument(slug: string, user: SessionUser): DocumentWithMeta {
  const row = getDb().get<{ id: string }>(
    `SELECT id FROM documents WHERE legal_slug = ? AND kind = 'LAW' AND deleted_at IS NULL`,
    slug,
  );
  if (!row) throw notFound('这篇法律不存在或尚未收录。');
  return getDocument(row.id, user);
}
