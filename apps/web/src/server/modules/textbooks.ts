import type { SessionUser, Textbook, TextbookChapter, TextbookDetail } from '@ln/types';
import { getDb } from '../db';
import { notFound } from '../http';

/**
 * 教材模块。
 *
 * 教材与课件是两种东西：课件是教师每学期自己写的，可编辑、可发布、可纳入笔记；
 * 教材是已出版的读物，正文只读，按「书 → 章」归拢，供课上对照与课后精读。
 * 因此章节正文复用 documents 表（kind = 'TEXTBOOK'），借阅读工作台的术语、
 * 译文、生词与演示能力，但不对任何人开放编辑。
 *
 * 可见性：教材是课程公共资源，凡登录用户均可读，不按选课情况裁剪。
 * 若将来要按班级隔离，改 canReadTextbook 一处即可。
 */

interface TextbookRow {
  id: string;
  title: string;
  subtitle: string | null;
  author: string;
  publisher: string;
  edition: string | null;
  year: string | null;
  isbn: string | null;
  description: string | null;
  chapter_count: number;
  word_count: number;
  created_at: string;
  updated_at: string;
}

interface ChapterRow {
  id: string;
  chapter_no: number | null;
  title: string;
  subtitle: string | null;
  word_count: number;
}

/** 教材是公开读物；保留此钩子便于将来按班级或课程裁剪 */
export function canReadTextbook(_user: SessionUser, _textbookId: string): boolean {
  return true;
}

function toTextbook(row: TextbookRow): Textbook {
  return {
    id: row.id,
    title: row.title,
    subtitle: row.subtitle,
    author: row.author,
    publisher: row.publisher,
    edition: row.edition,
    year: row.year,
    isbn: row.isbn,
    description: row.description,
    chapterCount: row.chapter_count,
    wordCount: row.word_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const SELECT_BOOK = `
  SELECT t.*,
         (SELECT COUNT(*) FROM documents d
           WHERE d.textbook_id = t.id AND d.deleted_at IS NULL AND d.kind = 'TEXTBOOK') AS chapter_count,
         (SELECT COALESCE(SUM(d.word_count), 0) FROM documents d
           WHERE d.textbook_id = t.id AND d.deleted_at IS NULL AND d.kind = 'TEXTBOOK') AS word_count
    FROM textbooks t`;

export function listTextbooks(): Textbook[] {
  const rows = getDb().all<TextbookRow>(`${SELECT_BOOK} ORDER BY t.sort_order ASC, t.created_at ASC`);
  return rows.map(toTextbook);
}

export function getTextbook(id: string, user: SessionUser): TextbookDetail {
  if (!canReadTextbook(user, id)) throw notFound('教材不存在。');

  const db = getDb();
  const row = db.get<TextbookRow>(`${SELECT_BOOK} WHERE t.id = ?`, id);
  if (!row) throw notFound('教材不存在或已下架。');

  const chapters = db
    .all<ChapterRow>(
      `SELECT id, chapter_no, title, subtitle, word_count
         FROM documents
        WHERE textbook_id = ? AND kind = 'TEXTBOOK' AND deleted_at IS NULL
        ORDER BY COALESCE(chapter_no, 9999) ASC, sort_order ASC`,
      id,
    )
    .map<TextbookChapter>((c) => ({
      id: c.id,
      chapterNo: c.chapter_no ?? 0,
      title: c.title,
      subtitle: c.subtitle,
      words: c.word_count,
    }));

  return { ...toTextbook(row), chapters };
}

/** 章节所属书目，供阅读页显示「《书名》· 第 N 讲」的出处条 */
export function textbookOfChapter(
  chapterId: string,
): { textbookId: string; title: string; chapterNo: number | null } | null {
  const row = getDb().get<{ textbook_id: string | null; chapter_no: number | null; title: string }>(
    `SELECT d.textbook_id, d.chapter_no, t.title
       FROM documents d JOIN textbooks t ON t.id = d.textbook_id
      WHERE d.id = ? AND d.kind = 'TEXTBOOK' AND d.deleted_at IS NULL`,
    chapterId,
  );
  if (!row || !row.textbook_id) return null;
  return { textbookId: row.textbook_id, title: row.title, chapterNo: row.chapter_no };
}
