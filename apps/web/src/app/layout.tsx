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
  themeColor: '#e6e7e2',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
