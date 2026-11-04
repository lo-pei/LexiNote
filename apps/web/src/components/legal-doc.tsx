import type { ReactNode } from 'react';

export interface LegalSection {
  /** 与目录锚点、正文标题 id 一致 */
  id: string;
  /** 汉字序号标题，如「一、总则」 */
  title: string;
  body: ReactNode;
}

/**
 * 隐私政策 / 使用条款的共用版式。
 * 只负责排版，不写内容——两页的内容各自放在 page.tsx 里，
 * 目录由同一份 sections 派生，标题改了目录不会漏。
 */
export function LegalDoc({
  kicker,
  title,
  meta,
  summary,
  sections,
  end,
  titleAs: TitleTag = 'h1',
}: {
  kicker: string;
  title: string;
  meta: string;
  summary: ReactNode;
  sections: LegalSection[];
  end?: ReactNode;
  /** 嵌在帮助页里时页面已有 h1，这里降一级，避免一页两个一级标题 */
  titleAs?: 'h1' | 'h2';
}) {
  return (
    <article className="legal">
      <p className="legal__kicker">{kicker}</p>
      <TitleTag className="legal__title">{title}</TitleTag>
      <p className="legal__meta">{meta}</p>

      <div className="legal__summary">{summary}</div>

      {sections.map((section) => (
        <section key={section.id} id={section.id} className="legal__section">
          <h2>{section.title}</h2>
          {section.body}
        </section>
      ))}

      {end ? <p className="legal__end">{end}</p> : null}
    </article>
  );
}
