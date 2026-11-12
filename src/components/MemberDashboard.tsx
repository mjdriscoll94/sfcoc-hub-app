'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  ExternalLink,
  FileText,
  Gift,
  HandHeart,
  Headphones,
  Heart,
  Megaphone,
  PlayCircle,
  UsersRound,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { useMemberDashboard } from '@/hooks/useMemberDashboard';
import { useDashboardMedia } from '@/hooks/useDashboardMedia';
import { isOnboardingTourActive, useOnboardingTour, useTourActive } from '@/components/tour';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';

const DIRECTORY_URL =
  'https://members.instantchurchdirectory.com/families/7aa8b3f0-5f58-4ef4-a314-9ab636f24cf4';

function DashboardSection({
  headingId,
  title,
  icon,
  href,
  linkLabel,
  children,
  className = '',
}: {
  headingId: string;
  title: string;
  icon: ReactNode;
  href: string;
  linkLabel: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section aria-labelledby={headingId} className={`rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-6 ${className}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="rounded-lg bg-coral/15 p-2 text-coral-dark">{icon}</span>
          <h3 id={headingId} className="text-xl font-bold text-charcoal sm:text-2xl">{title}</h3>
        </div>
        <Link href={href} className="hidden min-h-11 shrink-0 items-center gap-1 rounded-lg px-2 text-sm font-semibold text-coral-dark hover:bg-coral/10 sm:inline-flex">
          {linkLabel}<ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      </div>
      <div className="mt-4">{children}</div>
      <Link href={href} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg font-semibold text-coral-dark sm:hidden">
        {linkLabel}<ArrowRight aria-hidden="true" className="h-4 w-4" />
      </Link>
    </section>
  );
}

function formatShortDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function DashboardRowsSkeleton({ label, rows = 3 }: { label: string; rows?: number }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">{label}</span>
      <div aria-hidden="true" className="space-y-3">
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} className="rounded-xl bg-bg p-3">
            <LoadingSkeleton className="h-5 w-2/3 rounded-md" />
            <LoadingSkeleton className="mt-2 h-4 w-1/2 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function MemberDashboard() {
  const { userProfile, markOnboardingTourSeen } = useAuth();
  const dashboard = useMemberDashboard();
  const dashboardMedia = useDashboardMedia();
  const startTour = useOnboardingTour();
  const { setTourActive } = useTourActive();
  const router = useRouter();
  const tourRequestHandled = useRef(false);
  const [welcomeDismissed, setWelcomeDismissed] = useState(false);
  const showWelcome = userProfile?.hasSeenOnboardingTour !== true && !welcomeDismissed;
  const firstName = userProfile?.displayName?.trim().split(/\s+/)[0];

  function beginTour() {
    if (isOnboardingTourActive()) return;
    setWelcomeDismissed(true);
    setTourActive(true);
    startTour(() => {
      setTourActive(false);
      markOnboardingTourSeen();
    });
  }

  async function dismissWelcome() {
    setWelcomeDismissed(true);
    await markOnboardingTourSeen();
  }

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('tour') !== '1' || tourRequestHandled.current || isOnboardingTourActive()) return;
    tourRequestHandled.current = true;
    setTourActive(true);
    startTour(() => {
      setTourActive(false);
      router.replace('/');
    });
  }, [router, setTourActive, startTour]);

  return (
    <div className="min-h-screen bg-bg">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <header className="mb-6 flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-charcoal sm:text-4xl">
              {firstName ? `Welcome, ${firstName}` : 'Welcome'}
            </h1>
            <p className="mt-2 max-w-2xl text-base text-text-light sm:text-lg">
              Catch up on church news, upcoming events, and the resources you use most.
            </p>
          </div>
          <Link
            href="/calendar"
            className="inline-flex min-h-11 w-fit shrink-0 items-center gap-2 whitespace-nowrap rounded-lg bg-charcoal px-4 font-semibold text-white hover:bg-charcoal-light"
          >
            <CalendarDays aria-hidden="true" className="h-5 w-5" />
            Open calendar
          </Link>
        </header>

        {showWelcome ? (
          <section className="mb-6 flex flex-col gap-4 rounded-xl bg-charcoal px-5 py-4 text-white sm:flex-row sm:items-center sm:justify-between" aria-labelledby="welcome-tour-heading">
            <div>
              <h2 id="welcome-tour-heading" className="text-lg font-bold">New to the Church Hub?</h2>
              <p className="mt-1 text-sm text-white/85">Take a short tour of announcements, the calendar, resources, and the Prayer Board.</p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <button type="button" onClick={beginTour} className="min-h-11 rounded-lg bg-coral px-4 font-bold text-charcoal hover:bg-coral-light">Take the tour</button>
              <button type="button" onClick={dismissWelcome} className="min-h-11 rounded-lg border border-white/70 px-4 font-bold text-white hover:bg-white hover:text-charcoal">Not now</button>
            </div>
          </section>
        ) : null}

        {dashboard.error ? (
          <div className="mb-6 flex flex-col gap-3 rounded-xl border border-warning/40 bg-warning-bg p-4 text-charcoal sm:flex-row sm:items-center sm:justify-between" role="alert">
            <p>{dashboard.error}</p>
            <button type="button" onClick={dashboard.retry} className="min-h-10 shrink-0 rounded-lg border border-coral px-4 text-sm font-bold text-coral-dark hover:bg-coral/10">
              Try again
            </button>
          </div>
        ) : null}

        <section aria-labelledby="latest-from-church-heading">
          <div className="mb-4">
            <p className="text-sm font-bold uppercase tracking-wide text-coral-dark">Start here</p>
            <h2 id="latest-from-church-heading" className="mt-1 text-2xl font-bold text-charcoal sm:text-3xl">Latest from church</h2>
            <p className="mt-1 text-text-light">Recent announcements and the next events on the church calendar.</p>
          </div>

          <div className="grid gap-6 lg:grid-cols-12">
            <DashboardSection headingId="announcements-heading" title="Latest announcements" icon={<Megaphone aria-hidden="true" className="h-6 w-6" />} href="/announcements" linkLabel="All announcements" className="lg:col-span-7">
              {dashboard.loading ? (
                <DashboardRowsSkeleton label="Loading announcements…" />
              ) : dashboard.announcements.length === 0 ? (
                <p className="text-text-light">No announcements have been posted.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {dashboard.announcements.map((announcement) => (
                    <li key={announcement.id}>
                      <Link href={`/announcements#${announcement.id}`} className="block rounded-lg py-3 hover:bg-bg sm:px-2">
                        <span className="font-bold text-charcoal">{announcement.title}</span>
                        <span className="mt-1 flex flex-wrap gap-x-2 text-sm text-text-light">
                          <span>{announcement.type}</span><span aria-hidden="true">•</span><span>{formatShortDate(announcement.createdAt)}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </DashboardSection>

            <DashboardSection headingId="upcoming-events-heading" title="Coming up" icon={<CalendarDays aria-hidden="true" className="h-6 w-6" />} href="/calendar" linkLabel="Full calendar" className="lg:col-span-5">
              {dashboard.loading ? (
                <DashboardRowsSkeleton label="Loading upcoming events…" />
              ) : dashboard.events.length === 0 ? (
                <p className="text-text-light">No upcoming events are currently listed.</p>
              ) : (
                <ul className="space-y-2">
                  {dashboard.events.map((event) => (
                    <li key={event.id} className="flex gap-3 rounded-xl bg-bg p-3">
                      <time className="w-[4.5rem] shrink-0 rounded-lg bg-white px-2 py-2 text-center font-bold text-coral-dark shadow-sm tabular-nums" dateTime={event.startDate.toISOString()}>
                        <span className="block text-xs uppercase">{event.startDate.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                        <span className="block whitespace-nowrap text-base leading-tight">{event.startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                      </time>
                      <div className="min-w-0 py-1">
                        <p className="font-bold text-charcoal">{event.title}</p>
                        <p className="mt-0.5 text-sm text-text-light">
                          {event.allDay ? 'All day' : event.startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                          {event.location ? ` • ${event.location}` : ''}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </DashboardSection>
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-6" aria-labelledby="weekly-resources-heading">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="rounded-lg bg-coral/15 p-2 text-coral-dark"><FileText aria-hidden="true" className="h-6 w-6" /></span>
              <div>
                <h2 id="weekly-resources-heading" className="text-2xl font-bold text-charcoal">This week’s resources</h2>
                <p className="mt-1 text-sm text-text-light">Open the newest bulletin, lesson notes, sermon, and podcast episode.</p>
              </div>
            </div>
            <Link href="/resources" className="inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-sm font-semibold text-coral-dark hover:bg-coral/10">
              Browse all resources<ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {dashboard.loading ? (
              Array.from({ length: 2 }, (_, index) => (
                <div key={`document-resource-${index}`} role="status" aria-label="Loading document resource" className="min-h-20 rounded-xl bg-bg p-4">
                  <LoadingSkeleton className="h-5 w-32 rounded-md" />
                  <LoadingSkeleton className="mt-2 h-4 w-3/4 rounded-md" />
                </div>
              ))
            ) : (
              <>
                {dashboard.bulletin ? (
                  <a href={dashboard.bulletin.fileUrl} target="_blank" rel="noopener noreferrer" className="flex min-h-20 items-center justify-between gap-4 rounded-xl bg-bg p-4 hover:bg-bg-secondary">
                    <span className="flex min-w-0 items-start gap-3">
                      <FileText aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-coral-dark" />
                      <span className="min-w-0"><strong className="block text-charcoal">Latest bulletin</strong><span className="mt-1 block text-sm text-text-light">{dashboard.bulletin.title} • {formatShortDate(dashboard.bulletin.date)}</span></span>
                    </span>
                    <ExternalLink aria-hidden="true" className="h-5 w-5 shrink-0 text-coral-dark" />
                  </a>
                ) : <p className="rounded-xl bg-bg p-4 text-text-light">No bulletin is currently available.</p>}
                {dashboard.lessonNote ? (
                  <a href={dashboard.lessonNote.fileUrl} target="_blank" rel="noopener noreferrer" className="flex min-h-20 items-center justify-between gap-4 rounded-xl bg-bg p-4 hover:bg-bg-secondary">
                    <span className="flex min-w-0 items-start gap-3">
                      <BookOpen aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-coral-dark" />
                      <span className="min-w-0"><strong className="block text-charcoal">Latest lesson notes</strong><span className="mt-1 block text-sm text-text-light">{dashboard.lessonNote.title} • {formatShortDate(dashboard.lessonNote.date)}</span></span>
                    </span>
                    <ExternalLink aria-hidden="true" className="h-5 w-5 shrink-0 text-coral-dark" />
                  </a>
                ) : <p className="rounded-xl bg-bg p-4 text-text-light">No lesson notes are currently available.</p>}
              </>
            )}

            {dashboardMedia.loading ? (
              Array.from({ length: 2 }, (_, index) => (
                <div key={`media-resource-${index}`} role="status" aria-label="Loading media resource" className="min-h-20 rounded-xl bg-bg p-4">
                  <LoadingSkeleton className="h-5 w-32 rounded-md" />
                  <LoadingSkeleton className="mt-2 h-4 w-3/4 rounded-md" />
                </div>
              ))
            ) : (
              <>
                {dashboardMedia.sermon ? (
                  <a href={dashboardMedia.sermon.url} target="_blank" rel="noopener noreferrer" className="flex min-h-20 items-center justify-between gap-4 rounded-xl bg-bg p-4 hover:bg-bg-secondary">
                    <span className="flex min-w-0 items-start gap-3">
                      <PlayCircle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-coral-dark" />
                      <span className="min-w-0"><strong className="block text-charcoal">Latest sermon</strong><span className="mt-1 block text-sm text-text-light">{dashboardMedia.sermon.title} • {formatShortDate(new Date(dashboardMedia.sermon.publishedAt))}</span></span>
                    </span>
                    <ExternalLink aria-hidden="true" className="h-5 w-5 shrink-0 text-coral-dark" />
                  </a>
                ) : (
                  <Link href="/sermons" className="flex min-h-20 items-center justify-between gap-4 rounded-xl bg-bg p-4 hover:bg-bg-secondary">
                    <span className="flex min-w-0 items-start gap-3">
                      <PlayCircle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-coral-dark" />
                      <span><strong className="block text-charcoal">Latest sermon</strong><span className="mt-1 block text-sm text-text-light">Browse recent sermons.</span></span>
                    </span>
                    <ArrowRight aria-hidden="true" className="h-5 w-5 shrink-0 text-coral-dark" />
                  </Link>
                )}

                <a href={dashboardMedia.podcast?.url ?? dashboardMedia.podcastShowUrl} target="_blank" rel="noopener noreferrer" className="flex min-h-20 items-center justify-between gap-4 rounded-xl bg-bg p-4 hover:bg-bg-secondary">
                  <span className="flex min-w-0 items-start gap-3">
                    <Headphones aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-coral-dark" />
                    <span className="min-w-0"><strong className="block text-charcoal">Latest podcast episode</strong><span className="mt-1 block text-sm text-text-light">{dashboardMedia.podcast ? `${dashboardMedia.podcast.title} • ${formatShortDate(new Date(dashboardMedia.podcast.publishedAt))}` : 'Open Beyond Sunday on Spotify.'}</span></span>
                  </span>
                  <ExternalLink aria-hidden="true" className="h-5 w-5 shrink-0 text-coral-dark" />
                </a>
              </>
            )}
          </div>
        </section>

        <section className="mt-8" aria-labelledby="stay-connected-heading">
          <div className="mb-4">
            <h2 id="stay-connected-heading" className="text-2xl font-bold text-charcoal">Stay connected</h2>
            <p className="mt-1 text-text-light">Protected information for prayer and Life Groups.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <DashboardSection headingId="prayer-board-heading" title="Prayer Board" icon={<Heart aria-hidden="true" className="h-6 w-6" />} href="/prayer-board" linkLabel="Open Prayer Board">
              {dashboard.loading ? (
                <div role="status" aria-live="polite" aria-busy="true">
                  <span className="sr-only">Checking Prayer Board activity…</span>
                  <LoadingSkeleton className="h-8 w-36 rounded-md" />
                </div>
              ) : (
                <p className="text-text-light"><strong className="text-2xl text-charcoal tabular-nums" data-numeric>{dashboard.prayerCount}</strong> active prayer and praise {dashboard.prayerCount === 1 ? 'post' : 'posts'}. Details stay protected.</p>
              )}
            </DashboardSection>

            <DashboardSection headingId="life-groups-heading" title="Life Groups" icon={<UsersRound aria-hidden="true" className="h-6 w-6" />} href="/life-groups" linkLabel="Open Life Groups">
              <p className="text-text-light">Find meeting details, shared resources, and the members of each group.</p>
            </DashboardSection>
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-6" aria-labelledby="quick-links-heading">
          <div>
            <h2 id="quick-links-heading" className="text-2xl font-bold text-charcoal">More member tools</h2>
            <p className="mt-1 text-text-light">Directory, service, sermons, and giving.</p>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <a href={DIRECTORY_URL} target="_blank" rel="noopener noreferrer" className="flex min-h-14 items-center gap-3 rounded-xl bg-bg px-4 font-semibold text-charcoal hover:bg-bg-secondary">
              <BookOpen aria-hidden="true" className="h-5 w-5 shrink-0 text-coral-dark" />Directory<ExternalLink aria-hidden="true" className="ml-auto h-4 w-4" />
            </a>
            <Link href="/volunteer" className="flex min-h-14 items-center gap-3 rounded-xl bg-bg px-4 font-semibold text-charcoal hover:bg-bg-secondary"><HandHeart aria-hidden="true" className="h-5 w-5 shrink-0 text-coral-dark" />Volunteer</Link>
            <Link href="/service-roles" className="flex min-h-14 items-center gap-3 rounded-xl bg-bg px-4 font-semibold text-charcoal hover:bg-bg-secondary"><ClipboardCheck aria-hidden="true" className="h-5 w-5 shrink-0 text-coral-dark" />Service Roles</Link>
            <Link href="/sermons" className="flex min-h-14 items-center gap-3 rounded-xl bg-bg px-4 font-semibold text-charcoal hover:bg-bg-secondary"><PlayCircle aria-hidden="true" className="h-5 w-5 shrink-0 text-coral-dark" />Sermons</Link>
            <Link href="/give" className="flex min-h-14 items-center gap-3 rounded-xl bg-bg px-4 font-semibold text-charcoal hover:bg-bg-secondary"><Gift aria-hidden="true" className="h-5 w-5 shrink-0 text-coral-dark" />Giving</Link>
          </div>
        </section>
      </div>
    </div>
  );
}
