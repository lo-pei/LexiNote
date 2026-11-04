import Link from 'next/link';
import { requirePageUser } from '@/lib/session';
import { listPendingDrafts } from '@/server/modules/ai/translation';
import { listPendingTermSuggestions } from '@/server/modules/ai/terms';
import { TranslationReview } from '@/components/translation-review';
import { TermSuggestionReview } from '@/components/term-suggestion-review';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'AI 草稿待审 · LexiNote' };

/**
 * AI 草稿的人工闸门。
 *
 * 「AI 只产草稿、人审才入库」这条原则唯一落地的地方就在这里——
 * 学生看到的每一句 AI 译文、每一个 AI 释义，都必须先经过这个页面。
 */
export default async function PendingTranslationsPage() {
  const user = await requirePageUser();

  if (user.role === 'STUDENT') {
    return (
      <div className="wrap">
        <header className="head">
          <div>
            <h1 className="head__title">AI 草稿待审</h1>
          </div>
        </header>
        <div className="empty">当前账号没有查看权限。</div>
      </div>
    );
  }

  const translations = listPendingDrafts(80);
  const terms = listPendingTermSuggestions(40);

  return (
    <div className="wrap">
      <header className="head">
        <div>
          <h1 className="head__title">AI 草稿待审</h1>
          <p className="head__sub">
            学生触发的 AI 译文与术语释义。译文「通过」后转为正式译文；术语「采纳」后进入公共词库。驳回的条目不再重复生成。
          </p>
        </div>
        <div className="head__actions">
          <Link className="ln-btn ln-btn--outline ln-btn--sm" href="/admin">
            返回维护者说明
          </Link>
        </div>
      </header>

      <section className="section">
        <div className="section__head">
          <h2 className="section__title">待审译文</h2>
          <span className="section__hint">{translations.length} 条</span>
        </div>
        <TranslationReview items={translations} />
      </section>

      <section className="section">
        <div className="section__head">
          <h2 className="section__title">待审术语释义</h2>
          <span className="section__hint">{terms.length} 条</span>
        </div>
        <TermSuggestionReview items={terms} />
      </section>
    </div>
  );
}
