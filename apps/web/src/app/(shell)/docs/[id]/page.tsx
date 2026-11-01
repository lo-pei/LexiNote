import { notFound } from 'next/navigation';
import type { DocumentWithMeta } from '@ln/types';
import { requirePageUser } from '@/lib/session';
import { getDocument } from '@/server/modules/documents';
import { listWordbooks } from '@/server/modules/vocabulary';
import { DocumentWorkspace } from './workspace';

export const dynamic = 'force-dynamic';

export default async function DocumentPage({ params }: { params: { id: string } }) {
  const user = await requirePageUser();

  let doc: DocumentWithMeta | null = null;
  try {
    doc = getDocument(params.id, user);
  } catch {
    doc = null;
  }
  if (!doc) notFound();

  const wordbooks = listWordbooks(user);

  return <DocumentWorkspace doc={doc} user={user} wordbooks={wordbooks} />;
}
