'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog } from '@headlessui/react';
import {
  ArrowDown,
  ArrowUp,
  Eye,
  FileText,
  GraduationCap,
  Pencil,
  Plus,
  Save,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { useLeadershipLessons } from '@/hooks/useLeadershipLessons';
import { uploadLeadershipResource } from '@/lib/cloudinary/upload';
import { youtubeEmbedUrl } from '@/lib/leadership/youtube';
import type { LeadershipLesson, LeadershipLessonStatus } from '@/types/leadership';
import { LoadingCardList } from '@/components/LoadingSkeleton';
import { RequiredFieldIndicator, RequiredFieldsNote } from '@/components/forms/FieldRequirement';

type FormState = {
  title: string;
  description: string;
  youtubeVideoId: string;
  captionsReviewed: boolean;
  pdfUrl: string;
  pdfFileName: string;
};

const EMPTY_FORM: FormState = {
  title: '',
  description: '',
  youtubeVideoId: '',
  captionsReviewed: false,
  pdfUrl: '',
  pdfFileName: '',
};

export default function LeadershipDevelopmentAdminPage() {
  const { user, userProfile } = useAuth();
  const router = useRouter();
  const { lessons, loading, error: loadError, retry } = useLeadershipLessons({ admin: true });
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [previewLesson, setPreviewLesson] = useState<LeadershipLesson | null>(null);

  useEffect(() => {
    document.title = 'Leadership Development Management | Sioux Falls Church of Christ';
  }, []);

  useEffect(() => {
    if (userProfile && !userProfile.isAdmin && userProfile.role !== 'admin') router.push('/');
  }, [router, userProfile]);

  async function authorizedFetch(url: string, init: RequestInit = {}) {
    if (!user) throw new Error('Sign in again to continue.');
    const token = await user.getIdToken();
    const response = await fetch(url, {
      ...init,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...init.headers },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'The request could not be completed.');
    return data;
  }

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setPdfFile(null);
    setFormError(null);
  }

  function editLesson(lesson: LeadershipLesson) {
    setEditingId(lesson.id);
    setForm({
      title: lesson.title,
      description: lesson.description,
      youtubeVideoId: lesson.youtubeVideoId,
      captionsReviewed: lesson.captionsReviewed,
      pdfUrl: lesson.pdfUrl,
      pdfFileName: lesson.pdfFileName,
    });
    setPdfFile(null);
    setFormError(null);
    setMessage(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function selectPdf(file: File | undefined) {
    if (!file) return;
    if (file.type !== 'application/pdf') {
      setFormError('Choose a PDF file.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setFormError('The PDF must be smaller than 10 MB.');
      return;
    }
    setPdfFile(file);
    setFormError(null);
  }

  async function saveLesson(status: LeadershipLessonStatus) {
    if (!form.title.trim() || !form.description.trim() || !form.youtubeVideoId.trim()) {
      setFormError('Enter a title, description, and YouTube link.');
      return;
    }
    if (!editingId && !pdfFile) {
      setFormError('Choose the PDF that belongs with this lesson.');
      return;
    }
    if (status === 'published' && !form.captionsReviewed) {
      setFormError('Review the automatic captions before publishing.');
      return;
    }

    setSaving(true);
    setFormError(null);
    setMessage(null);
    try {
      let pdfUrl = form.pdfUrl;
      let pdfFileName = form.pdfFileName;
      if (pdfFile) {
        pdfUrl = await uploadLeadershipResource(pdfFile);
        pdfFileName = pdfFile.name;
      }
      const method = editingId ? 'PATCH' : 'POST';
      const url = editingId
        ? `/api/admin/leadership-lessons/${editingId}`
        : '/api/admin/leadership-lessons';
      await authorizedFetch(url, {
        method,
        body: JSON.stringify({ ...form, pdfUrl, pdfFileName, status }),
      });
      setMessage(editingId ? 'Lesson updated.' : 'Lesson created.');
      resetForm();
      retry();
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : 'The lesson could not be saved.');
    } finally {
      setSaving(false);
    }
  }

  async function moveLesson(index: number, direction: -1 | 1) {
    const otherIndex = index + direction;
    if (otherIndex < 0 || otherIndex >= lessons.length) return;
    const lesson = lessons[index];
    const other = lessons[otherIndex];
    setWorkingId(lesson.id);
    setMessage(null);
    setFormError(null);
    try {
      await Promise.all([
        authorizedFetch(`/api/admin/leadership-lessons/${lesson.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ order: other.order }),
        }),
        authorizedFetch(`/api/admin/leadership-lessons/${other.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ order: lesson.order }),
        }),
      ]);
      setMessage('Lesson order updated.');
      retry();
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : 'The lessons could not be reordered.');
    } finally {
      setWorkingId(null);
    }
  }

  async function togglePublished(lesson: LeadershipLesson) {
    if (lesson.status === 'draft' && !lesson.captionsReviewed) {
      editLesson(lesson);
      setFormError('Review the automatic captions before publishing.');
      return;
    }
    setWorkingId(lesson.id);
    try {
      await authorizedFetch(`/api/admin/leadership-lessons/${lesson.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: lesson.status === 'published' ? 'draft' : 'published' }),
      });
      setMessage(lesson.status === 'published' ? 'Lesson returned to draft.' : 'Lesson published.');
      retry();
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : 'The lesson status could not be changed.');
    } finally {
      setWorkingId(null);
    }
  }

  async function deleteLesson(lesson: LeadershipLesson) {
    if (!window.confirm(`Delete “${lesson.title}”? The lesson will be removed from the course.`)) return;
    setWorkingId(lesson.id);
    try {
      await authorizedFetch(`/api/admin/leadership-lessons/${lesson.id}`, { method: 'DELETE' });
      if (editingId === lesson.id) resetForm();
      setMessage('Lesson removed.');
      retry();
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : 'The lesson could not be removed.');
    } finally {
      setWorkingId(null);
    }
  }

  if (!userProfile?.isAdmin && userProfile?.role !== 'admin') return null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <header>
        <p className="font-semibold text-coral-dark">Content management</p>
        <h1 className="mt-1 text-3xl font-bold text-charcoal">Leadership Development</h1>
        <p className="mt-2 max-w-3xl text-text-light">Build the member course one video-and-PDF lesson at a time. New lessons remain drafts until you publish them.</p>
      </header>

      <section className="mt-7 rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-6" aria-labelledby="lesson-form-heading">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="lesson-form-heading" className="text-2xl font-bold text-charcoal">{editingId ? 'Edit lesson' : 'Add a lesson'}</h2>
            <p className="mt-1 text-sm text-text-light">Paste the YouTube link and upload the matching PDF.</p>
          </div>
          {editingId ? <button type="button" onClick={resetForm} className="min-h-11 rounded-lg px-3 font-semibold text-coral-dark hover:bg-coral/10">Cancel edit</button> : null}
        </div>

        <form className="mt-6 grid gap-5" onSubmit={(event) => { event.preventDefault(); saveLesson('draft'); }}>
          <RequiredFieldsNote />
          <label className="block">
            <span className="font-semibold text-charcoal">Lesson title<RequiredFieldIndicator /></span>
            <input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} maxLength={120} className="mt-2 min-h-12 w-full rounded-lg border border-border bg-bg px-3 text-charcoal" placeholder="Leading through service" />
          </label>
          <label className="block">
            <span className="font-semibold text-charcoal">Short description<RequiredFieldIndicator /></span>
            <textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} maxLength={600} rows={3} className="mt-2 w-full rounded-lg border border-border bg-bg px-3 py-3 text-charcoal" placeholder="What members will learn in this lesson" />
          </label>
          <label className="block">
            <span className="font-semibold text-charcoal">Unlisted YouTube link<RequiredFieldIndicator /></span>
            <input value={form.youtubeVideoId} onChange={(event) => setForm((current) => ({ ...current, youtubeVideoId: event.target.value }))} className="mt-2 min-h-12 w-full rounded-lg border border-border bg-bg px-3 text-charcoal" placeholder="https://youtu.be/…" />
          </label>
          <label className="block rounded-xl border border-dashed border-border bg-bg p-4">
            <span className="flex items-center gap-2 font-semibold text-charcoal"><Upload aria-hidden="true" className="h-5 w-5 text-coral-dark" /> {editingId ? 'Replace PDF' : 'Lesson PDF'}{!editingId ? <RequiredFieldIndicator /> : null}</span>
            <input type="file" accept="application/pdf,.pdf" onChange={(event) => selectPdf(event.target.files?.[0])} className="mt-3 block w-full text-sm text-text-light file:mr-3 file:min-h-11 file:rounded-lg file:border-0 file:bg-charcoal file:px-4 file:font-semibold file:text-white" />
            <span className="mt-2 block text-sm text-text-light">PDF only, up to 10 MB. {editingId && !pdfFile ? `Current: ${form.pdfFileName}` : pdfFile ? `Selected: ${pdfFile.name}` : ''}</span>
          </label>
          <label className="flex min-h-12 items-start gap-3 rounded-xl border border-border p-4">
            <input type="checkbox" checked={form.captionsReviewed} onChange={(event) => setForm((current) => ({ ...current, captionsReviewed: event.target.checked }))} className="mt-1 h-5 w-5 rounded border-border text-coral-dark" />
            <span><strong className="block text-charcoal">I reviewed YouTube’s automatic captions</strong><span className="mt-1 block text-sm text-text-light">This is required before the lesson can be published.</span></span>
          </label>

          {formError ? <div role="alert" className="rounded-lg border border-error/30 bg-error-bg p-4 text-error">{formError}</div> : null}
          {message ? <div role="status" className="rounded-lg border border-success/30 bg-success-bg p-4 text-charcoal">{message}</div> : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button type="submit" disabled={saving} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border-2 border-charcoal px-5 font-semibold text-charcoal hover:bg-gray-100 disabled:opacity-60"><Save aria-hidden="true" className="h-4 w-4" />{saving ? 'Saving…' : 'Save draft'}</button>
            <button type="button" disabled={saving} onClick={() => saveLesson('published')} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-charcoal px-5 font-semibold text-white hover:bg-charcoal-light disabled:opacity-60"><Plus aria-hidden="true" className="h-4 w-4" />{saving ? 'Saving…' : 'Save and publish'}</button>
          </div>
        </form>
      </section>

      <section className="mt-8" aria-labelledby="managed-lessons-heading">
        <div className="flex items-end justify-between gap-4">
          <div><p className="font-semibold text-coral-dark">Course outline</p><h2 id="managed-lessons-heading" className="text-2xl font-bold text-charcoal">Lessons</h2></div>
          {!loading ? <p className="text-sm text-text-light">{lessons.length} total</p> : null}
        </div>

        <div className="mt-4">
          {loading ? <LoadingCardList label="Loading leadership lessons…" count={3} compact /> : loadError ? (
            <div className="rounded-xl border border-error/30 bg-error-bg p-6 text-center"><p className="font-semibold text-charcoal">{loadError}</p><button type="button" onClick={retry} className="mt-3 min-h-11 rounded-lg border border-coral-dark px-4 font-semibold text-coral-dark">Try again</button></div>
          ) : lessons.length === 0 ? (
            <div className="rounded-xl border border-border bg-white p-8 text-center shadow-sm"><GraduationCap aria-hidden="true" className="mx-auto h-10 w-10 text-text-muted" /><p className="mt-3 font-semibold text-charcoal">No lessons yet. Add the first lesson above.</p></div>
          ) : (
            <ol className="grid gap-3">
              {lessons.map((lesson, index) => (
                <li key={lesson.id} className="rounded-xl border border-border bg-white p-4 shadow-sm sm:flex sm:items-center sm:gap-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-coral/15 font-bold text-coral-dark">{index + 1}</span>
                  <div className="mt-3 min-w-0 flex-1 sm:mt-0">
                    <div className="flex flex-wrap items-center gap-2"><h3 className="font-bold text-charcoal">{lesson.title}</h3><span className={`rounded-full px-2 py-1 text-xs font-bold ${lesson.status === 'published' ? 'bg-success-bg text-charcoal' : 'bg-gray-100 text-text-light'}`}>{lesson.status === 'published' ? 'Published' : 'Draft'}</span></div>
                    <p className="mt-1 line-clamp-2 text-sm text-text-light">{lesson.description}</p>
                    <p className="mt-1 flex items-center gap-1 text-xs text-text-light"><FileText aria-hidden="true" className="h-3 w-3" />{lesson.pdfFileName} · Captions {lesson.captionsReviewed ? 'reviewed' : 'not reviewed'}</p>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-1 sm:mt-0 sm:justify-end">
                    <button type="button" disabled={index === 0 || workingId === lesson.id} onClick={() => moveLesson(index, -1)} className="min-h-11 min-w-11 rounded-lg text-charcoal hover:bg-gray-100 disabled:opacity-30" aria-label={`Move ${lesson.title} earlier`}><ArrowUp aria-hidden="true" className="mx-auto h-5 w-5" /></button>
                    <button type="button" disabled={index === lessons.length - 1 || workingId === lesson.id} onClick={() => moveLesson(index, 1)} className="min-h-11 min-w-11 rounded-lg text-charcoal hover:bg-gray-100 disabled:opacity-30" aria-label={`Move ${lesson.title} later`}><ArrowDown aria-hidden="true" className="mx-auto h-5 w-5" /></button>
                    <button type="button" onClick={() => setPreviewLesson(lesson)} className="min-h-11 min-w-11 rounded-lg text-charcoal hover:bg-gray-100" aria-label={`Preview ${lesson.title}`}><Eye aria-hidden="true" className="mx-auto h-5 w-5" /></button>
                    <button type="button" onClick={() => editLesson(lesson)} className="min-h-11 min-w-11 rounded-lg text-charcoal hover:bg-gray-100" aria-label={`Edit ${lesson.title}`}><Pencil aria-hidden="true" className="mx-auto h-5 w-5" /></button>
                    <button type="button" disabled={workingId === lesson.id} onClick={() => togglePublished(lesson)} className="min-h-11 rounded-lg px-3 text-sm font-semibold text-coral-dark hover:bg-coral/10 disabled:opacity-50">{lesson.status === 'published' ? 'Unpublish' : 'Publish'}</button>
                    <button type="button" disabled={workingId === lesson.id} onClick={() => deleteLesson(lesson)} className="min-h-11 min-w-11 rounded-lg text-error hover:bg-error-bg disabled:opacity-50" aria-label={`Delete ${lesson.title}`}><Trash2 aria-hidden="true" className="mx-auto h-5 w-5" /></button>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>

      <Dialog open={Boolean(previewLesson)} onClose={() => setPreviewLesson(null)} className="relative z-[80]">
        <div className="fixed inset-0 bg-charcoal/60" aria-hidden="true" />
        <div className="fixed inset-0 overflow-y-auto p-4 sm:p-8">
          <Dialog.Panel className="mx-auto max-w-4xl rounded-2xl bg-white p-5 shadow-xl sm:p-6">
            {previewLesson ? (
              <>
                <div className="flex items-start justify-between gap-4"><div><p className="font-semibold text-coral-dark">Lesson preview</p><Dialog.Title className="text-2xl font-bold text-charcoal">{previewLesson.title}</Dialog.Title><Dialog.Description className="mt-2 text-text-light">{previewLesson.description}</Dialog.Description></div><button type="button" onClick={() => setPreviewLesson(null)} className="min-h-11 min-w-11 rounded-lg hover:bg-gray-100" aria-label="Close preview"><X aria-hidden="true" className="mx-auto h-6 w-6" /></button></div>
                <div className="mt-6 grid items-start gap-6 md:grid-cols-[300px_1fr]">
                  <div className="aspect-[9/16] overflow-hidden rounded-xl bg-black"><iframe src={youtubeEmbedUrl(previewLesson.youtubeVideoId)} title={`${previewLesson.title} preview`} className="h-full w-full border-0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen /></div>
                  <div className="rounded-xl bg-bg p-5"><FileText aria-hidden="true" className="h-7 w-7 text-coral-dark" /><h3 className="mt-3 text-xl font-bold text-charcoal">PDF resource</h3><p className="mt-2 break-words text-text-light">{previewLesson.pdfFileName}</p><a href={previewLesson.pdfUrl} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-charcoal px-4 font-semibold text-white hover:bg-charcoal-light">Open PDF</a></div>
                </div>
              </>
            ) : null}
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  );
}
