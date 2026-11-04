import type { Metadata, Viewport } from 'next';
import './globals.css';
import '@ln/editor/styles.css';

export const metadata: Metadata = {
  title: 'LexiNote · 法律英语精读',
  description: '面向法学院课程的法律英语交互式阅读与写作平台：逐句精读、术语标注、译文对照、生词本与学情分析。',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#dedfd8' },
    { media: '(prefers-color-scheme: dark)', color: '#14150f' },
  ],
};

/**
 * 在首帧之前定好主题。
 * 放到 React 水合之后再做，夜里打开会先闪一屏白纸；这段脚本同步执行，
 * 直接把 data-theme 写在 <html> 上，CSS 变量随即生效。
 */
const THEME_BOOT = `(function(){try{
  var m = localStorage.getItem('ln:theme') || 'system';
  var dark = m === 'dark' || (m === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  var r = document.documentElement;
  r.dataset.theme = dark ? 'dark' : 'light';
  r.dataset.mode = m;
  r.style.colorScheme = dark ? 'dark' : 'light';
}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
        {children}
      </body>
    </html>
  );
}
