import { notFound } from 'next/navigation';
import type { DocumentWithMeta } from '@ln/types';
import { requirePageUser } from '@/lib/session';
import { getLawDocument } from '@/server/modules/laws';
import { listWordbooks } from '@/server/modules/vocabulary';
import { DocumentWorkspace } from '../../../docs/[id]/workspace';

export const dynamic = 'force-dynamic';

/**
 * 英文法律阅读页。
 *
 * 与教材章节同构：正文渲染直接复用 /docs/[id] 的 DocumentWorkspace，
 * 术语、译文、生词、演示都是同一套。单独一条路由只为地址栏能看出
 * 「这是专题里的哪一部法」，以及左侧导航落回专题目录。
 */
export default async function LawDocumentPage({ params }: { params: { slug: string } }) {
  const user = await requirePageUser();

  let doc: DocumentWithMeta | null = null;
  try {
    doc = getLawDocument(decodeURIComponent(params.slug), user);
  } catch {
    doc = null;
  }
  if (!doc || doc.kind !== 'LAW') notFound();

  const wordbooks = listWordbooks(user);

  return <DocumentWorkspace doc={doc} user={user} wordbooks={wordbooks} />;
}
