<div align="center">

# LexiCase · 律案

**法律英语交互式学习平台 · 教师发布课件，学生纳入笔记，术语点击即查，精读与单词本闭环。**

[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![Tiptap](https://img.shields.io/badge/Tiptap-2-0D1B2A?style=for-the-badge)](https://tiptap.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)](./LICENSE)

`法律英语` · `交互式课件` · `师生协同` · `术语标注` · `全屏演示` · `句子精读` · `单词本` · `来源追溯` · `作业批注` · `学情分析`

[快速开始](#快速开始) · [功能](#核心能力) · [技术栈](#技术栈) · [目录结构](#目录结构) · [Skill 规范](./docs/SKILL.md)

</div>

---

## 为什么做 LexiCase

法律英语课堂长期存在一个断层：课件是静态的 PPT，笔记是纸质的，术语查词和单词本各在另一个 App 里。教师看不到学生在哪一句上卡住，学生也追溯不到一个词最初出现在哪份课件的哪句话里。LexiCase 把**课件、精读、单词本、问答、批注**放进同一个 Tiptap 文档内核中，让“学”和“教”的数据第一次连在一起。

> 不是另一个 LMS，而是围绕**一份可交互的法律英语文档**展开的教学工作台。

---

## 核心能力

| 能力 | 说明 |
|---|---|
| **术语标注** | 选中法律术语/拉丁短语，填写音标与释义；学生端点击虚线词弹出，数据后台预置，不做实时查询。 |
| **全屏演示** | 类 PPT 翻页，但划线词、侧栏、精读浮层在演示中**仍然可点击**。 |
| **TOC 侧边栏** | 文档内标题树，点击跳转，滚动自动高亮，Typora 式体验。 |
| **侧栏扩展** | 扩展知识/相关文章挂在文档旁，**必读/选读**仅教师可标记。 |
| **预置翻译** | 句子级哈希匹配预置译文，**不调用任何外部翻译 API**，未命中显示“暂无预置译文”。 |
| **单词本** | 多词表、来源追溯（哪份课件/哪句话）、例句、掌握度，支持 Excel/Word/PDF 导出。 |
| **问答与批注** | 教师发布作业，学生回答，教师标记参考答案、评分、**不覆盖原文的批注层**。 |
| **学情与 Diff** | 学生笔记快照对比，教师看到“改了什么”；仪表盘读聚合事件，不扫原始表。 |

---

## 技术栈

**前端** Next.js 14（App Router）· React 19 · TypeScript strict · Tailwind CSS · shadcn/ui · React Flow

**编辑器** Tiptap 2（ProseMirror）· 自定义 `legalTerm` / `flowchart` 节点 · 编辑/只读/演示/diff **共用一套渲染管线**

**后端** Fastify · Prisma · PostgreSQL 15（JSONB 存文档）· JWT + RBAC

**导出** ExcelJS（xlsx）· `docx` · pdfmake

**工程** pnpm monorepo · Husky + lint-staged · Vitest · Playwright

---

## 快速开始

```bash
# 1. 克隆
git clone https://github.com/your-org/lexicase.git
cd lexicase

# 2. 安装
pnpm install

# 3. 环境变量
cp .env.example .env
# 填入 DATABASE_URL、JWT_SECRET

# 4. 数据库
pnpm prisma migrate dev
pnpm prisma db seed

# 5. 启动
pnpm dev
