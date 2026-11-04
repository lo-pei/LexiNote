import type { Metadata } from 'next';
import { DocToc } from '@/components/doc-toc';
import { TERMS_TOC, TermsDocument } from '@/server/content/legal/terms';

export const metadata: Metadata = { title: '使用条款 · LexiNote' };

/** 免登录可读：与站内「帮助」共用同一份正文。 */
export default function TermsPage() {
  return (
    <>
      <DocToc items={TERMS_TOC} />
      <TermsDocument />
    </>
  );
}
