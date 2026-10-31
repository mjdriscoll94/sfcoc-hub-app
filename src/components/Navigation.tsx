'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Dialog } from '@headlessui/react';
import {
  BookOpen,
  CalendarDays,
  ChevronDown,
  ClipboardCheck,
  ExternalLink,
  Files,
  Gift,
  HandHeart,
  Headphones,
  Heart,
  Home,
  LogOut,
  Megaphone,
  Menu,
  PlayCircle,
  Settings,
  ShieldCheck,
  UsersRound,
  X,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { getRoleCapabilities } from '@/types/roles';

const DIRECTORY_URL =
  'https://members.instantchurchdirectory.com/families/7aa8b3f0-5f58-4ef4-a314-9ab636f24cf4';
const SPOTIFY_PODCAST_URL = 'https://open.spotify.com/show/6BUbTQmZOpUZ9KvpOLPtwy';
const APPLE_PODCASTS_URL = 'https://podcasts.apple.com/us/podcast/beyond-sunday/id1838805862';

type NavLink = {
  href: string;
  label: string;
  icon: typeof Home;
  external?: boolean;
  id?: string;
};

const primaryMemberLinks: NavLink[] = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/announcements', label: 'Announcements', icon: Megaphone },
  { href: '/calendar', label: 'Calendar', icon: CalendarDays },
  { href: '/resources', label: 'Bulletin & Notes', icon: Files, id: 'nav-resources' },
  { href: '/prayer-board', label: 'Prayer Board', icon: Heart, id: 'nav-prayer-board' },
  { href: '/life-groups', label: 'Life Groups', icon: UsersRound },
];

const mobilePrimaryLinks: NavLink[] = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/announcements', label: 'Announcements', icon: Megaphone },
  { href: '/calendar', label: 'Calendar', icon: CalendarDays },
  { href: '/resources', label: 'Resources', icon: Files, id: 'nav-resources-mobile' },
];

function isActivePath(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

function MemberLink({ item, onClick, compact = false }: { item: NavLink; onClick?: () => void; compact?: boolean }) {
  const pathname = usePathname();
  const Icon = item.icon;
  const active = isActivePath(pathname, item.href);

  return (
    <Link
      id={item.id}
      href={item.href}
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={compact
        ? `flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-base font-medium focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary ${
            active ? 'bg-coral/15 text-charcoal' : 'text-charcoal hover:bg-gray-100'
          }`
        : `inline-flex min-h-16 items-center gap-2 border-b-3 px-1 text-sm font-semibold focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-[-3px] focus-visible:outline-white ${
            active ? 'border-charcoal text-charcoal' : 'border-transparent text-charcoal hover:border-charcoal/40'
          }`}
    >
      <Icon aria-hidden="true" className="h-5 w-5 shrink-0" />
      <span>{item.label}</span>
    </Link>
  );
}

function ExternalMenuLink({ item, onClick }: { item: NavLink; onClick: () => void }) {
  const Icon = item.icon;
  return (
    <a
      href={item.href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
      className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-base font-medium text-charcoal hover:bg-gray-100 focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <Icon aria-hidden="true" className="h-5 w-5 shrink-0" />
      <span className="flex-1">{item.label}</span>
      <ExternalLink aria-hidden="true" className="h-4 w-4 text-text-light" />
    </a>
  );
}

export default function Navigation() {
  const pathname = usePathname();
  const { user, userProfile, signOut } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const [podcastOpen, setPodcastOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const resourcesRef = useRef<HTMLDivElement>(null);
  const { canAccessManageChurch, canManageAttendance } = getRoleCapabilities(userProfile);

  useEffect(() => {
    setMoreOpen(false);
    setResourcesOpen(false);
  }, [pathname]);

  useEffect(() => {
    const closeMobileMenu = () => setMoreOpen(false);
    window.addEventListener('sfcoc-close-mobile-menu', closeMobileMenu);
    return () => window.removeEventListener('sfcoc-close-mobile-menu', closeMobileMenu);
  }, []);

  useEffect(() => {
    const closeResources = (event: MouseEvent) => {
      if (resourcesRef.current && !resourcesRef.current.contains(event.target as Node)) {
        setResourcesOpen(false);
      }
    };
    document.addEventListener('mousedown', closeResources);
    return () => document.removeEventListener('mousedown', closeResources);
  }, []);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      setSigningOut(false);
    }
  }

  const closeMore = () => setMoreOpen(false);
  const memberInformation: NavLink[] = [
    { href: '/prayer-board', label: 'Prayer Board', icon: Heart, id: 'nav-prayer-board-menu' },
    { href: '/life-groups', label: 'Life Groups', icon: UsersRound },
    { href: DIRECTORY_URL, label: 'Member Directory', icon: BookOpen, external: true },
  ];
  const participate: NavLink[] = [
    { href: '/volunteer', label: 'Volunteer Opportunities', icon: HandHeart },
    { href: '/service-roles', label: 'Service Roles', icon: ClipboardCheck },
  ];
  const churchResources: NavLink[] = [
    { href: '/sermons', label: 'Sermons', icon: PlayCircle },
    { href: '/give', label: 'Giving', icon: Gift },
  ];

  const menuSection = (label: string, items: NavLink[]) => (
    <section aria-labelledby={`menu-${label.toLowerCase().replaceAll(' ', '-')}`} className="space-y-1">
      <h2
        id={`menu-${label.toLowerCase().replaceAll(' ', '-')}`}
        className="px-3 pt-3 text-sm font-bold text-text-light"
      >
        {label}
      </h2>
      {items.map((item) =>
        item.external ? (
          <ExternalMenuLink key={item.label} item={item} onClick={closeMore} />
        ) : (
          <MemberLink key={item.href} item={item} onClick={closeMore} compact />
        )
      )}
    </section>
  );

  return (
    <>
      <nav className="relative z-40 border-b border-charcoal/15 bg-coral" aria-label="Primary navigation" id="navigation">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="flex min-h-11 items-center gap-3 rounded-md font-bold text-charcoal focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <Image src="/images/logo_colored.svg" alt="" width={36} height={36} className="h-9 w-9" />
            <span className="hidden text-sm leading-tight sm:block">
              Sioux Falls<br />Church of Christ
            </span>
            <span className="text-base sm:hidden">Church Hub</span>
          </Link>

          {user ? (
            <>
              <div className="hidden items-stretch gap-4 lg:flex">
                {primaryMemberLinks.map((item) => <MemberLink key={item.href} item={item} />)}
                <button
                  id="nav-connect"
                  type="button"
                  onClick={() => setMoreOpen(true)}
                  className="inline-flex min-h-16 items-center gap-2 border-b-3 border-transparent px-1 text-sm font-semibold text-charcoal hover:border-charcoal/40 focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-[-3px] focus-visible:outline-white"
                >
                  <Menu aria-hidden="true" className="h-5 w-5" />
                  More
                </button>
              </div>
              <button
                id="nav-menu"
                type="button"
                onClick={() => setMoreOpen(true)}
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-charcoal hover:bg-white/20 focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-white lg:hidden"
                aria-label="Open more destinations"
              >
                <Menu aria-hidden="true" className="h-6 w-6" />
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2 sm:gap-5">
              <Link className="hidden min-h-11 items-center px-2 font-semibold text-charcoal sm:inline-flex" href="/">Home</Link>
              <div className="relative hidden sm:block" ref={resourcesRef}>
                <button
                  id="nav-resources"
                  type="button"
                  onClick={() => setResourcesOpen((open) => !open)}
                  aria-expanded={resourcesOpen}
                  className="inline-flex min-h-11 items-center gap-1 rounded-md px-2 font-semibold text-charcoal hover:bg-white/20 focus-visible:outline focus-visible:outline-3 focus-visible:outline-white"
                >
                  Resources
                  <ChevronDown aria-hidden="true" className={`h-4 w-4 ${resourcesOpen ? 'rotate-180' : ''}`} />
                </button>
                {resourcesOpen ? (
                  <div className="absolute right-0 top-full mt-2 w-64 rounded-xl border border-border bg-white p-2 shadow-lg">
                    <MemberLink item={{ href: '/resources/bulletin', label: 'Bulletins', icon: Files }} compact />
                    <MemberLink item={{ href: '/resources/lesson-notes', label: 'Lesson Notes', icon: BookOpen }} compact />
                    <MemberLink item={{ href: '/sermons', label: 'Sermons', icon: PlayCircle }} compact />
                    <button
                      type="button"
                      onClick={() => { setPodcastOpen(true); setResourcesOpen(false); }}
                      className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-base font-medium text-charcoal hover:bg-gray-100"
                    >
                      <Headphones aria-hidden="true" className="h-5 w-5" />
                      Podcast
                    </button>
                  </div>
                ) : null}
              </div>
              <Link className="hidden min-h-11 items-center px-2 font-semibold text-charcoal sm:inline-flex" href="/give">Give</Link>
              <Link
                href="/auth/signin"
                className="inline-flex min-h-11 items-center rounded-lg bg-charcoal px-4 font-semibold text-white hover:bg-charcoal-light focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Sign in
              </Link>
              <button
                type="button"
                onClick={() => setMoreOpen(true)}
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-charcoal hover:bg-white/20 focus-visible:outline focus-visible:outline-3 focus-visible:outline-white sm:hidden"
                aria-label="Open navigation menu"
              >
                <Menu aria-hidden="true" className="h-6 w-6" />
              </button>
            </div>
          )}
        </div>
      </nav>

      {user ? (
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-white/95 px-1 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgba(47,62,70,0.12)] backdrop-blur lg:hidden" aria-label="Member navigation">
          <div className="mx-auto grid max-w-lg grid-cols-5">
            {mobilePrimaryLinks.map((item) => {
              const Icon = item.icon;
              const active = isActivePath(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  id={item.id}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={`flex min-h-16 flex-col items-center justify-center gap-1 rounded-md px-1 text-[11px] font-semibold focus-visible:outline focus-visible:outline-3 focus-visible:outline-inset focus-visible:outline-primary ${active ? 'text-coral-dark' : 'text-charcoal'}`}
                >
                  <Icon aria-hidden="true" className="h-5 w-5" />
                  <span className="max-w-full truncate">{item.label}</span>
                </Link>
              );
            })}
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-md px-1 text-[11px] font-semibold text-charcoal focus-visible:outline focus-visible:outline-3 focus-visible:outline-inset focus-visible:outline-primary"
            >
              <Menu aria-hidden="true" className="h-5 w-5" />
              <span>More</span>
            </button>
          </div>
        </nav>
      ) : null}

      <Dialog open={moreOpen} onClose={setMoreOpen} className="relative z-[70]">
        <div className="fixed inset-0 bg-charcoal/50" aria-hidden="true" />
        <div className="fixed inset-0 flex justify-end">
          <Dialog.Panel className="h-full w-full max-w-sm overflow-y-auto bg-white p-4 shadow-xl">
            <div className="flex min-h-12 items-center justify-between border-b border-border pb-3">
              <div>
                <Dialog.Title className="text-xl font-bold text-charcoal">{user ? 'More' : 'Menu'}</Dialog.Title>
                {userProfile?.displayName ? <p className="text-sm text-text-light">Signed in as {userProfile.displayName}</p> : null}
              </div>
              <button
                type="button"
                onClick={closeMore}
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg hover:bg-gray-100 focus-visible:outline focus-visible:outline-3 focus-visible:outline-primary"
                aria-label="Close menu"
              >
                <X aria-hidden="true" className="h-6 w-6" />
              </button>
            </div>

            {user ? (
              <div className="space-y-3 py-2">
                {menuSection('Member Information', memberInformation)}
                {menuSection('Participate', participate)}
                {menuSection('Church Resources', churchResources)}
                <section aria-labelledby="menu-account" className="space-y-1">
                  <h2 id="menu-account" className="px-3 pt-3 text-sm font-bold text-text-light">Account</h2>
                  <MemberLink item={{ href: '/settings', label: 'Settings', icon: Settings }} onClick={closeMore} compact />
                  <button
                    type="button"
                    disabled={signingOut}
                    onClick={handleSignOut}
                    className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-base font-medium text-charcoal hover:bg-gray-100 disabled:opacity-60"
                  >
                    <LogOut aria-hidden="true" className="h-5 w-5" />
                    {signingOut ? 'Signing out…' : 'Sign out'}
                  </button>
                </section>
                {canAccessManageChurch || canManageAttendance ? (
                  <section aria-labelledby="menu-staff" className="space-y-1">
                    <h2 id="menu-staff" className="px-3 pt-3 text-sm font-bold text-text-light">Staff</h2>
                    {canAccessManageChurch ? <MemberLink item={{ href: '/admin', label: 'Manage Church', icon: ShieldCheck }} onClick={closeMore} compact /> : null}
                    {canManageAttendance ? <MemberLink item={{ href: '/admin/attendance', label: 'Attendance', icon: ClipboardCheck }} onClick={closeMore} compact /> : null}
                  </section>
                ) : null}
              </div>
            ) : (
              <div className="space-y-1 py-4">
                <MemberLink item={{ href: '/', label: 'Home', icon: Home }} onClick={closeMore} compact />
                <MemberLink item={{ href: '/resources/bulletin', label: 'Bulletins', icon: Files }} onClick={closeMore} compact />
                <MemberLink item={{ href: '/resources/lesson-notes', label: 'Lesson Notes', icon: BookOpen }} onClick={closeMore} compact />
                <MemberLink item={{ href: '/sermons', label: 'Sermons', icon: PlayCircle }} onClick={closeMore} compact />
                <button
                  type="button"
                  onClick={() => { setMoreOpen(false); setPodcastOpen(true); }}
                  className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-base font-medium text-charcoal hover:bg-gray-100"
                >
                  <Headphones aria-hidden="true" className="h-5 w-5" />
                  Podcast
                </button>
                <MemberLink item={{ href: '/give', label: 'Give', icon: Gift }} onClick={closeMore} compact />
              </div>
            )}
          </Dialog.Panel>
        </div>
      </Dialog>

      <Dialog open={podcastOpen} onClose={setPodcastOpen} className="relative z-[80]">
        <div className="fixed inset-0 bg-charcoal/50" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Dialog.Title className="text-2xl font-bold text-charcoal">Beyond Sunday Podcast</Dialog.Title>
                <Dialog.Description className="mt-2 text-base text-text-light">
                  Choose where you would like to listen. Each option opens in a new window.
                </Dialog.Description>
              </div>
              <button type="button" onClick={() => setPodcastOpen(false)} className="min-h-11 min-w-11 rounded-lg hover:bg-gray-100" aria-label="Close podcast options">
                <X aria-hidden="true" className="mx-auto h-6 w-6" />
              </button>
            </div>
            <div className="mt-6 grid gap-3">
              <a href={SPOTIFY_PODCAST_URL} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center justify-between rounded-lg bg-charcoal px-4 font-semibold text-white hover:bg-charcoal-light">
                Listen on Spotify <ExternalLink aria-hidden="true" className="h-4 w-4" />
              </a>
              <a href={APPLE_PODCASTS_URL} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center justify-between rounded-lg border-2 border-charcoal px-4 font-semibold text-charcoal hover:bg-gray-100">
                Listen on Apple Podcasts <ExternalLink aria-hidden="true" className="h-4 w-4" />
              </a>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </>
  );
}
