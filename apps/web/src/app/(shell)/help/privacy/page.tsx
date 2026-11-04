import type { Metadata } from 'next';
import { requirePageUser } from '@/lib/session';
import { HelpSide } from '@/components/help-nav';
import { PRIVACY_TOC, PrivacyDocument } from '@/server/content/legal/privacy';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: '隐私政策 · LexiNote' };

export default async function HelpPrivacyPage() {
  await requirePageUser();

  return (
    <div className="wrap wrap--doc">
      <div className="doc-layout">
        <HelpSide active="privacy" items={PRIVACY_TOC} label="条款目录" />
        <div className="doc-main">
          <header className="head">
            <div>
              <h1 className="head__title">隐私政策</h1>
              <p className="head__sub">
                本平台由任课教师自行部署，与学校统一身份认证、教务系统没有打通。这份政策说明哪些信息被收集、用来做什么、
                存多久，以及你有哪些权利。
              </p>
            </div>
          </header>

          <div className="help-doc">
            <PrivacyDocument titleAs="h2" />
          </div>
        </div>
      </div>
    </div>
  );
}
