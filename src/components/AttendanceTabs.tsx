'use client';

import Link from 'next/link';
import { Upload } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';

type AttendanceTab = 'entry' | 'history' | 'members';

const tabs: Array<{ id: AttendanceTab; label: string; href: string }> = [
  { id: 'entry', label: 'Attendance Entry', href: '/admin/attendance' },
  { id: 'history', label: 'History', href: '/admin/attendance/history' },
  { id: 'members', label: 'Members, Events & Households', href: '/admin/attendance/members' },
];

export default function AttendanceTabs({ activeTab }: { activeTab: AttendanceTab }) {
  const { userProfile } = useAuth();

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-border">
      <nav className="flex flex-wrap gap-1" aria-label="Attendance sections">
        {tabs.map((tab) => (
          <Link
            key={tab.id}
            href={tab.href}
            aria-current={activeTab === tab.id ? 'page' : undefined}
            className={`border-b-2 px-4 py-2 text-sm font-medium transition ${
              activeTab === tab.id
                ? 'border-coral text-coral'
                : 'border-transparent text-text-light hover:border-border hover:text-charcoal'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
      {userProfile?.isAdmin ? (
        <Link
          href="/admin/attendance/import"
          className="mb-2 inline-flex items-center rounded-md border border-border px-3 py-1.5 text-sm font-medium text-charcoal transition hover:border-coral hover:text-coral"
        >
          <Upload className="mr-1.5 h-4 w-4" />
          Mass Import
        </Link>
      ) : null}
    </div>
  );
}
