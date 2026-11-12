'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Download, ExternalLink, FileText, GraduationCap, Headphones, Search } from 'lucide-react';
import { useBulletins, type Bulletin } from '@/hooks/useBulletins';
import { useLessonNotes, type LessonNote } from '@/hooks/useLessonNotes';
import { LoadingCardList } from '@/components/LoadingSkeleton';
import { useAuth } from '@/lib/auth/AuthContext';
import { getRoleCapabilities } from '@/types/roles';

type ResourceTab = 'bulletins' | 'lesson-notes';
type ResourceDocument = Pick<Bulletin | LessonNote, 'id' | 'title' | 'date' | 'fileUrl'>;

const SPOTIFY_PODCAST_URL = 'https://open.spotify.com/show/6BUbTQmZOpUZ9KvpOLPtwy';
const APPLE_PODCASTS_URL = 'https://podcasts.apple.com/us/podcast/beyond-sunday/id1838805862';

function ResourceList({ documents, label }: { documents: ResourceDocument[]; label: string }) {
  if (documents.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-white p-8 text-center">
        <FileText aria-hidden="true" className="mx-auto h-10 w-10 text-text-muted" />
        <p className="mt-3 text-lg font-semibold text-charcoal">No matching {label.toLowerCase()}</p>
        <p className="mt-1 text-text-light">Try a different search or year.</p>
      </div>
    );
  }

  return (
    <ul className="grid gap-3">
      {documents.map((document) => (
        <li key={document.id} className="rounded-xl border border-border bg-white p-4 shadow-sm sm:flex sm:items-center sm:justify-between sm:gap-5">
          <div className="flex items-start gap-3">
            <span className="rounded-lg bg-coral/15 p-2 text-coral-dark"><FileText aria-hidden="true" className="h-5 w-5" /></span>
            <div>
              <h2 className="text-lg font-bold text-charcoal">{document.title}</h2>
              <p className="mt-1 text-sm text-text-light tabular-nums">
                {document.date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
          </div>
          <a
            href={document.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-charcoal px-4 font-semibold text-white hover:bg-charcoal-light sm:mt-0 sm:w-auto"
          >
            <Download aria-hidden="true" className="h-4 w-4" />
            Download PDF
          </a>
        </li>
      ))}
    </ul>
  );
}

export default function ResourcesPage() {
  const { userProfile } = useAuth();
  const canAccessLeadership = getRoleCapabilities(userProfile).canAccessLeadershipDevelopment;
  const { bulletins, loading: bulletinsLoading, error: bulletinsError } = useBulletins();
  const { notes, loading: notesLoading, error: notesError } = useLessonNotes();
  const [activeTab, setActiveTab] = useState<ResourceTab>('bulletins');
  const [search, setSearch] = useState('');
  const [year, setYear] = useState('all');

  useEffect(() => {
    document.title = 'Resources | Sioux Falls Church of Christ';
  }, []);

  const years = useMemo(
    () => Array.from(new Set([...bulletins, ...notes].map((item) => item.date.getFullYear())))
      .sort((a, b) => b - a),
    [bulletins, notes]
  );
  const activeDocuments: ResourceDocument[] = activeTab === 'bulletins' ? bulletins : notes;
  const filteredDocuments = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return activeDocuments.filter((document) => {
      const matchesSearch = !normalizedSearch || document.title.toLowerCase().includes(normalizedSearch);
      const matchesYear = year === 'all' || document.date.getFullYear() === Number(year);
      return matchesSearch && matchesYear;
    });
  }, [activeDocuments, search, year]);

  const loading = bulletinsLoading || notesLoading;
  const error = bulletinsError || notesError;

  return (
    <div className="min-h-screen bg-bg">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <header>
          <p className="font-semibold text-coral-dark">Church resources</p>
          <h1 className="mt-1 text-3xl font-bold text-charcoal sm:text-4xl">Resources</h1>
          <p className="mt-3 max-w-2xl text-lg text-text-light">Find the weekly bulletin, lesson notes, podcast, and member development resources.</p>
        </header>

        {canAccessLeadership ? (
          <Link
            href="/resources/leadership-development"
            className="group mt-8 flex items-center gap-4 rounded-2xl border border-border bg-charcoal p-5 text-white shadow-sm transition hover:bg-charcoal-light focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary sm:gap-6 sm:p-6"
          >
            <span className="rounded-xl bg-white/10 p-3 text-coral"><GraduationCap aria-hidden="true" className="h-7 w-7" /></span>
            <span className="min-w-0 flex-1">
              <span className="text-sm font-bold uppercase tracking-wide text-coral">Member course</span>
              <strong className="mt-1 block text-2xl">Leadership Development</strong>
              <span className="mt-2 block text-white/80">Watch each lesson and open its matching PDF resource.</span>
            </span>
            <ArrowRight aria-hidden="true" className="h-6 w-6 shrink-0 text-coral transition group-hover:translate-x-1" />
          </Link>
        ) : null}

        <section className="mt-6 rounded-2xl border border-border bg-white p-5 shadow-sm sm:flex sm:items-center sm:justify-between sm:gap-6 sm:p-6" aria-labelledby="podcast-heading">
          <div className="flex items-start gap-4">
            <span className="rounded-xl bg-coral/15 p-3 text-coral-dark">
              <Headphones aria-hidden="true" className="h-6 w-6" />
            </span>
            <div>
              <p className="text-sm font-bold uppercase tracking-wide text-coral-dark">Podcast</p>
              <h2 id="podcast-heading" className="mt-1 text-2xl font-bold text-charcoal">Beyond Sunday</h2>
              <p className="mt-2 max-w-xl text-text-light">Listen to conversations and lessons that help carry faith into the rest of the week.</p>
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:mt-0 sm:min-w-52">
            <a
              href={SPOTIFY_PODCAST_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center justify-between gap-3 rounded-lg bg-charcoal px-4 font-semibold text-white hover:bg-charcoal-light focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Listen on Spotify
              <ExternalLink aria-hidden="true" className="h-4 w-4 shrink-0" />
            </a>
            <a
              href={APPLE_PODCASTS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center justify-between gap-3 rounded-lg border-2 border-charcoal px-4 font-semibold text-charcoal hover:bg-gray-100 focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Apple Podcasts
              <ExternalLink aria-hidden="true" className="h-4 w-4 shrink-0" />
            </a>
          </div>
        </section>

        <div className="mt-8 border-b border-border" role="tablist" aria-label="Resource type">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'bulletins'}
            onClick={() => setActiveTab('bulletins')}
            className={`min-h-12 border-b-3 px-4 font-bold ${activeTab === 'bulletins' ? 'border-coral-dark text-charcoal' : 'border-transparent text-text-light hover:text-charcoal'}`}
          >
            Bulletins
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'lesson-notes'}
            onClick={() => setActiveTab('lesson-notes')}
            className={`min-h-12 border-b-3 px-4 font-bold ${activeTab === 'lesson-notes' ? 'border-coral-dark text-charcoal' : 'border-transparent text-text-light hover:text-charcoal'}`}
          >
            Lesson Notes
          </button>
        </div>

        <div className="mt-6 grid gap-4 rounded-xl border border-border bg-white p-4 shadow-sm sm:grid-cols-[1fr_180px]">
          <label className="block">
            <span className="mb-2 block font-semibold text-charcoal">Search {activeTab === 'bulletins' ? 'bulletins' : 'lesson notes'}</span>
            <span className="relative block">
              <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-text-muted" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="min-h-12 w-full rounded-lg border border-border bg-bg pl-10 pr-3 text-base text-charcoal"
                placeholder="Search by title"
              />
            </span>
          </label>
          <label className="block">
            <span className="mb-2 block font-semibold text-charcoal">Year</span>
            <select value={year} onChange={(event) => setYear(event.target.value)} className="min-h-12 w-full rounded-lg border border-border bg-bg px-3 text-base text-charcoal">
              <option value="all">All years</option>
              {years.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
        </div>

        <div className="mt-6">
          {loading ? (
            <LoadingCardList label="Loading church resources…" count={3} compact />
          ) : error ? (
            <div className="rounded-xl border border-error/30 bg-error-bg p-6">
              <h2 className="text-lg font-bold text-charcoal">We could not load these resources.</h2>
              <p className="mt-1 text-text-light">Please refresh the page or try again later.</p>
            </div>
          ) : (
            <ResourceList documents={filteredDocuments} label={activeTab === 'bulletins' ? 'Bulletins' : 'Lesson Notes'} />
          )}
        </div>
      </div>
    </div>
  );
}
