import { notFound } from 'next/navigation';
import type { DocumentWithMeta } from '@ln/types';
import { requirePageUser } from '@/lib/session';
import { getDocument } from '@/server/modules/documents';
import { PresentView } from './present-view';

export const dynamic = 'force-dynamic';

export default async function PresentPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { p?: string };
}) {
  const user = await requirePageUser();

  let doc: DocumentWithMeta | null = null;
  try {
    doc = getDocument(params.id, user);
  } catch {
    doc = null;
  }
  if (!doc) notFound();

  const start = Math.max(0, (Number.parseInt(searchParams.p ?? '1', 10) || 1) - 1);

  return <PresentView id={doc.id} title={doc.title} content={doc.content} initial={start} />;
}
