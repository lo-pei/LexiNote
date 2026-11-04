# LexiNote AI 功能实施方案

版本 v1（待审）｜ 2026-11-04 ｜ 适用 LexiNote 1.0.0 / Next.js 14.2.33 / node:sqlite

---

## 0. 摘要

| 项目 | 决定 |
| :--- | :--- |
| 实施范围 | ① 译文 AI 草稿 + 人审　② 术语语境释义　③ 生词智能复习　⑤ 学情诊断摘要 |
| 模型接入 | 国产 OpenAI 兼容接口（DeepSeek / 通义 / 智谱均可，只换 base_url） |
| 实施顺序 | P0 地基 → P1 译文 → P3 术语 → P2 学情 → P4 复习 |
| 总改动量 | 新增 4 张表 + 1 张表加 5 列、8 个接口、1 个新页面、3 处浮层/面板改造 |

排序理由：P3（术语）与 P1（译文）同构，都是「未命中兜底 + 人审入库」，可以复用同一套审核界面；
P2（学情）只读聚合数据、不外发身份信息，风险最低；
P4（复习）要新增页面与排期引擎，工作量最大但价值最高，放最后集中做。

---

## 0.1 实施状态（2026-11-04 已完成）

四项全部落地并通过验证。

| 阶段 | 交付 | 验证 |
| :--- | :--- | :--- |
| P0 地基 | `ai/provider.ts`（配置 / 超时 / 并发 / JSON 容错 / 用量日志）、`ai_task_log` 表、`GET /api/ai/status`、`.env.example`、隐私政策 4.4 条 | 不配模型时既有 74 条用例全绿 |
| P1 译文草稿 | `translation_templates` 加 5 列、`draft` / `pending` / `review` 三个接口、浮层草稿态、`/admin/translations` | 草稿入库 → 审校转正 → 学生侧状态同步，端到端通过 |
| P3 术语释义 | `ai_term_suggestions` 表、`suggest` / `pending` / `review`、术语浮层入口 | 采纳后迁入 `vocabulary_entries` 并回填 `entry_id` |
| P2 学情诊断 | `ai_digests` 表、`digest` 接口、课程页「教学诊断」卡片 | 只喂聚合数字；学生访问 403 |
| P4 每日复习 | `review_schedules` / `review_questions` 表、SM-2 排期、`/review` 页、侧栏入口 | 无模型时仍可用规则挖空出题 |

**与方案的三处偏差**（都是有意的，理由如下）

1. **`draft` 收原句而非哈希。** 方案里写的是 `{sourceHash, sourceText}`，实现改成只收 `text`、
   由服务端算哈希。原因与 `match` 接口一致：两端各自归一化迟早会因空格、全半角差异静默 miss。
2. **P4 的题干不用模型，改用规则挖空。** 方案原本写「模型出题干」，实际 20 个词逐个生成
   会把首屏拖到十几秒，而挖空这件事本身不需要模型。现在模型只在学生点「给点提示」时出场。
   附带的好处是复习功能在没配模型时**完整可用**——它是四项里唯一这样的。
3. **译文与术语的审核合并在同一页。** 两者交互同构，拆成两页只是多一次跳转。

**实施中发现并修复的三个缺陷**

| # | 问题 | 修法 |
| :--: | :--- | :--- |
| 1 | 学情诊断的权限校验绑在 `overview()` 的副作用上，而缓存命中与「未配置模型」两条路径都会提前返回，**任意登录学生可读到别人班的诊断** | 新增 `assertCourseAccess()`，在函数第一行显式校验，不再依赖副作用 |
| 2 | 复习队列每次访问都补固定 40 条，学生反复刷新会把 4,661 条生词一次性压进队列 | 改为只补到队列长度（20）的缺口，缺口为 0 就不补 |
| 3 | `node:sqlite` 返回的行是 null-prototype 对象，直接传给客户端组件触发 `Only plain objects can be passed`，待审页在有数据时白屏 | 两处 `list*` 函数 `map(row => ({...row}))` 转成普通对象 |

**验证方式**：起了一个本地模拟模型服务（OpenAI 兼容，按 prompt 分流返回固定 JSON），
在没有任何真实 key 的情况下把链路端到端跑通——包括「首次生成 `cached:false`、
第二次 `cached:true`」这类容易写错的细节。随后关闭模拟服务，确认降级路径与接入前一致。

---

## 1. 三条不可破的原则

**原则一：AI 只产草稿，人审才入库。**
法律术语误译在教学场景是硬伤，不是体验瑕疵。所以 AI 产出永远带 `AI_DRAFT` 标记，
前端显示虚线框 + 「AI 草稿 · 未审校」徽标，与人工译文**在视觉上必须能区分**。
教师审过才转 `APPROVED`。这条不做成配置项，不给开关。

**原则二：未配置 AI 时零副作用。**
不填 `AI_API_KEY` 时，`getProvider()` 返回 `null`，所有调用点第一行走 `if (!ai) return fallback`。
全站行为与今天**完全一致**——不报错、不隐藏已有功能、不多一次网络请求。
这是硬验收指标，会写进自动化测试。

**原则三：外发内容只有课文句子与词语。**
绝不发学生姓名、学号、班级名、邮箱、用户 id。
请求日志只记字符数与哈希前缀，不落原文。这一条写进隐私政策页。

---

## 2. 共用地基（P0）

### 2.1 配置

```bash
# .env.local —— 全部可选，不配即关闭
AI_ENABLED=1
AI_BASE_URL=https://api.deepseek.com/v1
AI_API_KEY=sk-...
AI_MODEL=deepseek-chat
AI_TIMEOUT_MS=15000      # 默认 15s
AI_MAX_CONCURRENCY=2     # 单进程同时最多 2 个在飞请求
```

### 2.2 provider 抽象

新文件 `apps/web/src/server/modules/ai/provider.ts`：

```ts
export interface ChatMessage { role: 'system' | 'user' | 'assistant'; content: string }

export interface AiProvider {
  name: string;   // 落库进 ai_* 表的 model 字段
  complete(msgs: ChatMessage[], opts?: {
    maxTokens?: number;
    temperature?: number;
    json?: boolean;          // 要求返回 JSON
    signal?: AbortSignal;
  }): Promise<string>;
}

/** 未配置时返回 null —— 所有调用方必须处理 null */
export function getProvider(): AiProvider | null;
```

- 只依赖全局 `fetch`，**不引入 openai SDK**。避免为一个 REST 调用拖进一个依赖树，
  也保住「零原生编译」的选型。
- `json: true` 时优先带 `response_format: { type: 'json_object' }`；
  供应商不支持则忽略该字段（不能因为一个可选参数让整个请求 400）。

### 2.3 超时、并发、降级

- **超时**：每次调用套 `AbortController` + `setTimeout(AI_TIMEOUT_MS)`，超时主动 abort。
- **并发**：进程内信号量，等待队列上限 8，超出直接返回降级（宁可让用户重试，不排长队）。
  单进程 + SQLite 的架构下，一次请求拖慢的是所有人的页面，必须限流。
- **降级**：任何异常（网络、超时、429、JSON 解析失败）统一 `console.warn` + 返回 `null`，
  由调用方回落到现有文案（译文回「暂无预置译文」，术语回「词库未收录」）。
  **AI 不可用不能让功能变成报错。**

### 2.4 JSON 容错

模型返回经常带 ```` ```json ```` 围栏或前后废话。统一在 provider 层做：
剥围栏 → 截取首个 `{` 到末个 `}` → `JSON.parse` → 失败则返回 `null`。
不让二十行解析代码散落在四个业务模块里。

### 2.5 用量日志（不含原文）

新表 `ai_task_log`，只记任务类型、模型、耗时、字符数、成败。用于看真实成本与失败率，
也是后续「要不要换更便宜的模型」的判断依据。

---

## 3. 数据层变更

### 3.1 `translation_templates` 加 5 列

```sql
ALTER TABLE translation_templates ADD COLUMN source      TEXT NOT NULL DEFAULT 'HUMAN';
ALTER TABLE translation_templates ADD COLUMN status      TEXT NOT NULL DEFAULT 'APPROVED';
ALTER TABLE translation_templates ADD COLUMN model       TEXT;
ALTER TABLE translation_templates ADD COLUMN reviewed_by TEXT REFERENCES users(id);
ALTER TABLE translation_templates ADD COLUMN reviewed_at TEXT;
```

- 已有 60 条全部落到 `source='HUMAN'` / `status='APPROVED'`，天然兼容，不用回填。
- **不加 CHECK 约束**。`ALTER TABLE ADD COLUMN` 带 CHECK 的行为不保证，且这个项目已经踩过
  `documents.kind` 加类型必须重建整表的坑。取值合法性在应用层校验。
- `created_by` 语义定为「发起人」——学生点开某句触发生成时记学生 id，`source='AI'` 已标明性质，
  **不引入假的系统账号**。这样「待审列表」还能看到是哪位同学先点出来的。

### 3.2 新表 4 张

```sql
-- 术语语境释义草稿（审过才迁入 vocabulary_entries）
CREATE TABLE IF NOT EXISTS ai_term_suggestions (
  id            TEXT PRIMARY KEY,
  term          TEXT NOT NULL,
  context_hash  TEXT NOT NULL,      -- 所在句的 SHA-256，同句同词只生成一次
  sentence      TEXT NOT NULL,
  phonetic      TEXT,
  definition_zh TEXT NOT NULL,
  example       TEXT,
  legal_domain  TEXT,
  status        TEXT NOT NULL DEFAULT 'AI_DRAFT',   -- AI_DRAFT / APPROVED / REJECTED
  entry_id      TEXT REFERENCES vocabulary_entries(id),  -- 审过迁入后回填
  model         TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (term, context_hash)
);

-- 生词复习排期（SM-2，纯规则）
CREATE TABLE IF NOT EXISTS review_schedules (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(id),
  item_id       TEXT NOT NULL REFERENCES wordbook_items(id),
  due_on        TEXT NOT NULL,                      -- YYYY-MM-DD，按天取队列
  interval_days INTEGER NOT NULL DEFAULT 1,
  ease          REAL    NOT NULL DEFAULT 2.5,
  reps          INTEGER NOT NULL DEFAULT 0,
  lapses        INTEGER NOT NULL DEFAULT 0,
  last_grade    INTEGER,
  updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_id, item_id)
);
CREATE INDEX IF NOT EXISTS idx_review_due ON review_schedules(user_id, due_on);

-- 复习题干缓存（AI 生成一次，全班共用）
CREATE TABLE IF NOT EXISTS review_questions (
  id         TEXT PRIMARY KEY,
  item_id    TEXT NOT NULL REFERENCES wordbook_items(id),
  kind       TEXT NOT NULL,     -- CLOZE / COLLOCATION / TRANSLATE
  payload    TEXT NOT NULL,     -- JSON: {stem, blanks[], options[], answer, hint}
  model      TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (item_id, kind)
);

-- 学情摘要缓存（一天一份，避免重复调模型）
CREATE TABLE IF NOT EXISTS ai_digests (
  id         TEXT PRIMARY KEY,
  course_id  TEXT NOT NULL REFERENCES courses(id),
  day        TEXT NOT NULL,
  body       TEXT NOT NULL,
  model      TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (course_id, day)
);
```

### 3.3 迁移方式

照 `apps/web/src/server/db.ts` 现有 `migrate()` 写法追加：`PRAGMA table_info` 判列是否存在，
再 `ALTER TABLE`。**不写进 `schema.sql` 的 documents 段**——那里加索引已经在历史上造成过整段 exec 失败。

---

## 4. 四项功能

### 4.1 译文 AI 草稿 + 人审（P1）

**现状**：`matchTranslation()` 纯哈希查表，未命中返回 `matched:false`，浮层显示「暂无预置译文」。
60 条模板对约 2.4 万句，覆盖约 0.2%。

**数据流**

```
学生选中句子 → 前端算 sourceHash → POST /api/translation/draft
  ├─ 表里已有（含 AI_DRAFT）→ 直接返回，cached:true，零成本
  ├─ 表里是 REJECTED         → 返回「本句译文待人工补充」，不再自动重试
  └─ 查无 → provider 生成 → 落库 status='AI_DRAFT' → 返回
```

**接口**

| 方法 | 路径 | 角色 | 说明 |
| :--- | :--- | :--- | :--- |
| POST | `/api/translation/draft` | 登录用户 | `{sourceHash, sourceText, courseId?}` → `{translation, status, cached}` |
| GET | `/api/translation/pending` | 教师 | 待审列表，按课件分组 |
| POST | `/api/translation/review` | 教师 | `{id, action:'approve'\|'reject', edited?}`；approve 时允许直接改译文 |

**前端**
- `components/overlays.tsx` 的译文浮层：`status==='AI_DRAFT'` 时虚线边框 + 「AI 草稿 · 未审校」徽标 +
  「这翻译不对」按钮（提交后该句转 REJECTED，教师端优先处理）。
- `/admin` 增加「待审译文」入口，列表可批量通过。

**关键取舍**：**点了才生成，不做后台预生成**。预生成 2.4 万句既费钱又可能全白费
（教师可能整篇重译）。按需生成 + 落库复用，实际调用量会收敛到「学生真正读到的句子」。

**验收**
- 无 key：浮层行为与今天完全一致。
- 有 key：新句 3 秒内返回草稿；同句第二次 `cached:true` 且耗时为 0。
- 学生调 `/api/translation/review` 必须 403。
- 教师 reject 后，同句再次点击不重复调用模型。

### 4.2 术语语境释义（P3）

**现状**：2,255 条静态词库（含 2,208 条法学词汇表），查表精确匹配，词形变化与短语查不到；
`consideration` 在合同法里是「对价」、一般语境是「考虑」，静态词库给不出语境义。

**做法**
- 术语浮层查库未命中时，显示「查词库（未收录）｜用 AI 看本句语境」两个按钮，
  **默认不自动调用**（省成本，也避免读到一半满屏 AI 内容）。
- 请求带 `term` + 所在完整句子，要求返回 JSON：`{phonetic, definition_zh, example, legal_domain}`。
- 结果落 `ai_term_suggestions`（`UNIQUE(term, context_hash)` 保证同句同词只生成一次）。
- 教师端审核通过后，插入 `vocabulary_entries`（`origin` 沿用现有取值 `GLOSSARY`，
  不碰 CHECK 约束），并回填 `entry_id`。

**音标风险**：LLM 生成 IPA 出错率不低。方案是**音标单独标注「AI 参考」**，
或审核时留空则不展示——宁可没有音标，不可给错音标。

### 4.3 学情诊断摘要（P2）

**现状**：`analytics_daily` 已有 5 个指标（笔记、术语点击、加词、回帖、译文命中），
但界面上只有数字，教师得自己读。

**做法**
- 输入只有**聚合数字**：班级、周次、各指标汇总、Top 课件。不带任何学生明细。
- 输出一段 150–250 字中文结论 + 3 条建议，落到 `ai_digests`（按 course + day 缓存）。
- 教师点「生成诊断」才调，不自动。

**为什么排第二**：合规风险最低（只发数字），实现最轻（一个 prompt + 一张卡片），
适合作为「人审流程」的低风险试点。也可以后续用 automation 每周一自动生成。

### 4.4 生词智能复习（P4）

**现状**：4,661 条生词，4,649 条 `mastery_level=0`（99.7%）。生词本只进不出。

**做法**
- **排期用 SM-2 纯规则**，不用模型决定「你会不会」。模型只负责出题干。
- 题干优先用 `wordbook_items.source_context`（学生加词时保存的原句）做挖空——
  这是 AI 最擅长的任务，且即使不联网也能用规则挖空兜底。
- 三种题型：`CLOZE`（原句挖空）、`COLLOCATION`（搭配选择）、`TRANSLATE`（中译英提示）。
- 新页 `/review`：每日队列，卡片式，四档评价（忘记 / 模糊 / 记得 / 很熟）→ 更新 SM-2 参数。
- 题干落 `review_questions`，**全班共用**——同一个词只生成一次，成本极低。

**验收**
- 无 key：仍可用「规则挖空」出题，复习功能不因缺模型而不可用（这是它比另外三项更独立的地方）。
- 排期正确性：连续答「记得」的间隔应为 1→6→(上次×ease) 天。

---

## 5. 实施顺序与阶段验收

| 阶段 | 内容 | 验收标准 |
| :--- | :--- | :--- |
| **P0** 地基 | provider / 配置 / 超时并发 / JSON 容错 / `ai_task_log` / `GET /api/ai/status` / 隐私政策补一段 | 不配 key 时全站 74 条既有用例仍全绿 |
| **P1** 译文 | 加 5 列 / draft + pending + review 三接口 / 浮层草稿态 / 教师待审页 | 新增 6 条用例；学生越权 403；二次命中零调用 |
| **P3** 术语 | `ai_term_suggestions` / suggest + review / 术语浮层入口 | 复用 P1 审核界面；同句同词不重复生成 |
| **P2** 学情 | `ai_digests` / digest 接口 / 课程页卡片 | 请求体不含任何学生 id（单测断言） |
| **P4** 复习 | 两张表 / SM-2 / 三接口 / `/review` 页 / 侧栏入口 | 无 key 时规则挖空可出题；间隔推进正确 |

每个阶段结束都跑一次 `node 提交包/scripts/api-test.mjs` 与 `compat-test.mjs`，
新用例并入既有分组（新增 I 组「AI 辅助」，编号接在 H 组后）。

---

## 6. 影响面清单

**新增**
```
apps/web/src/server/modules/ai/provider.ts        provider 抽象与容错
apps/web/src/server/modules/ai/prompts.ts         四处 prompt 集中管理
apps/web/src/server/modules/ai/translation.ts     译文草稿
apps/web/src/server/modules/ai/terms.ts           术语语境释义
apps/web/src/server/modules/ai/review.ts          出题
apps/web/src/server/modules/ai/digest.ts          学情摘要
apps/web/src/app/api/translation/{draft,pending,review}/route.ts
apps/web/src/app/api/terms/suggest/route.ts
apps/web/src/app/api/review/{queue,grade}/route.ts
apps/web/src/app/api/analytics/[courseId]/digest/route.ts
apps/web/src/app/api/ai/status/route.ts
apps/web/src/app/(shell)/review/page.tsx
apps/web/src/components/review-card.tsx
apps/web/src/components/ai-digest-card.tsx
```

**修改**
```
apps/web/src/server/modules/translation.ts       未命中走草稿分支
apps/web/src/server/db.ts                        migrate 追加列与新表
packages/db/schema.sql                           同步新表（新建库时生效）
packages/types/src/index.ts                      新类型
apps/web/src/components/overlays.tsx             译文浮层草稿态、术语浮层入口
apps/web/src/components/analytics-panel.tsx      诊断卡片
apps/web/src/app/(shell)/admin/page.tsx          待审译文入口
apps/web/src/components/app-rail.tsx             复习入口
apps/web/src/app/(public)/privacy/page.tsx       AI 辅助说明
prisma/schema.prisma                             同步（虽未用 Prisma 运行，保持一致）
tooling/content/skills/*.yaml 或 seed 里的 skill   改 translation.source 一条
```

**特别注意：`skill_configs` 里那条 YAML 必须同步改。**
现在写着 `translation.source: "预置模板，哈希匹配，不调用外部 API"`、
`fallback: "显示「暂无预置译文」"`。接 AI 后这条声明就是错的，
而 `skill_configs` 是这个项目的「规则声明」表（有版本、可编辑、界面上能看到）。
规则与实现脱节比功能没做更糟，必须一起改。

---

## 7. 合规与隐私

| 风险 | 处置 |
| :--- | :--- |
| 学生身份外泄 | 请求体只含句子/词语；不传 userId/学号/姓名/班级名。学情摘要只传聚合数字 |
| 课文版权 | 只发「选中的单句」而非整篇，且仅在用户主动点击时发；不批量预生成 |
| 日志留存原文 | `ai_task_log` 只记字符数与哈希前缀，不落原文 |
| 供应商留存 | 在部署文档里写明建议选「不用于训练」的企业版接口；给出关闭开关 |
| 学生被告知 | 隐私政策页新增「AI 辅助生成」段落：生成时机、外发内容、可关闭方式 |
| 教师误信 AI | 草稿一律显式标注、视觉区分；审核动作记 `reviewed_by` / `reviewed_at` 留痕 |

---

## 8. 需要你定的 6 件事

1. **API key 与模型名**：你打算用哪家（DeepSeek / 通义 / 智谱 / 其他）？给我 base_url + model 名即可，
   key 建议你自己写进 `.env.local`，不必发给我。
2. **是否允许外发课文句子**：这是 AI 功能的前提。如果学校/律所对课件外发有禁令，我改用本地 Ollama，
   代码不用改（只换 base_url）。
3. **音标策略**：AI 音标标「参考」，还是干脆不给？
4. **译文草稿默认行为**：学生点开就自动生成（体验好、成本高），还是先显示按钮点了才生成（省成本）？
   我倾向后者。
5. **复习入口放哪**：侧栏一级入口，还是挂在生词本页顶部作为子视图？
6. **这次改动要不要重新出交付文档**：三份 PDF 与源码 ZIP 会因本次改动而数字过期。
   我建议功能全部落地后统一重跑测试、重出 PDF，而不是每做一个阶段就重出一版。

---

## 9. 不做的事

- **全文 RAG 问答**。`node:sqlite` 没有向量检索，上 `sqlite-vec` 需要原生扩展，
  会破坏「零原生编译」「Node 22 开箱即用」的选型；且 71 万词法条上的问答幻觉代价远超收益。
  如确需，正确的做法是 FTS5 关键词检索 +「答不出就说不知道」的强约束，另立方案。
- **AI 自动打分写成绩**。责任无法落实，教师评分权不下放。
- **AI 译文不标来源直接入库**。教学事故级做法，不在讨论范围。
- **后台批量预生成全部译文**。成本与收益不匹配，且很可能教师根本不用。
