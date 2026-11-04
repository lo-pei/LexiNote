import type { Metadata } from 'next';
import { requirePageUser } from '@/lib/session';
import { HelpSide } from '@/components/help-nav';
import { TERMS_TOC, TermsDocument } from '@/server/content/legal/terms';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: '使用条款 · LexiNote' };

export default async function HelpTermsPage() {
  await requirePageUser();

  return (
    <div className="wrap wrap--doc">
      <div className="doc-layout">
        <HelpSide active="terms" items={TERMS_TOC} label="条款目录" />
        <div className="doc-main">
          <header className="head">
            <div>
              <h1 className="head__title">使用条款</h1>
              <p className="head__sub">
                注册、登录或使用本平台，即视为接受本条款。条款约定的是平台能提供什么、不能提供什么，以及使用时应当守住的边界。
              </p>
            </div>
          </header>

          <div className="help-doc">
            <TermsDocument titleAs="h2" />
          </div>
        </div>
      </div>
    </div>
  );
}
