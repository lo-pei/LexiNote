import { notFound } from 'next/navigation';
import type { DocumentWithMeta } from '@ln/types';
import { requirePageUser } from '@/lib/session';
import { getDocument } from '@/server/modules/documents';
import { listWordbooks } from '@/server/modules/vocabulary';
import { DocumentWorkspace } from '../../../docs/[id]/workspace';

export const dynamic = 'force-dynamic';

/**
 * 教材章节阅读页。
 *
 * 正文渲染与课件完全共用 /docs/[id] 的 DocumentWorkspace——术语、译文、生词、
 * 演示都是同一套。单独开这条路由只为两件事：地址栏能看出「这是教材的哪一讲」，
 * 以及左侧导航正确落在「教材」而不是「我的文档」。
 */
export default async function TextbookChapterPage({
  params,
}: {
  params: { id: string; chapterId: string };
}) {
  const user = await requirePageUser();

  let doc: DocumentWithMeta | null = null;
  try {
    doc = getDocument(params.chapterId, user);
  } catch {
    doc = null;
  }
  // 章节必须真的属于地址栏里这本书，否则一律当作不存在
  if (!doc || doc.kind !== 'TEXTBOOK' || doc.textbookId !== params.id) notFound();

  const wordbooks = listWordbooks(user);

  return <DocumentWorkspace doc={doc} user={user} wordbooks={wordbooks} />;
}
