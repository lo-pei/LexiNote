import Link from 'next/link';

/**
 * 右下角常驻入口：任何一页都能一步找到隐私政策与使用说明。
 * 不抢视觉，只在需要时被看见——所以做成一枚低对比度的小胶囊。
 */
export function LegalDock() {
  return (
    <div className="legal-dock">
      <Link href="/privacy">隐私政策</Link>
      <span className="legal-dock__sep" aria-hidden="true">
        ·
      </span>
      <Link href="/help">使用说明</Link>
    </div>
  );
}
