import type { DevLogEntry, SessionUser, SkillConfigRecord } from '@ln/types';
import YAML from 'yaml';
import { getDb, parseJson } from '../db';
import { badRequest, forbidden, notFound } from '../http';

const uid = (p: string) => `${p}_${globalThis.crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;

export function getSkill(name: string): SkillConfigRecord {
  const row = getDb().get<{ id: string; name: string; yaml: string; version: number; updated_at: string }>(
    `SELECT * FROM skill_configs WHERE name = ?`,
    name,
  );
  if (!row) throw notFound('Skill 配置不存在。');
  return { id: row.id, name: row.name, yaml: row.yaml, version: row.version, updatedAt: row.updated_at };
}

export function listSkills(): SkillConfigRecord[] {
  return getDb()
    .all<{ id: string; name: string; yaml: string; version: number; updated_at: string }>(
      `SELECT * FROM skill_configs ORDER BY name ASC`,
    )
    .map((r) => ({ id: r.id, name: r.name, yaml: r.yaml, version: r.version, updatedAt: r.updated_at }));
}

/** 表单提交后重新序列化整份 YAML，version 自增（说明书 §5.11 / §12） */
export function updateSkill(name: string, next: unknown, user: SessionUser): SkillConfigRecord {
  if (user.role !== 'TEACHER' && user.role !== 'ADMIN') throw forbidden('只有教师可以修改 Skill 配置。');
  const current = getSkill(name);

  let text: string;
  try {
    text =
      typeof next === 'string'
        ? YAML.stringify(YAML.parse(next))
        : YAML.stringify(next as Record<string, unknown>);
    YAML.parse(text);
  } catch {
    throw badRequest('YAML 结构不合法，未能保存。');
  }

  getDb().run(
    `UPDATE skill_configs SET yaml = ?, version = ?, updated_at = ? WHERE name = ?`,
    text,
    current.version + 1,
    new Date().toISOString(),
    name,
  );
  return getSkill(name);
}

export function listDevLog(): DevLogEntry[] {
  return getDb()
    .all<{
      id: string;
      phase: string;
      goal: string;
      decisions: string;
      status: string;
      sort_order: number;
    }>(`SELECT * FROM dev_logs ORDER BY sort_order ASC`)
    .map((r) => ({
      id: r.id,
      phase: r.phase,
      goal: r.goal,
      decisions: parseJson<{ title: string; detail: string }[]>(r.decisions, []),
      status: r.status,
      sortOrder: r.sort_order,
    }));
}

export function seedDocumentDefaults(): void {
  void uid;
}
