'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, ArrowRight, Download, ExternalLink, FileText } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { getRoleCapabilities } from '@/types/roles';
import { useLeadershipLessons } from '@/hooks/useLeadershipLessons';
import { youtubeEmbedUrl } from '@/lib/leadership/youtube';
import { LoadingCardList } from '@/components/LoadingSkeleton';

export default function LeadershipLessonPage() {
  const { id } = useParams<{ id: string }>();
  const { userProfile } = useAuth();
  const { lessons, loading, error, retry } = useLeadershipLessons();
  const canAccess = getRoleCapabilities(userProfile).canAccessLeadershipDevelopment;
  const lessonIndex = lessons.findIndex((item) => item.id === id);
  const lesson = lessonIndex >= 0 ? lessons[lessonIndex] : null;
  const previous = lessonIndex > 0 ? lessons[lessonIndex - 1] : null;
  const next = lessonIndex >= 0 && lessonIndex < lessons.length - 1 ? lessons[lessonIndex + 1] : null;

  useEffect(() => {
    document.title = lesson
      ? `${lesson.title} | Leadership Development`
      : 'Leadership Development | Sioux Falls Church of Christ';
  }, [lesson]);

  if (!canAccess) return null;

  if (loading) {
    return <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8"><LoadingCardList label="Loading leadership lesson…" count={2} /></div>;
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center">
        <h1 className="text-2xl font-bold text-charcoal">The lesson could not be loaded.</h1>
        <p className="mt-2 text-text-light">{error}</p>
        <button type="button" onClick={retry} className="mt-5 min-h-11 rounded-lg border border-coral-dark px-4 font-semibold text-coral-dark hover:bg-coral/10">Try again</button>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center">
        <h1 className="text-2xl font-bold text-charcoal">Lesson not found</h1>
        <p className="mt-2 text-text-light">This lesson may not be published yet.</p>
        <Link href="/resources/leadership-development" className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-charcoal px-4 font-semibold text-white hover:bg-charcoal-light">Return to the course</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <Link href="/resources/leadership-development" className="inline-flex min-h-11 items-center gap-2 font-semibold text-coral-dark hover:underline">
          <ArrowLeft aria-hidden="true" className="h-4 w-4" /> Course outline
        </Link>

        <header className="mt-3">
          <p className="font-bold uppercase tracking-wide text-coral-dark">Lesson {lessonIndex + 1} of {lessons.length}</p>
          <h1 className="mt-1 text-3xl font-bold text-charcoal sm:text-4xl">{lesson.title}</h1>
          <p className="mt-3 max-w-3xl text-lg leading-8 text-text-light">{lesson.description}</p>
        </header>

        <div className={`mt-8 grid items-start gap-6 lg:gap-10 ${lesson.pdfUrl ? 'lg:grid-cols-[minmax(320px,440px)_minmax(0,1fr)]' : 'justify-center'}`}>
          <div className="mx-auto aspect-[9/16] w-full max-w-[420px] overflow-hidden rounded-2xl bg-black shadow-lg">
            <iframe
              src={youtubeEmbedUrl(lesson.youtubeVideoId)}
              title={`${lesson.title} video`}
              className="h-full w-full border-0"
              loading="lazy"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>

          {lesson.pdfUrl ? <aside className="rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-6" aria-labelledby="lesson-resource-heading">
            <span className="inline-flex rounded-xl bg-coral/15 p-3 text-coral-dark"><FileText aria-hidden="true" className="h-6 w-6" /></span>
            <h2 id="lesson-resource-heading" className="mt-4 text-2xl font-bold text-charcoal">Lesson resource</h2>
            <p className="mt-2 text-text-light">Open the PDF while you watch, or download a copy to keep for later.</p>
            <p className="mt-5 break-words rounded-lg bg-bg p-3 text-sm font-semibold text-charcoal">{lesson.pdfFileName}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <a href={lesson.pdfUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-charcoal px-4 font-semibold text-white hover:bg-charcoal-light">
                Open PDF <ExternalLink aria-hidden="true" className="h-4 w-4" />
              </a>
              <a href={lesson.pdfUrl} download className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border-2 border-charcoal px-4 font-semibold text-charcoal hover:bg-gray-100">
                Download <Download aria-hidden="true" className="h-4 w-4" />
              </a>
            </div>
          </aside> : null}
        </div>

        <nav aria-label="Course lesson navigation" className="mt-10 grid gap-3 sm:grid-cols-2">
          {previous ? (
            <Link href={`/resources/leadership-development/${previous.id}`} className="flex min-h-16 items-center gap-3 rounded-xl border border-border bg-white p-4 font-semibold text-charcoal hover:border-coral/70">
              <ArrowLeft aria-hidden="true" className="h-5 w-5 shrink-0 text-coral-dark" />
              <span><span className="block text-xs uppercase tracking-wide text-text-light">Previous lesson</span>{previous.title}</span>
            </Link>
          ) : <span />}
          {next ? (
            <Link href={`/resources/leadership-development/${next.id}`} className="flex min-h-16 items-center justify-between gap-3 rounded-xl border border-border bg-white p-4 text-right font-semibold text-charcoal hover:border-coral/70 sm:col-start-2">
              <span className="ml-auto"><span className="block text-xs uppercase tracking-wide text-text-light">Next lesson</span>{next.title}</span>
              <ArrowRight aria-hidden="true" className="h-5 w-5 shrink-0 text-coral-dark" />
            </Link>
          ) : null}
        </nav>
      </div>
    </div>
  );
}
