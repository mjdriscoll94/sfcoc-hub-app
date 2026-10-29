'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, limit, orderBy, query, Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import { ChevronDown, Mail } from 'lucide-react';
import AttendanceTabs from '@/components/AttendanceTabs';
import BackButton from '@/components/BackButton';
import { useAuth } from '@/lib/auth/AuthContext';
import { db } from '@/lib/firebase/config';
import { canManageAttendance } from '@/types/roles';

interface ReportHistoryItem {
  householdName: string;
  labels: string[];
  category?: string;
  recentCounts?: number[];
}

interface AttendanceEmailHistory {
  id: string;
  reportType: 'attendance' | 'visitor';
  subject: string;
  recipients: string[];
  items: ReportHistoryItem[];
  status: 'sending' | 'sent' | 'failed';
  requestedAt?: Date;
  sentAt?: Date;
  sentByEmail?: string;
}

const ATTENDANCE_CATEGORIES = ['Consistently Gone', 'Increasingly Missing', 'Recently Missing'];

export default function AttendanceReportHistoryPage() {
  const { userProfile } = useAuth();
  const router = useRouter();
  const [reports, setReports] = useState<AttendanceEmailHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Attendance Report History | Sioux Falls Church of Christ';
  }, []);

  useEffect(() => {
    if (userProfile && !canManageAttendance(userProfile)) router.push('/');
  }, [router, userProfile]);

  useEffect(() => {
    if (!userProfile || !canManageAttendance(userProfile)) return;

    const loadReports = async () => {
      try {
        setLoading(true);
        setError(null);
        const snapshot = await getDocs(query(
          collection(db, 'attendanceEmailHistory'),
          orderBy('requestedAt', 'desc'),
          limit(100),
        ));
        setReports(snapshot.docs.map((reportDoc) => {
          const data = reportDoc.data();
          return {
            id: reportDoc.id,
            reportType: data.reportType === 'visitor' ? 'visitor' : 'attendance',
            subject: data.subject || 'Attendance report',
            recipients: Array.isArray(data.recipients) ? data.recipients : [],
            items: Array.isArray(data.items) ? data.items : [],
            status: data.status || 'sent',
            requestedAt: data.requestedAt instanceof Timestamp ? data.requestedAt.toDate() : undefined,
            sentAt: data.sentAt instanceof Timestamp ? data.sentAt.toDate() : undefined,
            sentByEmail: data.sentByEmail || '',
          };
        }));
      } catch (loadError) {
        console.error('Error loading attendance report history:', loadError);
        setError('Failed to load attendance report history.');
      } finally {
        setLoading(false);
      }
    };

    loadReports();
  }, [userProfile]);

  if (!userProfile || !canManageAttendance(userProfile)) return null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center">
        <BackButton className="mr-4" />
        <h1 className="text-3xl font-bold text-charcoal">Attendance</h1>
      </div>

      <AttendanceTabs activeTab="reports" />

      <div className="mb-6">
        <h2 className="text-2xl font-bold text-charcoal">Report History</h2>
        <p className="mt-2 text-sm text-text-light">
          Snapshots of attendance and visitor reports, including recipients and everyone listed when each email was sent.
        </p>
      </div>

      {error ? (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : null}

      {loading ? (
        <div className="rounded-xl border border-border bg-white p-8 text-center text-sm text-text-light shadow-sm">Loading report history...</div>
      ) : reports.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-white p-8 text-center text-sm text-text-light">
          No attendance reports have been sent yet.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm divide-y divide-border">
          {reports.map((report) => {
            const categories = report.reportType === 'attendance'
              ? ATTENDANCE_CATEGORIES.map((category) => ({
                  category,
                  items: report.items.filter((item) => item.category === category),
                })).filter((group) => group.items.length > 0)
              : [{ category: 'Recurring Visitors', items: report.items }];
            const reportDate = report.sentAt || report.requestedAt;

            return (
              <details key={report.id} className="group">
                <summary className="grid cursor-pointer list-none grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-3 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-coral [&::-webkit-details-marker]:hidden sm:grid-cols-[auto_minmax(0,1fr)_auto_auto_auto]">
                  <Mail className="h-4 w-4 text-coral" aria-hidden="true" />
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-charcoal">{report.subject}</h3>
                    <p className="truncate text-xs text-text-light">
                      {reportDate ? format(reportDate, "MMM d, yyyy 'at' h:mm a") : 'Date unavailable'}
                      {report.sentByEmail ? ` · ${report.sentByEmail}` : ''}
                    </p>
                  </div>
                  <span className="hidden whitespace-nowrap text-xs text-text-light sm:block">
                    {report.recipients.length} recipient{report.recipients.length === 1 ? '' : 's'}
                  </span>
                  <span className="hidden whitespace-nowrap text-xs text-text-light sm:block">
                    {report.items.length} household{report.items.length === 1 ? '' : 's'}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      report.status === 'sent'
                        ? 'bg-emerald-100 text-emerald-700'
                        : report.status === 'failed'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-amber-100 text-amber-700'
                    }`}>
                      {report.status === 'sent' ? 'Sent' : report.status === 'failed' ? 'Failed' : 'Sending'}
                    </span>
                    <ChevronDown className="h-4 w-4 text-slate-400 transition-transform group-open:rotate-180" aria-hidden="true" />
                  </div>
                </summary>

                <div className="border-t border-border bg-slate-50/60 px-4 py-4 sm:px-11">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Recipients</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {report.recipients.map((recipient) => (
                        <span key={recipient} className="rounded-full bg-white px-2.5 py-1 text-xs text-slate-700 ring-1 ring-border">{recipient}</span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 lg:grid-cols-3">
                    {categories.map((group) => (
                      <div key={group.category}>
                        <h4 className="mb-2 text-sm font-semibold text-charcoal">{group.category}</h4>
                        <div className="overflow-hidden rounded-md border border-border bg-white divide-y divide-border">
                          {group.items.map((item, index) => (
                            <div key={`${item.householdName}-${index}`} className="px-3 py-2.5">
                              <p className="text-sm font-medium text-charcoal">{item.householdName}</p>
                              <p className="mt-0.5 text-xs text-text-light">{item.labels.join(', ')}</p>
                              {item.recentCounts?.length ? (
                                <p className="mt-1 text-xs text-slate-600">
                                  Newest → oldest: <strong>{item.recentCounts.join(' | ')}</strong>
                                </p>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </details>
            );
          })}
        </div>
      )}
    </div>
  );
}
