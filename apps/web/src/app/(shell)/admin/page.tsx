import Link from 'next/link';
import { requirePageUser } from '@/lib/session';
import { listDevLog, listSkills } from '@/server/modules/skill';
import { SkillEditor } from '@/components/skill-editor';

export const dynamic = 'force-dynamic';
export const metadata = { title: '维护者说明 · LexiNote' };

export default async function AdminPage() {
  const user = await requirePageUser();

  if (user.role === 'STUDENT') {
    return (
      <div className="wrap">
        <header className="head">
          <div>
            <h1 className="head__title">维护者说明</h1>
          </div>
          <div className="head__actions">
            <Link className="ln-btn ln-btn--outline ln-btn--sm" href="/help">
              使用说明
            </Link>
          </div>
        </header>
        <div className="empty">当前账号没有查看权限。</div>
      </div>
    );
  }

  const logs = listDevLog();
  const skills = listSkills();

  return (
    <div className="wrap">
      <header className="head">
        <div>
          <h1 className="head__title">维护者说明</h1>
        </div>
        <div className="head__actions">
          <Link className="ln-btn ln-btn--outline ln-btn--sm" href="/help">
            返回使用说明
          </Link>
        </div>
      </header>

      <section className="section">
        <div className="section__head">
          <h2 className="section__title">开发日志</h2>
          <span className="section__hint">{logs.length} 个阶段</span>
        </div>

        <div className="timeline" style={{ marginTop: 8 }}>
          {logs.map((log) => (
            <div className="phase" key={log.id}>
              <div>
                <div className="phase__tag">{log.phase}</div>
                <div className="phase__status">{log.status}</div>
              </div>
              <div>
                <p className="phase__goal">{log.goal}</p>
                {log.decisions.length ? (
                  <div className="phase__decisions">
                    {log.decisions.map((decision) => (
                      <div className="phase__decision" key={decision.title}>
                        <b>{decision.title}</b>
                        <span className="muted">{decision.detail}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </section>

      {skills.length ? (
        <section className="section">
          <div className="section__head">
            <h2 className="section__title">Skill 配置</h2>
            <span className="section__hint">标注与编辑建议的规则源</span>
          </div>
          <div style={{ marginTop: 14, display: 'grid', gap: 16 }}>
            {skills.map((skill) => (
              <SkillEditor
                key={skill.id}
                name={skill.name}
                initialYaml={skill.yaml}
                version={skill.version}
                updatedAt={skill.updatedAt}
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
