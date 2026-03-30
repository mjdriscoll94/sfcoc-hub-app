'use client';

import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase/config';
import { toIcsString } from '@/lib/calendar/ics';
import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
  updateDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
} from 'firebase/firestore';
import Link from 'next/link';
import { ROLE_PERMISSIONS, type UserRole } from '@/types/roles';
import { CalendarEvent, CalendarCategory, type RecurrenceType } from '@/lib/firebase/models';
import {
  calendarEventFromFirestore,
  expandAllEvents,
} from '@/lib/calendar/recurrence';
import { ArrowLeft, Download, Link2, ChevronDown, Check, Tags, X, Trash2, Plus } from 'lucide-react';

/** Calendar filter / TeamUp-style palette + legacy swatches so existing categories stay selectable */
const CATEGORY_COLORS: { name: string; value: string }[] = [
  { name: "Children's Events", value: '#C4A35A' },
  { name: 'Church Events', value: '#1B5E3A' },
  { name: "Men's Events", value: '#2563EB' },
  { name: 'Private Events', value: '#0EA5E9' },
  { name: "Teen Events", value: '#DC2626' },
  { name: "Women's Events", value: '#A855F7' },
  { name: 'Worship / Class', value: '#0D9488' },
  { name: 'Young Adult', value: '#4A3728' },
  { name: 'Coral (legacy)', value: '#E88B5F' },
  { name: 'Sage (legacy)', value: '#70A8A0' },
  { name: 'Blue (legacy)', value: '#5F9FE8' },
  { name: 'Green (legacy)', value: '#5FAF8A' },
  { name: 'Purple (legacy)', value: '#8B5FBF' },
  { name: 'Amber (legacy)', value: '#E8A05F' },
  { name: 'Slate (legacy)', value: '#5A6A74' },
  { name: 'Rose (legacy)', value: '#E87A7A' },
];

const DEFAULT_EVENT_COLOR = '#E88B5F';

function categoryColorSelectOptions(currentHex: string): { name: string; value: string }[] {
  if (CATEGORY_COLORS.some((c) => c.value === currentHex)) return CATEGORY_COLORS;
  return [{ name: `Saved color (${currentHex})`, value: currentHex }, ...CATEGORY_COLORS];
}

/** Firestore category id key for events with no category when filtering */
const UNCATEGORIZED_FILTER_KEY = '__uncategorized__';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const MONTH_NAMES_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getDaysInMonth(year: number, month: number) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const days: (number | null)[] = [];
  const startPad = first.getDay();
  for (let i = 0; i < startPad; i++) days.push(null);
  for (let d = 1; d <= last.getDate(); d++) days.push(d);
  return days;
}

function toDateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function getWeekStart(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  date.setDate(date.getDate() - day);
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatEventTime(ev: CalendarEvent): string {
  if (ev.allDay) return 'All day';
  return ev.startDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function eventColor(ev: CalendarEvent): string {
  return ev.categoryColor ?? DEFAULT_EVENT_COLOR;
}

function eventMatchesFilter(ev: CalendarEvent, hiddenKeys: ReadonlySet<string>): boolean {
  const cid = ev.categoryId;
  if (!cid) {
    return !hiddenKeys.has(UNCATEGORIZED_FILTER_KEY);
  }
  return !hiddenKeys.has(cid);
}

/** Firestore document id for an event (series or single), not a virtual instance id */
function firestoreDocIdForEvent(ev: CalendarEvent): string | null {
  if (ev.parentEventId) return ev.parentEventId;
  if (ev.id?.includes('__')) return ev.id.split('__')[0] ?? null;
  return ev.id ?? null;
}

/** Use origin only so NEXT_PUBLIC_BASE_URL values that include a path do not duplicate `/api/calendar/feed`. */
function calendarFeedSiteOrigin(baseUrl: string): string {
  const t = baseUrl.trim();
  if (!t) return '';
  try {
    return new URL(t).origin;
  } catch {
    return t.replace(/\/$/, '');
  }
}

function chunkFirestoreDocs<T>(docs: T[], batchSize: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < docs.length; i += batchSize) {
    out.push(docs.slice(i, i + batchSize));
  }
  return out;
}

async function updateEventsDenormalizedCategory(
  categoryId: string,
  name: string,
  color: string
): Promise<void> {
  const q = query(collection(db, 'calendarEvents'), where('categoryId', '==', categoryId));
  const snap = await getDocs(q);
  const docChunks = chunkFirestoreDocs(snap.docs, 500);
  for (const chunk of docChunks) {
    const batch = writeBatch(db);
    chunk.forEach((d) => {
      batch.update(d.ref, { categoryName: name, categoryColor: color });
    });
    await batch.commit();
  }
}

async function stripCategoryFromEvents(categoryId: string): Promise<void> {
  const q = query(collection(db, 'calendarEvents'), where('categoryId', '==', categoryId));
  const snap = await getDocs(q);
  const docChunks = chunkFirestoreDocs(snap.docs, 500);
  for (const chunk of docChunks) {
    const batch = writeBatch(db);
    chunk.forEach((d) => {
      batch.update(d.ref, {
        categoryId: null,
        categoryName: null,
        categoryColor: null,
      });
    });
    await batch.commit();
  }
}

async function loadEventsForRange(queryStart: Date, queryEnd: Date): Promise<CalendarEvent[]> {
  const q1 = query(
    collection(db, 'calendarEvents'),
    where('startDate', '>=', Timestamp.fromDate(queryStart)),
    where('startDate', '<=', Timestamp.fromDate(queryEnd)),
    orderBy('startDate')
  );
  const q2 = query(
    collection(db, 'calendarEvents'),
    where('hasRecurrence', '==', true),
    where('startDate', '<=', Timestamp.fromDate(queryEnd)),
    orderBy('startDate')
  );
  const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
  const raw: CalendarEvent[] = [];
  const seen = new Set<string>();
  snap1.docs.forEach((docSnap) => {
    seen.add(docSnap.id);
    raw.push(calendarEventFromFirestore(docSnap.id, docSnap.data() as Record<string, unknown>));
  });
  snap2.docs.forEach((docSnap) => {
    if (seen.has(docSnap.id)) return;
    raw.push(calendarEventFromFirestore(docSnap.id, docSnap.data() as Record<string, unknown>));
  });
  return expandAllEvents(raw, queryStart, queryEnd);
}

export default function AdminCalendarPage() {
  const { userProfile } = useAuth();
  const router = useRouter();
  const today = new Date();
  const [viewMode, setViewMode] = useState<'year' | 'month' | 'week'>('year');
  const [focusDate, setFocusDate] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<{ year: number; month: number; day: number } | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [copiedFeed, setCopiedFeed] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const [calendarCategories, setCalendarCategories] = useState<CalendarCategory[]>([]);
  /** Category ids (or UNCATEGORIZED_FILTER_KEY) that are hidden from the calendar view */
  const [hiddenCategoryKeys, setHiddenCategoryKeys] = useState<Set<string>>(() => new Set());
  const [categoriesEditorOpen, setCategoriesEditorOpen] = useState(false);
  /** Bump to reload events after category edit/delete (denormalized fields on events). */
  const [eventsNonce, setEventsNonce] = useState(0);

  const canAccess =
    userProfile?.isAdmin ||
    (userProfile?.role && (
      ROLE_PERMISSIONS[userProfile.role as UserRole]?.canManageVolunteerOpportunities ||
      ROLE_PERMISSIONS[userProfile.role as UserRole]?.canAssignServiceRoles
    ));

  useEffect(() => {
    document.title = 'Admin Calendar | Sioux Falls Church of Christ';
  }, []);

  useEffect(() => {
    if (userProfile && !canAccess) {
      router.push('/');
      return;
    }
  }, [userProfile, canAccess, router]);

  useEffect(() => {
    if (!canAccess) return;
    const unsub = onSnapshot(
      collection(db, 'calendarCategories'),
      (snap) => {
        const list: CalendarCategory[] = [];
        snap.docs.forEach((docSnap) => {
          const d = docSnap.data();
          list.push({
            id: docSnap.id,
            name: d.name ?? '',
            color: d.color ?? DEFAULT_EVENT_COLOR,
          });
        });
        list.sort((a, b) => a.name.localeCompare(b.name));
        setCalendarCategories(list);
      },
      (err) => console.error('Failed to subscribe to calendar categories', err)
    );
    return () => unsub();
  }, [canAccess]);

  useEffect(() => {
    if (!canAccess) return;
    let queryStart: Date;
    let queryEnd: Date;
    const y = focusDate.getFullYear();
    const m = focusDate.getMonth();
    if (viewMode === 'year') {
      queryStart = new Date(y, 0, 1);
      queryEnd = new Date(y, 11, 31, 23, 59, 59);
    } else if (viewMode === 'month') {
      queryStart = new Date(y, m, 1);
      queryEnd = new Date(y, m + 1, 0, 23, 59, 59);
    } else {
      const weekStart = getWeekStart(focusDate);
      queryStart = new Date(weekStart);
      queryEnd = new Date(weekStart);
      queryEnd.setDate(queryEnd.getDate() + 6);
      queryEnd.setHours(23, 59, 59, 999);
    }
    let cancelled = false;
    setLoading(true);
    loadEventsForRange(queryStart, queryEnd)
      .then((list) => {
        if (!cancelled) setEvents(list);
      })
      .catch((err) => console.error('Failed to load calendar events', err))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [viewMode, focusDate, canAccess, eventsNonce]);

  const toggleCategoryFilter = useCallback((key: string) => {
    setHiddenCategoryKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const refetchEvents = useCallback(() => {
    setLoading(true);
    setEventsNonce((n) => n + 1);
  }, []);

  const removeCategoryFromHiddenFilter = useCallback((categoryId: string) => {
    setHiddenCategoryKeys((prev) => {
      if (!prev.has(categoryId)) return prev;
      const next = new Set(prev);
      next.delete(categoryId);
      return next;
    });
  }, []);

  const filteredEvents = useMemo(
    () => events.filter((ev) => eventMatchesFilter(ev, hiddenCategoryKeys)),
    [events, hiddenCategoryKeys]
  );

  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    filteredEvents.forEach((ev) => {
      const d = ev.startDate;
      const key = toDateKey(d.getFullYear(), d.getMonth(), d.getDate());
      if (!map[key]) map[key] = [];
      map[key].push(ev);
    });
    return map;
  }, [filteredEvents]);

  const openModal = (y: number, m: number, d: number) => {
    setSelectedDate({ year: y, month: m, day: d });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedDate(null);
  };

  const onEventAdded = () => {
    const y = focusDate.getFullYear();
    const m = focusDate.getMonth();
    let queryStart: Date;
    let queryEnd: Date;
    if (viewMode === 'year') {
      queryStart = new Date(y, 0, 1);
      queryEnd = new Date(y, 11, 31, 23, 59, 59);
    } else if (viewMode === 'month') {
      queryStart = new Date(y, m, 1);
      queryEnd = new Date(y, m + 1, 0, 23, 59, 59);
    } else {
      const weekStart = getWeekStart(focusDate);
      queryStart = new Date(weekStart);
      queryEnd = new Date(weekStart);
      queryEnd.setDate(queryEnd.getDate() + 6);
      queryEnd.setHours(23, 59, 59, 999);
    }
    setLoading(true);
    loadEventsForRange(queryStart, queryEnd)
      .then(setEvents)
      .catch((err) => console.error('Failed to reload calendar events', err))
      .finally(() => setLoading(false));
    closeModal();
  };

  useEffect(() => {
    if (!exportOpen) return;
    const close = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setExportOpen(false);
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [exportOpen]);

  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ||
    (typeof window !== 'undefined' ? window.location.origin : '');
  const feedUrl = baseUrl
    ? `${calendarFeedSiteOrigin(baseUrl)}/api/calendar/feed`
    : '';

  const handleDownloadIcs = () => {
    const ics = toIcsString(events, 'SFCoC Church Calendar');
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `sfcoc-calendar-${focusDate.getFullYear()}.ics`;
    a.click();
    URL.revokeObjectURL(a.href);
    setExportOpen(false);
  };

  const handleCopyFeedUrl = async () => {
    if (!feedUrl) return;
    try {
      await navigator.clipboard.writeText(feedUrl);
      setCopiedFeed(true);
      setTimeout(() => setCopiedFeed(false), 2000);
    } catch {
      // fallback: select and suggest copy
    }
  };

  if (!canAccess) return null;

  const year = focusDate.getFullYear();
  const months = Array.from({ length: 12 }, (_, i) => ({ year, month: i }));

  const goPrev = () => {
    if (viewMode === 'year') {
      setFocusDate((d) => new Date(d.getFullYear() - 1, 0, 1));
    } else if (viewMode === 'month') {
      setFocusDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
    } else {
      setFocusDate((d) => {
        const next = new Date(d);
        next.setDate(next.getDate() - 7);
        return next;
      });
    }
  };

  const goNext = () => {
    if (viewMode === 'year') {
      setFocusDate((d) => new Date(d.getFullYear() + 1, 0, 1));
    } else if (viewMode === 'month') {
      setFocusDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
    } else {
      setFocusDate((d) => {
        const next = new Date(d);
        next.setDate(next.getDate() + 7);
        return next;
      });
    }
  };

  const viewTitle =
    viewMode === 'year'
      ? `${year}`
      : viewMode === 'month'
        ? `${MONTH_NAMES[focusDate.getMonth()]} ${year}`
        : (() => {
            const ws = getWeekStart(focusDate);
            const we = new Date(ws);
            we.setDate(we.getDate() + 6);
            return `${MONTH_NAMES_SHORT[ws.getMonth()]} ${ws.getDate()} – ${MONTH_NAMES_SHORT[we.getMonth()]} ${we.getDate()}, ${we.getFullYear()}`;
          })();

  return (
    <div className="min-h-screen bg-bg py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <Link
              href="/admin"
              className="inline-flex items-center justify-center p-2 rounded-md text-charcoal hover:text-primary hover:bg-sage/10 focus:outline-none focus:ring-2 focus:ring-primary"
              aria-label="Back to admin"
            >
              <ArrowLeft className="h-6 w-6" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-charcoal">Calendar</h1>
              <p className="text-sm text-text-light mt-1">
                Click a day to add an event. Switch view to see events in detail.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex rounded-lg border border-border bg-card p-0.5">
              {(['year', 'month', 'week'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => {
                    setViewMode(mode);
                    if (mode === 'month') setFocusDate(() => new Date(today.getFullYear(), today.getMonth(), 1));
                    if (mode === 'week') setFocusDate(() => new Date());
                  }}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md capitalize ${viewMode === mode ? 'admin-calendar-btn-coral' : 'text-[var(--charcoal)] hover:bg-[var(--bg-secondary)]'}`}
                >
                  {mode} view
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1 rounded-lg border border-border bg-card px-2 py-1">
              <button
                type="button"
                onClick={goPrev}
                className="p-1.5 text-charcoal hover:bg-bg-secondary rounded focus:outline-none focus:ring-2 focus:ring-primary"
                aria-label="Previous"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="min-w-[140px] text-center text-sm font-medium text-charcoal px-2">
                {viewTitle}
              </span>
              <button
                type="button"
                onClick={goNext}
                className="p-1.5 text-charcoal hover:bg-bg-secondary rounded focus:outline-none focus:ring-2 focus:ring-primary"
                aria-label="Next"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
            <div className="relative" ref={exportRef}>
              <button
                type="button"
                onClick={() => setExportOpen((o) => !o)}
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-charcoal hover:bg-bg-secondary focus:outline-none focus:ring-2 focus:ring-primary"
                aria-expanded={exportOpen}
                aria-haspopup="true"
              >
                <Link2 className="h-4 w-4" />
                Add to calendar
                <ChevronDown className="h-4 w-4" />
              </button>
              {exportOpen && (
                <div className="absolute right-0 top-full z-10 mt-1 w-80 rounded-xl border-2 border-charcoal/15 bg-white py-2 shadow-xl ring-4 ring-black/5">
                  <div className="px-3 pb-2">
                    <p className="text-xs font-medium text-text-light mb-2">Download file</p>
                    <button
                      type="button"
                      onClick={handleDownloadIcs}
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-charcoal hover:bg-bg-secondary"
                    >
                      <Download className="h-4 w-4" />
                      Download .ics file
                    </button>
                    <p className="mt-1 text-xs text-text-muted">Import into Google, Apple, Yahoo, Outlook, or TeamUp.</p>
                  </div>
                  <div className="border-t border-border px-3 pt-2">
                    <p className="text-xs font-medium text-text-light mb-2">Subscribe (stay updated)</p>
                    <div className="flex gap-1">
                      <input
                        type="text"
                        readOnly
                        value={feedUrl}
                        className="flex-1 min-w-0 rounded border border-border bg-bg px-2 py-1.5 text-xs text-charcoal"
                      />
                      <button
                        type="button"
                        onClick={handleCopyFeedUrl}
                        className="flex items-center gap-1 rounded border border-border bg-card px-2 py-1.5 text-xs font-medium text-charcoal hover:bg-bg-secondary"
                      >
                        {copiedFeed ? <Check className="h-3.5 w-3.5" /> : null}
                        {copiedFeed ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                    <ul className="mt-2 space-y-1 text-xs text-text-muted">
                      <li><strong>Google:</strong> Calendar → Add calendar → From URL → paste</li>
                      <li><strong>Apple:</strong> Calendar → File → New Calendar Subscription → paste</li>
                      <li><strong>Yahoo:</strong> Calendar → Add → Subscribe to calendar → paste</li>
                      <li><strong>Outlook:</strong> Add calendar → Subscribe from web → paste</li>
                      <li><strong>TeamUp:</strong> Add calendar → Subscribe (iCal URL) → paste</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setCategoriesEditorOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-charcoal hover:bg-bg-secondary focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <Tags className="h-4 w-4" />
              Edit Categories
            </button>
          </div>
        </div>

        {categoriesEditorOpen && (
          <EditCategoriesModal
            categories={calendarCategories}
            onClose={() => setCategoriesEditorOpen(false)}
            onAfterChange={() => {
              refetchEvents();
            }}
            onCategoryDeleted={(id) => removeCategoryFromHiddenFilter(id)}
          />
        )}

        <div
          className="mb-6 rounded-lg border border-border bg-card px-4 py-3"
          aria-label="Filter events by category"
        >
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-2">
            <span className="text-sm font-medium text-charcoal shrink-0">Category key</span>
            <span className="text-xs text-text-light">Click a category to show or hide its events.</span>
          </div>
          <ul className="flex flex-wrap items-center gap-2 list-none m-0 p-0">
            {calendarCategories.map((c) => {
              const id = c.id ?? '';
              const hidden = id ? hiddenCategoryKeys.has(id) : false;
              const shown = !hidden;
              return (
                <li key={id || c.name}>
                  <button
                    type="button"
                    onClick={() => id && toggleCategoryFilter(id)}
                    disabled={!id}
                    aria-pressed={shown}
                    title={shown ? 'Click to hide these events' : 'Click to show these events'}
                    className={`inline-flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 ${
                      shown
                        ? 'border-transparent bg-bg-secondary/70 text-charcoal hover:bg-bg-secondary'
                        : 'border-border bg-white/80 text-text-light opacity-60 line-through decoration-charcoal/40'
                    }`}
                  >
                    <span
                      className={`h-3.5 w-3.5 shrink-0 rounded-sm border border-charcoal/15 shadow-sm ${shown ? '' : 'grayscale'}`}
                      style={{ backgroundColor: c.color }}
                      aria-hidden
                    />
                    <span>{c.name || 'Untitled'}</span>
                  </button>
                </li>
              );
            })}
            <li>
              <button
                type="button"
                onClick={() => toggleCategoryFilter(UNCATEGORIZED_FILTER_KEY)}
                aria-pressed={!hiddenCategoryKeys.has(UNCATEGORIZED_FILTER_KEY)}
                title={
                  !hiddenCategoryKeys.has(UNCATEGORIZED_FILTER_KEY)
                    ? 'Click to hide events with no category'
                    : 'Click to show events with no category'
                }
                className={`inline-flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 ${
                  !hiddenCategoryKeys.has(UNCATEGORIZED_FILTER_KEY)
                    ? 'border-transparent bg-bg-secondary/70 text-charcoal hover:bg-bg-secondary'
                    : 'border-border bg-white/80 text-text-light opacity-60 line-through decoration-charcoal/40'
                }`}
              >
                <span
                  className={`h-3.5 w-3.5 shrink-0 rounded-sm border border-charcoal/15 shadow-sm ${
                    !hiddenCategoryKeys.has(UNCATEGORIZED_FILTER_KEY) ? '' : 'grayscale'
                  }`}
                  style={{ backgroundColor: DEFAULT_EVENT_COLOR }}
                  aria-hidden
                />
                <span>No category</span>
              </button>
            </li>
          </ul>
        </div>

        {loading && (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        )}

        {!loading && (
          <>
            {viewMode === 'year' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {months.map(({ year: y, month: m }) => (
                  <MonthCard
                    key={`${y}-${m}`}
                    year={y}
                    month={m}
                    eventsByDate={eventsByDate}
                    onDayClick={openModal}
                  />
                ))}
              </div>
            )}
            {viewMode === 'month' && (
              <MonthView
                year={focusDate.getFullYear()}
                month={focusDate.getMonth()}
                eventsByDate={eventsByDate}
                onDayClick={openModal}
              />
            )}
            {viewMode === 'week' && (
              <WeekView
                weekStart={getWeekStart(focusDate)}
                eventsByDate={eventsByDate}
                onDayClick={openModal}
              />
            )}
          </>
        )}

        {modalOpen && selectedDate && (
          <DayModal
            year={selectedDate.year}
            month={selectedDate.month}
            day={selectedDate.day}
            onClose={closeModal}
            onEventAdded={onEventAdded}
            dayEvents={eventsByDate[toDateKey(selectedDate.year, selectedDate.month, selectedDate.day)] ?? []}
          />
        )}
      </div>
    </div>
  );
}

function MonthView({
  year,
  month,
  eventsByDate,
  onDayClick,
}: {
  year: number;
  month: number;
  eventsByDate: Record<string, CalendarEvent[]>;
  onDayClick: (y: number, m: number, d: number) => void;
}) {
  const days = getDaysInMonth(year, month);
  return (
    <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
      <div className="grid grid-cols-7 border-b border-border">
        {DAYS.map((d) => (
          <div key={d} className="py-2 text-center text-sm font-semibold text-charcoal bg-sage/10 border-r border-border">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 auto-rows-fr min-h-[480px]">
        {days.map((d, i) => {
          if (d === null) return <div key={`e-${i}`} className="min-h-[100px] border-b border-border border-r border-border" />;
          const key = toDateKey(year, month, d);
          const dayEvents = eventsByDate[key] ?? [];
          return (
            <button
              key={d}
              type="button"
              onClick={() => onDayClick(year, month, d)}
              className="min-h-[100px] p-2 text-left border-b border-border border-r border-border hover:bg-sage/10 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary"
            >
              <span className="text-sm font-semibold text-charcoal">{d}</span>
              <ul className="mt-1 space-y-0.5 overflow-hidden">
                {dayEvents.slice(0, 3).map((ev) => (
                  <li
                    key={ev.id}
                    className="text-xs text-charcoal truncate rounded px-1 py-0.5"
                    style={{ backgroundColor: `${eventColor(ev)}40`, borderLeft: `3px solid ${eventColor(ev)}` }}
                    title={ev.title}
                  >
                    {ev.title}
                    {!ev.allDay && ev.startDate && (
                      <span className="text-text-light ml-0.5">{ev.startDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
                    )}
                  </li>
                ))}
                {dayEvents.length > 3 && (
                  <li className="text-xs text-text-light">+{dayEvents.length - 3} more</li>
                )}
              </ul>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function WeekView({
  weekStart,
  eventsByDate,
  onDayClick,
}: {
  weekStart: Date;
  eventsByDate: Record<string, CalendarEvent[]>;
  onDayClick: (y: number, m: number, d: number) => void;
}) {
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    days.push(d);
  }
  return (
    <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
      <div className="grid grid-cols-7 border-b border-border">
        {days.map((d) => {
          const key = toDateKey(d.getFullYear(), d.getMonth(), d.getDate());
          const dayEvents = eventsByDate[key] ?? [];
          return (
            <div key={key} className="border-r border-border min-w-0">
              <button
                type="button"
                onClick={() => onDayClick(d.getFullYear(), d.getMonth(), d.getDate())}
                className="w-full py-2 text-center text-sm font-semibold text-charcoal bg-sage/10 hover:bg-sage/20 border-b border-border"
              >
                <div>{DAYS[d.getDay()]}</div>
                <div className="text-lg">{d.getDate()}</div>
                <div className="text-xs text-text-light">{MONTH_NAMES_SHORT[d.getMonth()]}</div>
              </button>
              <ul className="p-2 min-h-[200px] space-y-2">
                {dayEvents.length === 0 ? (
                  <li className="text-xs text-text-muted">No events</li>
                ) : (
                  dayEvents.map((ev) => (
                    <li
                      key={ev.id}
                      className="text-xs rounded-lg p-2 text-charcoal"
                      style={{ backgroundColor: `${eventColor(ev)}25`, borderLeft: `4px solid ${eventColor(ev)}` }}
                    >
                      <div className="font-medium truncate">{ev.title}</div>
                      <div className="text-text-light">{formatEventTime(ev)}</div>
                      {ev.location && <div className="text-text-light truncate">{ev.location}</div>}
                    </li>
                  ))
                )}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MonthCard({
  year,
  month,
  eventsByDate,
  onDayClick,
}: {
  year: number;
  month: number;
  eventsByDate: Record<string, CalendarEvent[]>;
  onDayClick: (y: number, m: number, d: number) => void;
}) {
  const days = getDaysInMonth(year, month);
  return (
    <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
      <div className="bg-sage/10 px-3 py-2 border-b border-border">
        <h2 className="text-sm font-semibold text-charcoal">
          {MONTH_NAMES[month]} {year}
        </h2>
      </div>
      <div className="p-2">
        <div className="grid grid-cols-7 gap-0.5 text-center text-xs text-text-light font-medium mb-1">
          {DAYS.map((d) => (
            <span key={d} className="truncate">{d}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {days.map((d, i) => {
            if (d === null) return <div key={`e-${i}`} />;
            const key = toDateKey(year, month, d);
            const dayEvents = eventsByDate[key] ?? [];
            return (
              <button
                key={d}
                type="button"
                onClick={() => onDayClick(year, month, d)}
                title={dayEvents.length > 0 ? dayEvents.map((e) => e.title).join(', ') : undefined}
                className={`
                  min-h-[28px] rounded text-xs font-medium
                  hover:bg-sage/20 hover:border-sage/40 focus:outline-none focus:ring-2 focus:ring-[var(--coral)] focus:ring-offset-1
                  border border-transparent
                  ${dayEvents.length > 0 ? 'admin-calendar-day-has-events' : 'text-[var(--charcoal)]'}
                `}
              >
                {d}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function DayModal({
  year,
  month,
  day,
  onClose,
  onEventAdded,
  dayEvents,
}: {
  year: number;
  month: number;
  day: number;
  onClose: () => void;
  onEventAdded: () => void;
  dayEvents: CalendarEvent[];
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const dateStr = `${MONTH_NAMES[month]} ${day}, ${year}`;

  const handleDelete = async (ev: CalendarEvent) => {
    const documentId = firestoreDocIdForEvent(ev);
    if (!documentId) return;
    const isRecurring =
      (ev.recurrenceType && ev.recurrenceType !== 'none') || !!ev.parentEventId;
    const msg = isRecurring
      ? `Delete the entire recurring series "${ev.title}"? All occurrences will be removed.`
      : `Delete "${ev.title}"?`;
    if (!window.confirm(msg)) return;
    setDeletingId(documentId);
    try {
      await deleteDoc(doc(db, 'calendarEvents', documentId));
      onEventAdded();
    } catch (err) {
      console.error('Failed to delete event', err);
    } finally {
      setDeletingId(null);
    }
  };

  const showForm = showAddForm || editingEvent !== null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/40" aria-hidden="true" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="relative w-full max-w-lg rounded-xl bg-white border-2 border-charcoal/15 shadow-2xl text-left ring-4 ring-black/5">
          <div className="px-4 pt-4 pb-2 flex items-center justify-between border-b border-border bg-bg/50 rounded-t-xl">
            <h3 className="text-lg font-semibold text-charcoal">{dateStr}</h3>
            <button
              type="button"
              onClick={onClose}
              className="rounded p-1 text-text-light hover:bg-bg-secondary hover:text-charcoal"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="px-4 py-3">
            {dayEvents.length > 0 && !showForm && (
              <div className="mb-4">
                <p className="text-sm font-medium text-charcoal mb-2">Events this day</p>
                <ul className="space-y-1 text-sm text-text-light">
                  {dayEvents.map((ev) => (
                    <li
                      key={ev.id}
                      className="flex items-center justify-between gap-2 rounded px-2 py-1.5 group"
                      style={{ backgroundColor: `${eventColor(ev)}15`, borderLeft: `3px solid ${eventColor(ev)}` }}
                    >
                      <span className="min-w-0 flex-1 truncate">
                        {ev.title}
                        {ev.location && ` · ${ev.location}`}
                        {ev.allDay ? ' (all day)' : ev.startDate ? ` ${ev.startDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : ''}
                      </span>
                      <span className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          onClick={async () => {
                            const docId = firestoreDocIdForEvent(ev);
                            if (!docId) {
                              setEditingEvent(ev);
                              return;
                            }
                            const snap = await getDoc(doc(db, 'calendarEvents', docId));
                            if (snap.exists()) {
                              setEditingEvent(
                                calendarEventFromFirestore(
                                  snap.id,
                                  snap.data() as Record<string, unknown>
                                )
                              );
                            } else {
                              setEditingEvent(ev);
                            }
                          }}
                          className="rounded px-2 py-0.5 text-xs font-medium text-charcoal hover:bg-white/60"
                          aria-label="Edit"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(ev)}
                          disabled={deletingId === firestoreDocIdForEvent(ev)}
                          className="rounded px-2 py-0.5 text-xs font-medium text-error hover:bg-white/60 disabled:opacity-50"
                          aria-label="Delete"
                        >
                          {deletingId === firestoreDocIdForEvent(ev) ? '…' : 'Delete'}
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {!showForm ? (
              <button
                type="button"
                onClick={() => setShowAddForm(true)}
                className="admin-calendar-btn-coral w-full rounded-lg border-2 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[var(--coral)] focus:ring-offset-2"
              >
                + Add event
              </button>
            ) : (
              <AddEventForm
                key={editingEvent?.id ?? 'new'}
                initialDate={new Date(year, month, day)}
                initialEvent={editingEvent ?? undefined}
                onCancel={() => {
                  setShowAddForm(false);
                  setEditingEvent(null);
                }}
                onSuccess={() => {
                  onEventAdded();
                  setShowAddForm(false);
                  setEditingEvent(null);
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function toDateInput(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function toTimeInput(d: Date): string {
  return d.toTimeString().slice(0, 5);
}

function AddEventForm({
  initialDate,
  initialEvent,
  onCancel,
  onSuccess,
}: {
  initialDate: Date;
  initialEvent?: CalendarEvent;
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const { userProfile } = useAuth();
  const isEdit = !!initialEvent;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<CalendarCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState(CATEGORY_COLORS[0].value);
  const [form, setForm] = useState(() => {
    if (initialEvent) {
      const start = initialEvent.startDate;
      const end = initialEvent.endDate ?? start;
      return {
        title: initialEvent.title,
        description: initialEvent.description ?? '',
        location: initialEvent.location ?? '',
        allDay: initialEvent.allDay ?? true,
        categoryId: initialEvent.categoryId ?? '',
        startDate: toDateInput(start),
        startTime: toTimeInput(start),
        endDate: toDateInput(end),
        endTime: toTimeInput(end),
        recurrenceType: (initialEvent.recurrenceType ?? 'none') as RecurrenceType,
        recurrenceUntil: initialEvent.recurrenceUntil ? toDateInput(initialEvent.recurrenceUntil) : '',
      };
    }
    const d = toDateInput(initialDate);
    return {
      title: '',
      description: '',
      location: '',
      allDay: true,
      categoryId: '',
      startDate: d,
      startTime: '09:00',
      endDate: d,
      endTime: '17:00',
      recurrenceType: 'none' as RecurrenceType,
      recurrenceUntil: '',
    };
  });

  useEffect(() => {
    getDocs(collection(db, 'calendarCategories'))
      .then((snap) => {
        const list: CalendarCategory[] = [];
        snap.docs.forEach((doc) => {
          const d = doc.data();
          list.push({ id: doc.id, name: d.name ?? '', color: d.color ?? DEFAULT_EVENT_COLOR });
        });
        list.sort((a, b) => a.name.localeCompare(b.name));
        setCategories(list);
      })
      .catch((err) => console.error('Failed to load categories', err))
      .finally(() => setCategoriesLoading(false));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    if (name === 'categoryId' && value === '__new__') {
      setShowNewCategory(true);
      setForm((prev) => ({ ...prev, categoryId: '' }));
      return;
    }
    if (name === 'categoryId') setShowNewCategory(false);
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const ref = await addDoc(collection(db, 'calendarCategories'), {
        name: newCategoryName.trim(),
        color: newCategoryColor,
      });
      const added: CalendarCategory = { id: ref.id, name: newCategoryName.trim(), color: newCategoryColor };
      setCategories((prev) => [...prev, added].sort((a, b) => a.name.localeCompare(b.name)));
      setForm((prev) => ({ ...prev, categoryId: ref.id }));
      setShowNewCategory(false);
      setNewCategoryName('');
      setNewCategoryColor(CATEGORY_COLORS[0].value);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create category');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setError('Title is required');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const start = form.allDay
        ? new Date(form.startDate + 'T00:00:00')
        : new Date(form.startDate + 'T' + form.startTime);
      const end = form.allDay
        ? new Date(form.endDate + 'T23:59:59')
        : new Date(form.endDate + 'T' + form.endTime);
      if (end < start) {
        setError('End must be after start');
        setLoading(false);
        return;
      }
      const rt = (form.recurrenceType as RecurrenceType) ?? 'none';
      const hasRecurrence = rt !== 'none';
      if (hasRecurrence && form.recurrenceUntil) {
        const until = new Date(form.recurrenceUntil + 'T23:59:59');
        if (until < start) {
          setError('Repeat end date must be on or after the start date');
          setLoading(false);
          return;
        }
      }
      const category = categories.find((c) => c.id === form.categoryId);
      const eventData: Record<string, unknown> = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        location: form.location.trim() || null,
        allDay: form.allDay,
        startDate: Timestamp.fromDate(start),
        endDate: Timestamp.fromDate(end),
        createdBy: userProfile?.uid ?? null,
        recurrenceType: rt,
        hasRecurrence,
        recurrenceUntil: hasRecurrence && form.recurrenceUntil
          ? Timestamp.fromDate(new Date(form.recurrenceUntil + 'T23:59:59'))
          : null,
      };
      if (!isEdit) eventData.createdAt = Timestamp.now();
      if (category) {
        eventData.categoryId = category.id;
        eventData.categoryName = category.name;
        eventData.categoryColor = category.color;
      } else {
        eventData.categoryId = null;
        eventData.categoryName = null;
        eventData.categoryColor = null;
      }
      if (isEdit && initialEvent?.id) {
        await updateDoc(doc(db, 'calendarEvents', initialEvent.id), eventData);
      } else {
        await addDoc(collection(db, 'calendarEvents'), eventData);
      }
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save event');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && (
        <p className="text-sm text-error bg-error-bg rounded px-2 py-1">{error}</p>
      )}
      <div>
        <label htmlFor="ev-title" className="block text-sm font-medium text-charcoal mb-1">Title *</label>
        <input
          id="ev-title"
          name="title"
          type="text"
          value={form.title}
          onChange={handleChange}
          required
          className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-charcoal focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          placeholder="Event title"
        />
      </div>
      <div>
        <label htmlFor="ev-desc" className="block text-sm font-medium text-charcoal mb-1">Description</label>
        <textarea
          id="ev-desc"
          name="description"
          value={form.description}
          onChange={handleChange}
          rows={2}
          className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-charcoal focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          placeholder="Optional description"
        />
      </div>
      <div>
        <label htmlFor="ev-location" className="block text-sm font-medium text-charcoal mb-1">Location</label>
        <input
          id="ev-location"
          name="location"
          type="text"
          value={form.location}
          onChange={handleChange}
          className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-charcoal focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          placeholder="Optional location"
        />
      </div>
      <div>
        <label htmlFor="ev-category" className="block text-sm font-medium text-charcoal mb-1">Category</label>
        <select
          id="ev-category"
          name="categoryId"
          value={showNewCategory ? '__new__' : form.categoryId}
          onChange={handleChange}
          disabled={categoriesLoading}
          className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-charcoal focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="">No category</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
          <option value="__new__">+ Create new category</option>
        </select>
        {showNewCategory && (
          <div className="mt-2 flex flex-wrap items-end gap-2 rounded-lg border border-border bg-bg/50 p-3">
            <div className="flex-1 min-w-[120px]">
              <label htmlFor="new-cat-name" className="block text-xs font-medium text-text-light mb-0.5">Name</label>
              <input
                id="new-cat-name"
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Category name"
                className="w-full rounded-md border border-border bg-white px-2 py-1.5 text-sm text-charcoal focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="w-28">
              <label htmlFor="new-cat-color" className="block text-xs font-medium text-text-light mb-0.5">Color</label>
              <div className="flex items-center gap-2">
                <span
                  className="h-8 w-8 shrink-0 rounded-md border border-border shadow-sm"
                  style={{ backgroundColor: newCategoryColor }}
                  aria-hidden
                />
                <select
                  id="new-cat-color"
                  value={newCategoryColor}
                  onChange={(e) => setNewCategoryColor(e.target.value)}
                  className="flex-1 min-w-0 rounded-md border border-border bg-white px-2 py-1.5 text-sm text-charcoal focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {CATEGORY_COLORS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <button
              type="button"
              onClick={handleAddCategory}
              disabled={loading || !newCategoryName.trim()}
              className="rounded-md border border-border bg-white px-3 py-1.5 text-sm font-medium text-charcoal hover:bg-bg-secondary disabled:opacity-50"
            >
              Add category
            </button>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        <input
          id="ev-allday"
          name="allDay"
          type="checkbox"
          checked={form.allDay}
          onChange={handleChange}
          className="rounded border-border text-primary focus:ring-primary"
        />
        <label htmlFor="ev-allday" className="text-sm font-medium text-charcoal">All day</label>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="ev-start-date" className="block text-sm font-medium text-charcoal mb-1">Start date</label>
          <input
            id="ev-start-date"
            name="startDate"
            type="date"
            value={form.startDate}
            onChange={handleChange}
            className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-charcoal focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        {!form.allDay && (
          <div>
            <label htmlFor="ev-start-time" className="block text-sm font-medium text-charcoal mb-1">Start time</label>
            <input
              id="ev-start-time"
              name="startTime"
              type="time"
              value={form.startTime}
              onChange={handleChange}
              className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-charcoal focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="ev-end-date" className="block text-sm font-medium text-charcoal mb-1">End date</label>
          <input
            id="ev-end-date"
            name="endDate"
            type="date"
            value={form.endDate}
            onChange={handleChange}
            className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-charcoal focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        {!form.allDay && (
          <div>
            <label htmlFor="ev-end-time" className="block text-sm font-medium text-charcoal mb-1">End time</label>
            <input
              id="ev-end-time"
              name="endTime"
              type="time"
              value={form.endTime}
              onChange={handleChange}
              className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-charcoal focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        )}
      </div>
      <div className="rounded-lg border border-border bg-bg/40 p-3 space-y-3">
        <div>
          <label htmlFor="ev-repeat" className="block text-sm font-medium text-charcoal mb-1">
            Repeat
          </label>
          <select
            id="ev-repeat"
            name="recurrenceType"
            value={form.recurrenceType}
            onChange={handleChange}
            className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-charcoal focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="none">Does not repeat</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>
        {form.recurrenceType !== 'none' && (
          <div>
            <label htmlFor="ev-repeat-until" className="block text-sm font-medium text-charcoal mb-1">
              Repeat until (optional)
            </label>
            <p className="text-xs text-text-light mb-1">
              Leave blank to repeat for up to three years from the first date. Set an end date to stop sooner.
            </p>
            <input
              id="ev-repeat-until"
              name="recurrenceUntil"
              type="date"
              value={form.recurrenceUntil}
              onChange={handleChange}
              className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-charcoal focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        )}
      </div>
      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="admin-calendar-btn-coral flex-1 rounded-md px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[var(--coral)] focus:ring-offset-2 disabled:opacity-50"
        >
          {loading ? 'Saving…' : isEdit ? 'Update event' : 'Add event'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border-2 border-charcoal/25 bg-bg-secondary px-3 py-2 text-sm font-medium text-charcoal hover:bg-charcoal/10 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function CategoryEditRow({
  category,
  onAfterChange,
  onCategoryDeleted,
}: {
  category: CalendarCategory;
  onAfterChange: () => void;
  onCategoryDeleted: (id: string) => void;
}) {
  const categoryId = category.id ?? '';
  const [name, setName] = useState(category.name);
  const [color, setColor] = useState(category.color);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(category.name);
    setColor(category.color);
  }, [category.id, category.name, category.color]);

  const dirty =
    name.trim() !== category.name.trim() || color !== category.color;

  const handleSave = async () => {
    if (!categoryId || !name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await updateDoc(doc(db, 'calendarCategories', categoryId), {
        name: name.trim(),
        color,
      });
      await updateEventsDenormalizedCategory(categoryId, name.trim(), color);
      onAfterChange();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!categoryId) return;
    if (
      !window.confirm(
        `Delete "${category.name || 'this category'}"? Events using it will have no category.`
      )
    ) {
      return;
    }
    setDeleting(true);
    setError(null);
    try {
      await stripCategoryFromEvents(categoryId);
      await deleteDoc(doc(db, 'calendarCategories', categoryId));
      onCategoryDeleted(categoryId);
      onAfterChange();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete');
    } finally {
      setDeleting(false);
    }
  };

  const busy = saving || deleting;

  return (
    <div className="rounded-lg border border-border bg-bg/40 p-3">
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-0 flex-1">
          <label className="block text-xs font-medium text-text-light mb-0.5">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={busy}
            className="w-full rounded-md border border-border bg-white px-2 py-1.5 text-sm text-charcoal focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
          />
        </div>
        <div className="w-36">
          <label className="block text-xs font-medium text-text-light mb-0.5">Color</label>
          <div className="flex items-center gap-2">
            <span
              className="h-8 w-8 shrink-0 rounded-md border border-border shadow-sm"
              style={{ backgroundColor: color }}
              aria-hidden
            />
            <select
              value={color}
              onChange={(e) => setColor(e.target.value)}
              disabled={busy}
              className="flex-1 min-w-[12rem] rounded-md border border-border bg-white px-2 py-1.5 text-sm text-charcoal focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
            >
              {categoryColorSelectOptions(color).map((opt) => (
                <option key={`${opt.value}-${opt.name}`} value={opt.value}>
                  {opt.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={busy || !name.trim() || !dirty}
          className="rounded-md admin-calendar-btn-coral px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={busy}
          className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function AddCategoryForm() {
  const [name, setName] = useState('');
  const [color, setColor] = useState(CATEGORY_COLORS[0]?.value ?? DEFAULT_EVENT_COLOR);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAdd = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await addDoc(collection(db, 'calendarCategories'), {
        name: name.trim(),
        color,
      });
      setName('');
      setColor(CATEGORY_COLORS[0]?.value ?? DEFAULT_EVENT_COLOR);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add category');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-lg border border-dashed border-primary/35 bg-sage/5 p-3 mb-4">
      <h3 className="text-sm font-semibold text-charcoal mb-2">Add category</h3>
      <p className="text-xs text-text-light mb-3">
        Choose a name and color. Categories sync to the calendar key and event forms automatically.
      </p>
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-0 flex-1">
          <label htmlFor="new-cat-modal-name" className="block text-xs font-medium text-text-light mb-0.5">
            Name
          </label>
          <input
            id="new-cat-modal-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={saving}
            placeholder="e.g. Youth night"
            className="w-full rounded-md border border-border bg-white px-2 py-1.5 text-sm text-charcoal focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
          />
        </div>
        <div className="min-w-[12rem]">
          <label htmlFor="new-cat-modal-color" className="block text-xs font-medium text-text-light mb-0.5">
            Color
          </label>
          <div className="flex items-center gap-2">
            <span
              className="h-8 w-8 shrink-0 rounded-md border border-border shadow-sm"
              style={{ backgroundColor: color }}
              aria-hidden
            />
            <select
              id="new-cat-modal-color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              disabled={saving}
              className="min-w-0 flex-1 rounded-md border border-border bg-white px-2 py-1.5 text-sm text-charcoal focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
            >
              {CATEGORY_COLORS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button
          type="button"
          onClick={handleAdd}
          disabled={saving || !name.trim()}
          className="inline-flex items-center gap-1.5 rounded-md admin-calendar-btn-coral px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {saving ? (
            'Adding…'
          ) : (
            <>
              <Plus className="h-4 w-4" />
              Add
            </>
          )}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function EditCategoriesModal({
  categories,
  onClose,
  onAfterChange,
  onCategoryDeleted,
}: {
  categories: CalendarCategory[];
  onClose: () => void;
  onAfterChange: () => void;
  onCategoryDeleted: (id: string) => void;
}) {
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-categories-title"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-lg max-h-[90vh] flex-col overflow-hidden rounded-xl border-2 border-charcoal/15 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3 shrink-0">
          <h2 id="edit-categories-title" className="text-lg font-semibold text-charcoal">
            Edit categories
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-charcoal hover:bg-bg-secondary focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-4 py-3">
          <AddCategoryForm />
          {categories.length === 0 ? (
            <p className="text-sm text-text-light">
              No categories yet. Add one above, or create one from an event.
            </p>
          ) : (
            <ul className="space-y-4 list-none m-0 p-0">
              {categories.map((c) => (
                <li key={c.id}>
                  <CategoryEditRow
                    category={c}
                    onAfterChange={onAfterChange}
                    onCategoryDeleted={onCategoryDeleted}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
