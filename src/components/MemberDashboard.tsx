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
  Heart,
  Megaphone,
  PlayCircle,
  UsersRound,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { useMemberDashboard } from '@/hooks/useMemberDashboard';
import { useBulletins } from '@/hooks/useBulletins';
import { useLessonNotes } from '@/hooks/useLessonNotes';
import { usePrayerPraise } from '@/hooks/usePrayerPraise';
import { isOnboardingTourActive, useOnboardingTour, useTourActive } from '@/components/tour';

const DIRECTORY_URL =
  'https://members.instantchurchdirectory.com/families/7aa8b3f0-5f58-4ef4-a314-9ab636f24cf4';

function DashboardSection({
  title,
  icon,
  href,
  linkLabel,
  children,
}: {
  title: string;
  icon: ReactNode;
  href: string;
  linkLabel: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="rounded-lg bg-coral/15 p-2 text-coral-dark">{icon}</span>
          <h2 className="text-2xl font-bold text-charcoal">{title}</h2>
        </div>
        <Link href={href} className="hidden min-h-11 items-center gap-1 rounded-lg px-2 font-semibold text-coral-dark hover:bg-coral/10 sm:inline-flex">
          {linkLabel}<ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      </div>
      <div className="mt-5">{children}</div>
      <Link href={href} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg font-semibold text-coral-dark sm:hidden">
        {linkLabel}<ArrowRight aria-hidden="true" className="h-4 w-4" />
      </Link>
    </section>
  );
}

function formatShortDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function MemberDashboard() {
  const { userProfile, markOnboardingTourSeen } = useAuth();
  const dashboard = useMemberDashboard();
  const { bulletins, loading: bulletinsLoading } = useBulletins();
  const { notes, loading: notesLoading } = useLessonNotes();
  const { items: prayerItems, loading: prayersLoading } = usePrayerPraise();
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
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <header className="mb-8">
          <p className="text-base font-semibold text-coral-dark">Member home</p>
          <h1 className="mt-1 text-3xl font-bold text-charcoal sm:text-4xl">
            {firstName ? `Welcome, ${firstName}` : 'Welcome'}
          </h1>
          <p className="mt-2 max-w-2xl text-lg text-text-light">Here is the latest information from your church family.</p>
        </header>

        {showWelcome ? (
          <section className="mb-8 rounded-2xl bg-charcoal p-6 text-white" aria-labelledby="welcome-tour-heading">
            <h2 id="welcome-tour-heading" className="text-2xl font-bold">Would you like a quick tour?</h2>
            <p className="mt-2 max-w-2xl text-white/85">See where to find announcements, the calendar, resources, and the Prayer Board.</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <button type="button" onClick={beginTour} className="min-h-12 rounded-lg bg-coral px-5 font-bold text-charcoal hover:bg-coral-light">Take a quick tour</button>
              <button type="button" onClick={dismissWelcome} className="min-h-12 rounded-lg border-2 border-white px-5 font-bold text-white hover:bg-white hover:text-charcoal">Not now</button>
            </div>
          </section>
        ) : null}

        {dashboard.error ? (
          <div className="mb-6 rounded-xl border border-warning/40 bg-warning-bg p-4 text-charcoal" role="status">
            {dashboard.error}
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-2">
          <DashboardSection title="Announcements" icon={<Megaphone aria-hidden="true" className="h-6 w-6" />} href="/announcements" linkLabel="View all">
            {dashboard.loading ? (
              <p className="text-text-light" role="status">Loading announcements…</p>
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

          <DashboardSection title="Upcoming events" icon={<CalendarDays aria-hidden="true" className="h-6 w-6" />} href="/calendar" linkLabel="View full calendar">
            {dashboard.loading ? (
              <p className="text-text-light" role="status">Loading upcoming events…</p>
            ) : dashboard.events.length === 0 ? (
              <p className="text-text-light">No upcoming events are currently listed.</p>
            ) : (
              <ul className="space-y-3">
                {dashboard.events.map((event) => (
                  <li key={event.id} className="flex gap-4 rounded-xl bg-bg p-3">
                    <time className="w-14 shrink-0 text-center font-bold text-coral-dark" dateTime={event.startDate.toISOString()}>
                      <span className="block text-sm">{event.startDate.toLocaleDateString('en-US', { month: 'short' })}</span>
                      <span className="block text-2xl leading-none">{event.startDate.getDate()}</span>
                    </time>
                    <div>
                      <p className="font-bold text-charcoal">{event.title}</p>
                      <p className="text-sm text-text-light">
                        {event.allDay ? 'All day' : event.startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        {event.location ? ` • ${event.location}` : ''}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </DashboardSection>

          <DashboardSection title="Bulletin & lesson notes" icon={<FileText aria-hidden="true" className="h-6 w-6" />} href="/resources" linkLabel="View resources">
            {bulletinsLoading || notesLoading ? (
              <p className="text-text-light" role="status">Loading the latest resources…</p>
            ) : (
              <div className="grid gap-3">
                {bulletins[0] ? (
                  <a href={bulletins[0].fileUrl} target="_blank" rel="noopener noreferrer" className="flex min-h-14 items-center justify-between gap-4 rounded-xl bg-bg p-3 hover:bg-bg-secondary">
                    <span><strong className="block text-charcoal">Latest bulletin</strong><span className="text-sm text-text-light">{bulletins[0].title} • {formatShortDate(bulletins[0].date)}</span></span>
                    <ExternalLink aria-hidden="true" className="h-5 w-5 shrink-0 text-coral-dark" />
                  </a>
                ) : <p className="text-text-light">No bulletin is currently available.</p>}
                {notes[0] ? (
                  <a href={notes[0].fileUrl} target="_blank" rel="noopener noreferrer" className="flex min-h-14 items-center justify-between gap-4 rounded-xl bg-bg p-3 hover:bg-bg-secondary">
                    <span><strong className="block text-charcoal">Latest lesson notes</strong><span className="text-sm text-text-light">{notes[0].title} • {formatShortDate(notes[0].date)}</span></span>
                    <ExternalLink aria-hidden="true" className="h-5 w-5 shrink-0 text-coral-dark" />
                  </a>
                ) : <p className="text-text-light">No lesson notes are currently available.</p>}
              </div>
            )}
          </DashboardSection>

          <DashboardSection title="Prayer Board" icon={<Heart aria-hidden="true" className="h-6 w-6" />} href="/prayer-board" linkLabel="View Prayer Board">
            {prayersLoading ? (
              <p className="text-text-light" role="status">Checking Prayer Board activity…</p>
            ) : (
              <div className="rounded-xl bg-bg p-4">
                <p className="text-3xl font-bold text-charcoal">{prayerItems.length}</p>
                <p className="mt-1 text-text-light">active prayer and praise {prayerItems.length === 1 ? 'post' : 'posts'}</p>
                <p className="mt-3 text-sm text-text-light">Details stay on the protected Prayer Board.</p>
              </div>
            )}
          </DashboardSection>

          <DashboardSection title="Life Groups" icon={<UsersRound aria-hidden="true" className="h-6 w-6" />} href="/life-groups" linkLabel="View Life Groups">
            <div className="rounded-xl bg-bg p-4">
              <p className="font-bold text-charcoal">Your Life Group information</p>
              <p className="mt-2 text-text-light">View meeting details, group resources, and the other members of your group.</p>
            </div>
          </DashboardSection>

          <section className="rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-6" aria-labelledby="quick-links-heading">
            <h2 id="quick-links-heading" className="text-2xl font-bold text-charcoal">More member tools</h2>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <a href={DIRECTORY_URL} target="_blank" rel="noopener noreferrer" className="flex min-h-12 items-center gap-3 rounded-lg bg-bg px-3 font-semibold text-charcoal hover:bg-bg-secondary">
                <BookOpen aria-hidden="true" className="h-5 w-5 text-coral-dark" />Member Directory<ExternalLink aria-hidden="true" className="ml-auto h-4 w-4" />
              </a>
              <Link href="/volunteer" className="flex min-h-12 items-center gap-3 rounded-lg bg-bg px-3 font-semibold text-charcoal hover:bg-bg-secondary"><HandHeart aria-hidden="true" className="h-5 w-5 text-coral-dark" />Volunteer</Link>
              <Link href="/service-roles" className="flex min-h-12 items-center gap-3 rounded-lg bg-bg px-3 font-semibold text-charcoal hover:bg-bg-secondary"><ClipboardCheck aria-hidden="true" className="h-5 w-5 text-coral-dark" />Service Roles</Link>
              <Link href="/sermons" className="flex min-h-12 items-center gap-3 rounded-lg bg-bg px-3 font-semibold text-charcoal hover:bg-bg-secondary"><PlayCircle aria-hidden="true" className="h-5 w-5 text-coral-dark" />Sermons</Link>
              <Link href="/give" className="flex min-h-12 items-center gap-3 rounded-lg bg-bg px-3 font-semibold text-charcoal hover:bg-bg-secondary"><Gift aria-hidden="true" className="h-5 w-5 text-coral-dark" />Giving</Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
