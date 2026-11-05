import Link from 'next/link';
import type { LawCategoryDetail } from '@ln/types';

/**
 * 推荐阅读页上的法律专题骨架（服务端组件，只做展示）。
 *
 * 与专题页同一棵树的缩略版：根 → 七个部门法，不带叶子。
 * 点任意分支跳到专题页对应位置，展开后的篇目在那边看。
 */
export function LawTreeMini({
  categories,
  totalDocs,
  totalWords,
}: {
  categories: LawCategoryDetail[];
  totalDocs: number;
  totalWords: number;
}) {
  return (
    <div className="ltree-mini">
      <div className="ltree-mini__root">
        <span className="ltree__rootmark" aria-hidden="true">
          法
        </span>
        <span className="ltree-mini__roottext">
          <b>中国现行法律，英文官方译本</b>
          <span>
            {categories.length} 个部门法、{totalDocs} 篇、{totalWords.toLocaleString('zh-CN')} 词
          </span>
        </span>
      </div>

      <ul className="ltree-mini__cats">
        {categories.map((cat) => (
          <li className="ltree-mini__cat" key={cat.code}>
            <Link href={`/readings/laws#c-${cat.code}`}>
              <span className="ltree__idx" aria-hidden="true">
                {cat.code}
              </span>
              <span className="ltree-mini__zh">{cat.titleZh}</span>
              <span className="ltree-mini__en">{cat.title}</span>
              <span className="ltree-mini__meta">{cat.docCount} 篇</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
