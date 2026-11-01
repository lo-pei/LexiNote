'use client';

import { useState } from 'react';
import { api, errorMessage } from '@/lib/client';

export function SkillEditor({
  name,
  initialYaml,
  version,
  updatedAt,
}: {
  name: string;
  initialYaml: string;
  version: number;
  updatedAt: string;
}) {
  const [yaml, setYaml] = useState(initialYaml);
  const [current, setCurrent] = useState({ version, updatedAt });
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  const dirty = yaml !== initialYaml;

  const save = async () => {
    setState('saving');
    setMessage(null);
    try {
      const result = await api<{ yaml: string; version: number; updatedAt: string }>(`/api/skills/${name}`, {
        method: 'PUT',
        body: JSON.stringify({ yaml }),
      });
      setYaml(result.yaml);
      setCurrent({ version: result.version, updatedAt: result.updatedAt });
      setState('saved');
      setMessage(`已保存为 v${result.version}。`);
    } catch (cause) {
      setState('error');
      setMessage(errorMessage(cause));
    }
  };

  return (
    <div className="card" style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 500 }}>{name}</div>
          <div className="ln-hint">
            版本 v{current.version} · 更新于 {current.updatedAt.slice(0, 19).replace('T', ' ')}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {message ? (
            <span className="ln-hint" style={{ color: state === 'error' ? 'var(--accent-ink)' : 'var(--ink-2)' }}>
              {message}
            </span>
          ) : null}
          <button
            type="button"
            className="ln-btn ln-btn--primary ln-btn--sm"
            onClick={save}
            disabled={state === 'saving' || !dirty}
          >
            {state === 'saving' ? '保存中…' : dirty ? '保存并升版' : '无改动'}
          </button>
        </div>
      </div>

      <textarea
        className="code"
        value={yaml}
        onChange={(event) => {
          setYaml(event.target.value);
          setState('idle');
          setMessage(null);
        }}
        spellCheck={false}
        aria-label="Skill 配置 YAML"
      />

      <p className="ln-hint">
        保存时会重新解析并序列化整份 YAML：结构不合法将拒绝写入，成功则 version 自增。改配置只影响此后生成的标注建议，不改写既有文档。
      </p>
    </div>
  );
}
