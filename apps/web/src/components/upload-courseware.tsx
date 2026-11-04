'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { api, errorMessage } from '@/lib/client';

export interface CourseOption {
  id: string;
  title: string;
  className: string | null;
}

const ACCEPT = '.md,.markdown,.txt,.docx';

/** 读文件：docx 走 base64（服务端解 zip），其余按文本读 */
async function readPayload(file: File): Promise<{ text?: string; file?: string }> {
  if (/\.docx$/i.test(file.name)) {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = '';
    // 分块转字符串，一次性 apply 会超参数上限
    const CHUNK = 0x8000;
    for (let i = 0; i < bytes.length; i += CHUNK) {
      binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
    }
    return { file: btoa(binary) };
  }
  return { text: await file.text() };
}

/**
 * 上传课件。
 *
 * 支持 .docx / .md / .txt：Word 交给服务端解 zip 取正文，Markdown 保留标题、
 * 列表与粗斜体，纯文本按段落切。上传后直接进编辑器，教师可以继续改。
 */
export function UploadCourseware({ courses }: { courses: CourseOption[] }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  // 默认不挂课：上传常常只是先存进个人课件库，误挂到某门课会直接进学生视野
  const [courseId, setCourseId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setFile(null);
    setTitle('');
    setBusy(false);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const close = () => {
    if (busy) return;
    setOpen(false);
    reset();
  };

  const pick = (next: File | null) => {
    setFile(next);
    setError(null);
    if (next) {
      // 文件名去掉扩展名即默认标题，教师可改
      const guess = next.name.replace(/\.(md|markdown|txt|docx)$/i, '').replace(/[_-]+/g, ' ').trim();
      setTitle((current) => current || guess);
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file) {
      setError('先选一个文件。');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const payload = await readPayload(file);
      const created = await api<{ id: string; title: string }>('/api/documents/import', {
        method: 'POST',
        body: JSON.stringify({ ...payload, filename: file.name, title: title.trim() || undefined, courseId: courseId || null }),
      });
      setOpen(false);
      reset();
      router.push(`/docs/${created.id}`);
      router.refresh();
    } catch (cause) {
      setError(errorMessage(cause));
      setBusy(false);
    }
  };

  return (
    <>
      <button type="button" className="ln-btn ln-btn--primary ln-btn--sm" onClick={() => setOpen(true)}>
        上传课件
      </button>

      {open ? (
        <div className="modal" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && close()}>
          <div className="modal__panel" role="dialog" aria-modal="true" aria-labelledby="upload-title">
            <div className="modal__head">
              <h2 className="modal__title" id="upload-title">
                上传课件
              </h2>
              <button type="button" className="modal__close" onClick={close} aria-label="关闭">
                ×
              </button>
            </div>

            <form className="modal__body" onSubmit={submit}>
              <div className="ln-field">
                <label className="ln-label" htmlFor="up-file">
                  课件文件
                </label>
                <input
                  id="up-file"
                  ref={inputRef}
                  className="ln-input"
                  type="file"
                  accept={ACCEPT}
                  onChange={(event) => pick(event.target.files?.[0] ?? null)}
                />
                <span className="ln-hint">
                  接受 .docx / .md / .txt。Word 只取标题与正文段落，样式、批注、图片不会带过来；需要保留图片的课件请在编辑器里插入。
                </span>
              </div>

              <div className="ln-field">
                <label className="ln-label" htmlFor="up-title">
                  课件标题
                </label>
                <input
                  id="up-title"
                  className="ln-input"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="第一讲 · 判例阅读方法"
                />
              </div>

              <div className="ln-field">
                <label className="ln-label" htmlFor="up-course">
                  归属课程
                </label>
                <select
                  id="up-course"
                  className="ln-input"
                  value={courseId}
                  onChange={(event) => setCourseId(event.target.value)}
                >
                  <option value="">暂不挂课（只放在我的课件里）</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.className ? `${course.title} · ${course.className}` : course.title}
                    </option>
                  ))}
                </select>
                <span className="ln-hint">挂到课程后，选修这门课的学生就能在课程页读到；不挂课只有你自己看得到。</span>
              </div>

              {error ? <div className="notice notice--error">{error}</div> : null}

              <div className="modal__actions">
                <button className="ln-btn ln-btn--primary ln-btn--sm" type="submit" disabled={busy || !file}>
                  {busy ? '上传中…' : '上传并打开'}
                </button>
                <button className="ln-btn ln-btn--quiet ln-btn--sm" type="button" onClick={close} disabled={busy}>
                  取消
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
