'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, BookOpen, GraduationCap, PlayCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { getRoleCapabilities } from '@/types/roles';
import { useLeadershipLessons } from '@/hooks/useLeadershipLessons';
import { LoadingCardList } from '@/components/LoadingSkeleton';

export default function LeadershipDevelopmentCoursePage() {
  const { userProfile } = useAuth();
  const { lessons, loading, error, retry } = useLeadershipLessons();
  const canAccess = getRoleCapabilities(userProfile).canAccessLeadershipDevelopment;

  useEffect(() => {
    document.title = 'Leadership Development | Sioux Falls Church of Christ';
  }, []);

  if (!canAccess) return null;

  return (
    <div className="min-h-screen bg-bg">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <nav aria-label="Breadcrumb" className="text-sm font-semibold text-coral-dark">
          <Link href="/resources" className="inline-flex min-h-11 items-center hover:underline">Resources</Link>
          <span aria-hidden="true" className="mx-2 text-text-muted">/</span>
          <span className="text-charcoal">Leadership Development</span>
        </nav>

        <header className="mt-3 rounded-2xl border border-border bg-white p-6 shadow-sm sm:p-8">
          <span className="inline-flex rounded-xl bg-coral/15 p-3 text-coral-dark">
            <GraduationCap aria-hidden="true" className="h-7 w-7" />
          </span>
          <p className="mt-5 font-bold uppercase tracking-wide text-coral-dark">Member course</p>
          <h1 className="mt-1 text-3xl font-bold text-charcoal sm:text-4xl">Leadership Development</h1>
          <p className="mt-3 max-w-2xl text-lg text-text-light">
            Work through these lessons in order. Each lesson includes a short video and may also include a PDF resource.
          </p>
        </header>

        <section className="mt-8" aria-labelledby="course-lessons-heading">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="font-semibold text-coral-dark">Course outline</p>
              <h2 id="course-lessons-heading" className="mt-1 text-2xl font-bold text-charcoal">Lessons</h2>
            </div>
            {!loading && !error ? <p className="text-sm text-text-light">{lessons.length} {lessons.length === 1 ? 'lesson' : 'lessons'}</p> : null}
          </div>

          <div className="mt-5">
            {loading ? (
              <LoadingCardList label="Loading leadership lessons…" count={3} compact />
            ) : error ? (
              <div className="rounded-xl border border-error/30 bg-error-bg p-6 text-center">
                <h3 className="text-lg font-bold text-charcoal">The course could not be loaded.</h3>
                <p className="mt-1 text-text-light">{error}</p>
                <button type="button" onClick={retry} className="mt-4 min-h-11 rounded-lg border border-coral-dark px-4 font-semibold text-coral-dark hover:bg-coral/10">Try again</button>
              </div>
            ) : lessons.length === 0 ? (
              <div className="rounded-xl border border-border bg-white p-8 text-center shadow-sm">
                <BookOpen aria-hidden="true" className="mx-auto h-10 w-10 text-text-muted" />
                <h3 className="mt-3 text-xl font-bold text-charcoal">Lessons are being prepared</h3>
                <p className="mt-2 text-text-light">Please check back soon for the first leadership lesson.</p>
              </div>
            ) : (
              <ol className="grid gap-4">
                {lessons.map((lesson, index) => (
                  <li key={lesson.id}>
                    <Link
                      href={`/resources/leadership-development/${lesson.id}`}
                      className="group flex min-h-28 items-center gap-4 rounded-2xl border border-border bg-white p-4 shadow-sm transition hover:border-coral/70 hover:shadow-md focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary sm:gap-6 sm:p-5"
                    >
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-coral/15 text-lg font-bold tabular-nums text-coral-dark">{index + 1}</span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2 text-sm font-semibold text-text-light"><PlayCircle aria-hidden="true" className="h-4 w-4" /> {lesson.pdfUrl ? 'Video and PDF' : 'Video lesson'}</span>
                        <strong className="mt-1 block text-lg text-charcoal sm:text-xl">{lesson.title}</strong>
                        <span className="mt-1 block text-sm leading-6 text-text-light">{lesson.description}</span>
                      </span>
                      <ArrowRight aria-hidden="true" className="h-5 w-5 shrink-0 text-coral-dark transition group-hover:translate-x-1" />
                    </Link>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
