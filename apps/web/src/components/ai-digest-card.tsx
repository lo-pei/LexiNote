'use client';

import { useEffect, useState } from 'react';
import { api, errorMessage } from '@/lib/client';
import type { DigestPayloadDTO } from '@/lib/types';

/**
 * 学情诊断卡片。
 *
 * 未配置模型时整块不渲染——这样「接入前与接入后界面一致」这条硬约束
 * 不依赖服务端判断，任何页面引它都不会多出空壳。
 */
export function AiDigestCard({ courseId }: { courseId: string }) {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [digest, setDigest] = useState<DigestPayloadDTO | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ enabled: boolean }>('/api/ai/status')
      .then((res) => setEnabled(Boolean(res.enabled)))
      .catch(() => setEnabled(false));
  }, []);

  if (!enabled) return null;

  const generate = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ digest: DigestPayloadDTO | null; available: boolean }>(
        `/api/analytics/${courseId}/digest`,
        { method: 'POST' },
      );
      if (res.digest) setDigest(res.digest);
      else setError('诊断服务暂时不可用，请稍后再试。');
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="section section--detail">
      <div className="section__head">
        <h2 className="section__title">教学诊断</h2>
        <span className="section__hint">AI 辅助 · 仅使用聚合数据</span>
      </div>
      <div className="card ai-digest">
        {error ? <p className="notice notice--error">{error}</p> : null}
        {digest ? (
          <>
            <p className="ai-digest__summary">{digest.summary}</p>
            {digest.advice.length ? (
              <ul className="ai-digest__advice">
                {digest.advice.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}
            <p className="ai-digest__note">
              依据最近两周的聚合统计生成，不包含学生姓名与学号；同一天重复打开不会重复生成。
              <button type="button" className="ai-digest__refresh" onClick={generate} disabled={busy}>
                {busy ? '重新生成中…' : '重新生成'}
              </button>
            </p>
          </>
        ) : (
          <>
            <p className="ai-digest__summary">
              让助手读一遍本班的笔记、术语点击与译文命中情况，指出最值得注意的现象，并给三条教学建议。
            </p>
            <button type="button" className="ln-btn ln-btn--outline ln-btn--sm" onClick={generate} disabled={busy}>
              {busy ? '生成中…' : '生成诊断'}
            </button>
          </>
        )}
      </div>
    </section>
  );
}
