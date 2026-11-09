'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BellRing,
  CalendarDays,
  ChevronRight,
  ClipboardCheck,
  FileText,
  Home,
  Mail,
  Megaphone,
  Menu,
  Settings,
  ShieldCheck,
  Upload,
  UserRoundCheck,
  Users,
  UsersRound,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { getRoleCapabilities } from '@/types/roles';

type ManageLink = {
  href: string;
  label: string;
  icon: LucideIcon;
};

type ManageSection = {
  label: string;
  links: ManageLink[];
};

const BREADCRUMB_LABELS: Record<string, string> = {
  '/admin': 'Overview',
  '/admin/users': 'Users',
  '/admin/teachers': 'Teachers',
  '/admin/directory': 'Directory',
  '/admin/households': 'Households',
  '/admin/households/events': 'Member event list',
  '/admin/households/events/import': 'Import member events',
  '/admin/life-groups': 'Life Groups',
  '/admin/life-groups/randomizer': 'Life Group randomizer',
  '/admin/announcements': 'Announcements',
  '/admin/announcements/new': 'New announcement',
  '/admin/send-email': 'Send email',
  '/admin/send-email/lists': 'Email lists',
  '/admin/prayer-requests': 'Prayer requests',
  '/admin/calendar': 'Calendar',
  '/admin/events': 'Recurring home events',
  '/admin/volunteer': 'Volunteer opportunities',
  '/admin/volunteer/new': 'New volunteer opportunity',
  '/admin/attendance': 'Attendance',
  '/admin/attendance/history': 'Attendance history',
  '/admin/attendance/reports': 'Attendance reports',
  '/admin/attendance/import': 'Import attendance',
  '/admin/attendance/contact': 'Attendance follow-up',
  '/admin/bulletin': 'Bulletins',
  '/admin/lesson-notes': 'Lesson Notes',
  '/admin/settings': 'Settings',
};

function ManageNavigation({ sections, pathname }: { sections: ManageSection[]; pathname: string }) {
  return (
    <nav aria-label="Manage Church tools" className="space-y-5">
      <Link
        href="/admin"
        aria-current={pathname === '/admin' ? 'page' : undefined}
        className={`flex min-h-11 items-center gap-3 rounded-lg px-3 font-semibold ${pathname === '/admin' ? 'bg-coral/15 text-charcoal' : 'text-charcoal hover:bg-gray-100'}`}
      >
        <Home aria-hidden="true" className="h-5 w-5 text-coral-dark" />
        Overview
      </Link>
      {sections.map((section) => (
        <section key={section.label} aria-labelledby={`manage-${section.label.toLowerCase()}`}>
          <h2 id={`manage-${section.label.toLowerCase()}`} className="px-3 text-xs font-bold uppercase tracking-wide text-text-light">
            {section.label}
          </h2>
          <div className="mt-1 space-y-1">
            {section.links.map((link) => {
              const Icon = link.icon;
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? 'page' : undefined}
                  onClick={(event) => event.currentTarget.closest('details')?.removeAttribute('open')}
                  className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-semibold ${active ? 'bg-coral/15 text-charcoal' : 'text-charcoal hover:bg-gray-100'}`}
                >
                  <Icon aria-hidden="true" className="h-4 w-4 shrink-0 text-coral-dark" />
                  {link.label}
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </nav>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { userProfile } = useAuth();
  const {
    isAdmin,
    canManageAnnouncements,
    canManageLifeGroups,
    canManageAttendance,
    canManageVolunteerOpportunities: canManageVolunteer,
    canAssignServiceRoles,
    canSendEmail,
  } = getRoleCapabilities(userProfile);

  const sections: ManageSection[] = [
    {
      label: 'People',
      links: [
        ...(isAdmin ? [
          { href: '/admin/users', label: 'Users', icon: Users },
          { href: '/admin/directory', label: 'Directory', icon: UsersRound },
        ] : []),
        ...(canAssignServiceRoles ? [{ href: '/admin/teachers', label: 'Teachers', icon: UserRoundCheck }] : []),
        ...(canManageAttendance ? [{ href: '/admin/households', label: 'Households', icon: UsersRound }] : []),
        ...(canManageLifeGroups ? [{ href: '/admin/life-groups', label: 'Life Groups', icon: Users }] : []),
      ],
    },
    {
      label: 'Communication',
      links: [
        ...(canManageAnnouncements ? [
          { href: '/admin/announcements', label: 'Announcements', icon: Megaphone },
          { href: '/admin/announcements/new', label: 'New announcement', icon: BellRing },
        ] : []),
        ...(canSendEmail ? [
          { href: '/admin/send-email', label: 'Send email', icon: Mail },
          { href: '/admin/send-email/lists', label: 'Email lists', icon: Users },
        ] : []),
        ...(isAdmin ? [{ href: '/admin/prayer-requests', label: 'Prayer requests', icon: FileText }] : []),
      ],
    },
    {
      label: 'Scheduling',
      links: [
        ...(isAdmin || canManageVolunteer || canAssignServiceRoles ? [{ href: '/admin/calendar', label: 'Calendar', icon: CalendarDays }] : []),
        ...(isAdmin ? [{ href: '/admin/events', label: 'Recurring home events', icon: CalendarDays }] : []),
        ...(canAssignServiceRoles ? [{ href: '/service-roles', label: 'Service Roles', icon: ClipboardCheck }] : []),
        ...(canManageVolunteer ? [{ href: '/admin/volunteer', label: 'Volunteer opportunities', icon: UsersRound }] : []),
      ],
    },
    {
      label: 'Attendance',
      links: canManageAttendance ? [
        { href: '/admin/attendance', label: 'Take attendance', icon: ClipboardCheck },
        { href: '/admin/attendance/history', label: 'History', icon: FileText },
        { href: '/admin/attendance/reports', label: 'Reports', icon: FileText },
        ...(isAdmin ? [{ href: '/admin/attendance/import', label: 'Import attendance', icon: Upload }] : []),
        { href: '/admin/attendance/contact', label: 'Follow-up', icon: UserRoundCheck },
        { href: '/admin/households/events', label: 'Member event list', icon: CalendarDays },
      ] : [],
    },
    {
      label: 'Content',
      links: isAdmin ? [
        { href: '/admin/bulletin', label: 'Bulletins', icon: FileText },
        { href: '/admin/lesson-notes', label: 'Lesson Notes', icon: Upload },
      ] : [],
    },
    {
      label: 'System',
      links: isAdmin ? [{ href: '/admin/settings', label: 'Settings', icon: Settings }] : [],
    },
  ].filter((section) => section.links.length > 0);

  const currentLabel = BREADCRUMB_LABELS[pathname] ?? 'Manage Church';

  return (
    <div className="min-h-screen bg-bg">
      <div className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6 lg:grid lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-8 lg:px-8">
        <aside className="hidden lg:block">
          <div className="sticky top-20 max-h-[calc(100vh-6.5rem)] overflow-y-auto rounded-2xl border border-border bg-white p-4 shadow-sm">
            <div className="mb-5 flex items-center gap-3 border-b border-border px-2 pb-4">
              <span className="rounded-lg bg-coral/15 p-2 text-coral-dark"><ShieldCheck aria-hidden="true" className="h-5 w-5" /></span>
              <div>
                <p className="font-bold text-charcoal">Manage Church</p>
                <p className="text-xs text-text-light">Authorized tools</p>
              </div>
            </div>
            <ManageNavigation sections={sections} pathname={pathname} />
          </div>
        </aside>

        <div className="min-w-0">
          <details className="mb-5 rounded-xl border border-border bg-white p-3 shadow-sm lg:hidden">
            <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 rounded-lg px-2 font-bold text-charcoal">
              <Menu aria-hidden="true" className="h-5 w-5 text-coral-dark" />
              Manage Church menu
            </summary>
            <div className="mt-3 border-t border-border pt-4">
              <ManageNavigation sections={sections} pathname={pathname} />
            </div>
          </details>

          <nav aria-label="Breadcrumb" className="px-1 text-sm text-text-light lg:pt-1">
            <ol className="flex flex-wrap items-center gap-1">
              <li><Link href="/admin" className="inline-flex min-h-11 items-center font-semibold text-coral-dark hover:underline">Manage Church</Link></li>
              {pathname !== '/admin' ? (
                <>
                  <li aria-hidden="true"><ChevronRight className="h-4 w-4" /></li>
                  <li aria-current="page" className="font-medium text-charcoal">{currentLabel}</li>
                </>
              ) : null}
            </ol>
          </nav>
          <div className="-mx-4 sm:-mx-6 lg:mx-0">{children}</div>
        </div>
      </div>
    </div>
  );
}
