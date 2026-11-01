import Link from 'next/link';
import { notFound } from 'next/navigation';
import { formatDate, formatRelative } from '@ln/utils';
import { EditorShell } from '@ln/editor';
import type { SessionUser } from '@ln/types';
import { requirePageUser } from '@/lib/session';
import { getTopic } from '@/server/modules/forum';
import type { TopicDetail } from '@/server/modules/forum';
import { AnnotationForm, GradeForm, ReplyForm } from '@/components/forum-controls';

export const dynamic = 'force-dynamic';

const ROLE_LABEL: Record<SessionUser['role'], string> = { ADMIN: '管理员', TEACHER: '教师', STUDENT: '学生' };

export default async function TopicPage({ params }: { params: { id: string } }) {
  const user = await requirePageUser();

  let topic: TopicDetail | null = null;
  try {
    topic = getTopic(params.id, user);
  } catch {
    topic = null;
  }
  if (!topic) notFound();

  const isOwnerTeacher = user.role === 'TEACHER';

  return (
    <div className="wrap" style={{ maxWidth: 900 }}>
      <div style={{ marginBottom: 18 }}>
        <Link className="section__hint" href={`/forum?courseId=${topic.courseId}`}>
          ← {topic.courseTitle} · 讨论区
        </Link>
      </div>

      <header style={{ marginBottom: 8 }}>
        <div className="doc__eyebrow">
          <span className="ln-badge ln-badge--required">{topic.type === 'ASSIGNMENT' ? '作业' : '课堂提问'}</span>
          <span>{topic.authorName}</span>
          <span>发布于 {formatDate(topic.createdAt)}</span>
          {topic.dueAt ? <span>截止 {formatDate(topic.dueAt)}</span> : null}
        </div>
        <h1 className="head__title" style={{ maxWidth: '28ch' }}>
          {topic.title}
        </h1>
      </header>

      <article className="card" style={{ marginTop: 18, padding: '22px 26px' }}>
        <EditorShell content={topic.body} mode="readonly" ariaLabel="主题正文" />
      </article>

      <section className="section">
        <div className="section__head">
          <h2 className="section__title">回复</h2>
          <span className="section__hint">{topic.posts.length} 条</span>
        </div>

        {topic.posts.length ? (
          topic.posts.map((post) => (
            <div className={`post${post.isAnswer ? ' post--answer' : ''}`} key={post.id}>
              <div className="post__head">
                <span className="avatar" aria-hidden="true">
                  {(post.authorName ?? '?').slice(-2)}
                </span>
                <span className="post__author">{post.authorName}</span>
                {post.authorRole ? <span className="ln-badge">{ROLE_LABEL[post.authorRole]}</span> : null}
                {post.isAnswer ? <span className="ln-badge ln-badge--required">参考答案</span> : null}
                <span className="post__time">{formatRelative(post.createdAt)}</span>
              </div>

              <div className="post__body">
                <EditorShell content={post.body} mode="readonly" ariaLabel={`${post.authorName} 的回复`} />
              </div>

              {post.annotations.map((annotation) => (
                <div className="post__note" key={annotation.id}>
                  <b>{annotation.authorName} 批注</b>
                  <br />
                  {annotation.content}
                </div>
              ))}

              {isOwnerTeacher ? (
                <div style={{ marginTop: 10 }}>
                  <AnnotationForm postId={post.id} />
                </div>
              ) : null}

              {isOwnerTeacher && topic.isGraded ? (
                <GradeForm postId={post.id} score={post.score} isAnswer={post.isAnswer} />
              ) : post.score !== null ? (
                <p className="ln-hint" style={{ marginTop: 8 }}>
                  得分 {post.score}
                </p>
              ) : null}
            </div>
          ))
        ) : (
          <div className="empty" style={{ marginTop: 14 }}>
            还没有回复。第一条回复往往决定这条讨论的质量。
          </div>
        )}

        <div style={{ marginTop: 22 }}>
          <ReplyForm topicId={topic.id} disabled={!topic.canReply} />
        </div>
      </section>
    </div>
  );
}
