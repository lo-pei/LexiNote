import type { Metadata } from 'next';
import { DocToc } from '@/components/doc-toc';
import { PRIVACY_TOC, PrivacyDocument } from '@/server/content/legal/privacy';

export const metadata: Metadata = { title: '隐私政策 · LexiNote' };

/** 免登录可读：注册之前就能看清数据怎么处理。正文与站内「帮助」共用同一份。 */
export default function PrivacyPage() {
  return (
    <>
      <DocToc items={PRIVACY_TOC} />
      <PrivacyDocument />
    </>
  );
}
