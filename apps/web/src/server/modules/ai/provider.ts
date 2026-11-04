import { getDb } from '../../db';

/**
 * AI 能力地基（方案 §2）。
 *
 * 三条硬约束，改这个文件前先读一遍：
 * 1. 未配置 `AI_API_KEY` 时 `getProvider()` 返回 null，调用方走原逻辑，全站行为与接入前一致；
 * 2. 任何异常（超时、限流、解析失败）都收敛成 null，绝不向上抛——AI 不可用不能让功能变成报错；
 * 3. 日志只记字符数与耗时，**不落原文**：课文句子可能涉版权，学生输入可能涉个人信息。
 *
 * 只依赖全局 fetch，不引入 openai SDK：一次 REST 调用不值得拖进一棵依赖树，
 * 也保住「Node 22 开箱即用、零原生编译」的选型。
 */

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export type AiTask = 'TRANSLATION_DRAFT' | 'TERM_LOOKUP' | 'REVIEW_QUESTION' | 'DIGEST';

export interface CompleteOptions {
  task?: AiTask;
  /** 触发者，仅用于用量统计，不外发 */
  userId?: string;
  /** 关联对象（句子哈希、词条、课程 id），日志里只记前 16 位 */
  refId?: string;
  maxTokens?: number;
  temperature?: number;
  /** 要求模型返回 JSON，失败时由调用方拿到 null */
  json?: boolean;
}

export interface AiProvider {
  readonly name: string;
  /** 失败一律返回 null，调用方必须处理 */
  complete(messages: ChatMessage[], opts?: CompleteOptions): Promise<string | null>;
}

interface AiConfig {
  enabled: boolean;
  baseUrl: string;
  apiKey: string;
  model: string;
  timeoutMs: number;
  maxConcurrency: number;
}

/** 排队上限：超过就直接降级，宁可让用户重试，不排长队拖垮单进程 */
const MAX_QUEUE = 8;
/** 排队等待上限：单次请求的总等待不该超过一个阅读动作的耐心 */
const QUEUE_WAIT_MS = 8_000;

function intFromEnv(key: string, fallback: number, min: number, max: number): number {
  const raw = Number(process.env[key]);
  if (!Number.isFinite(raw)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(raw)));
}

function readConfig(): AiConfig {
  const apiKey = (process.env.AI_API_KEY ?? '').trim();
  const flag = (process.env.AI_ENABLED ?? '').trim();
  // 默认「填了 key 就启用」；显式 AI_ENABLED=0 可以强制关掉，不必删 key
  const enabled = flag === '0' ? false : apiKey.length > 0;
  return {
    enabled,
    baseUrl: ((process.env.AI_BASE_URL ?? 'https://api.deepseek.com/v1').trim() || '').replace(/\/+$/, ''),
    apiKey,
    model: ((process.env.AI_MODEL ?? 'deepseek-chat').trim() || 'deepseek-chat'),
    timeoutMs: intFromEnv('AI_TIMEOUT_MS', 15_000, 3_000, 60_000),
    maxConcurrency: intFromEnv('AI_MAX_CONCURRENCY', 2, 1, 8),
  };
}

/* ── 并发闸门 ─────────────────────────────────────────────────
   单进程 + SQLite 的架构下，一个卡住的模型请求阻塞的是所有人的页面，
   所以这里必须有硬上限，且排队也要能放弃。                         */

interface Waiter {
  resolve: () => void;
  cancelled: boolean;
}

let active = 0;
const queue: Waiter[] = [];
let limit = 2;

async function acquire(): Promise<boolean> {
  if (active < limit) {
    active += 1;
    return true;
  }
  if (queue.length >= MAX_QUEUE) return false;

  const waiter: Waiter = { resolve: () => {}, cancelled: false };
  const granted = new Promise<void>((resolve) => {
    waiter.resolve = resolve;
  });
  queue.push(waiter);

  const outcome = await Promise.race([
    granted.then(() => 'ok' as const),
    new Promise<'timeout'>((resolve) => setTimeout(() => resolve('timeout'), QUEUE_WAIT_MS)),
  ]);

  if (outcome === 'timeout') {
    waiter.cancelled = true;
    return false;
  }
  // 被唤醒即代表名额已由 release() 让出，这里接手计数
  active += 1;
  return true;
}

function release(): void {
  active = Math.max(0, active - 1);
  while (queue.length > 0) {
    const next = queue.shift();
    if (!next) return;
    if (!next.cancelled) {
      next.resolve();
      return;
    }
  }
}

/* ── 用量日志（不含原文）──────────────────────────────────── */

interface LogEntry {
  task: string;
  ok: boolean;
  model: string;
  userId?: string;
  refId?: string;
  startedAt: number;
  promptChars: number;
  outputChars: number;
  error?: string;
}

function logUsage(entry: LogEntry): void {
  try {
    getDb().run(
      `INSERT INTO ai_task_log
         (id, task, model, user_id, ref_id, ok, latency_ms, prompt_chars, output_chars, error, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      `ail_${globalThis.crypto.randomUUID().slice(0, 16)}`,
      entry.task,
      entry.model,
      entry.userId ?? null,
      entry.refId ? entry.refId.slice(0, 16) : null,
      entry.ok ? 1 : 0,
      Date.now() - entry.startedAt,
      entry.promptChars,
      entry.outputChars,
      entry.error ? entry.error.slice(0, 200) : null,
      new Date().toISOString(),
    );
  } catch (error) {
    // 日志失败绝不能影响主流程
    console.warn('[ai] 用量日志写入失败', error);
  }
}

/* ── JSON 容错 ────────────────────────────────────────────────
   模型经常带 ```json 围栏或前后废话。解析逻辑收敛在这里一份，
   不让二十行剥离代码散落在四个业务模块里。                        */

export function parseJsonLoose<T>(text: string | null): T | null {
  if (!text) return null;
  let body = text.trim();
  const fence = body.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence?.[1]) body = fence[1].trim();
  const start = body.indexOf('{');
  const end = body.lastIndexOf('}');
  if (start >= 0 && end > start) body = body.slice(start, end + 1);
  try {
    return JSON.parse(body) as T;
  } catch {
    return null;
  }
}

/* ── Provider 实现 ─────────────────────────────────────────── */

function createProvider(cfg: AiConfig): AiProvider {
  limit = cfg.maxConcurrency;

  const complete: AiProvider['complete'] = async (messages, opts = {}) => {
    if (!cfg.enabled) return null;

    const task = opts.task ?? 'UNKNOWN';
    const promptChars = messages.reduce((sum, m) => sum + m.content.length, 0);
    const startedAt = Date.now();

    if (!(await acquire())) {
      logUsage({
        task,
        ok: false,
        model: cfg.model,
        userId: opts.userId,
        refId: opts.refId,
        startedAt,
        promptChars,
        outputChars: 0,
        error: 'BUSY',
      });
      return null;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), cfg.timeoutMs);
    let output = '';

    try {
      const payload: Record<string, unknown> = {
        model: cfg.model,
        messages,
        temperature: opts.temperature ?? 0.2,
        stream: false,
      };
      if (opts.maxTokens) payload.max_tokens = opts.maxTokens;
      if (opts.json) payload.response_format = { type: 'json_object' };

      const response = await fetch(`${cfg.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${cfg.apiKey}`,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        // 429 / 401 / 供应商维护，统一在这里落地，不把状态码抛给界面
        const detail = await response.text().catch(() => '');
        logUsage({
          task,
          ok: false,
          model: cfg.model,
          userId: opts.userId,
          refId: opts.refId,
          startedAt,
          promptChars,
          outputChars: 0,
          error: `HTTP ${response.status} ${detail.slice(0, 120)}`,
        });
        console.warn(`[ai] ${task} 请求失败：HTTP ${response.status}`);
        return null;
      }

      const data = (await response.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      output = (data.choices?.[0]?.message?.content ?? '').trim();

      if (!output) {
        logUsage({
          task,
          ok: false,
          model: cfg.model,
          userId: opts.userId,
          refId: opts.refId,
          startedAt,
          promptChars,
          outputChars: 0,
          error: 'EMPTY',
        });
        return null;
      }

      logUsage({
        task,
        ok: true,
        model: cfg.model,
        userId: opts.userId,
        refId: opts.refId,
        startedAt,
        promptChars,
        outputChars: output.length,
      });
      return output;
    } catch (error) {
      const reason = error instanceof Error ? error.name : 'UNKNOWN';
      logUsage({
        task,
        ok: false,
        model: cfg.model,
        userId: opts.userId,
        refId: opts.refId,
        startedAt,
        promptChars,
        outputChars: output.length,
        error: reason === 'AbortError' ? 'TIMEOUT' : reason,
      });
      if (reason !== 'AbortError') console.warn(`[ai] ${task} 调用异常`, error);
      return null;
    } finally {
      clearTimeout(timer);
      release();
    }
  };

  return { name: cfg.model, complete };
}

let cached: AiProvider | null | undefined;

/** 未配置返回 null；结果缓存，避免每个请求都读一遍 env */
export function getProvider(): AiProvider | null {
  if (cached === undefined) {
    const cfg = readConfig();
    cached = cfg.enabled ? createProvider(cfg) : null;
    if (cached) console.info(`[ai] 已启用 ${cfg.model}（并发 ${cfg.maxConcurrency}，超时 ${cfg.timeoutMs}ms）`);
  }
  return cached;
}

/** 供 /api/ai/status 与前端决定是否显示 AI 入口 */
export function aiStatus(): { enabled: boolean; model: string | null } {
  const cfg = readConfig();
  return { enabled: cfg.enabled, model: cfg.enabled ? cfg.model : null };
}

/** 测试用：清掉缓存，让下一次 getProvider() 重新读 env */
export function resetProviderCache(): void {
  cached = undefined;
}
