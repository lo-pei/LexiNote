import Link from 'next/link';
import { BackToTop } from '@/components/back-to-top';
import { ThemeToggle } from '@/components/theme-toggle';

/**
 * 公开页外壳：隐私政策与使用条款不要求登录。
 * 注册之前先看清数据怎么处理、用的时候有哪些边界。
 *
 * 顶栏吸顶（滚动时不动），正文区左侧留出目录栏的位置——
 * 目录本身由各页的 <DocToc /> 渲染，这样目录项与正文标题不会各写一份。
 */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="docpage">
      <header className="docpage__top">
        <Link href="/login" className="docpage__brand">
          <span className="docpage__mark" aria-hidden="true">
            L
          </span>
          <span>
            <span className="docpage__name">LexiNote</span>
            <span className="docpage__sub">法律英语精读</span>
          </span>
        </Link>
        <nav className="docpage__nav" aria-label="公开页面导航">
          <Link href="/privacy">隐私政策</Link>
          <Link href="/terms">使用条款</Link>
          <ThemeToggle compact />
          <Link href="/login" className="docpage__back">
            返回登录
          </Link>
        </nav>
      </header>

      <div className="docpage__body">{children}</div>

      <footer className="docpage__foot">
        <span>LexiNote · 课程自建部署，与学校统一身份认证、教务系统未打通。</span>
        <span className="docpage__foot-links">
          <Link href="/privacy">隐私政策</Link>
          <Link href="/terms">使用条款</Link>
        </span>
      </footer>

      <BackToTop />
    </div>
  );
}
