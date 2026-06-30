'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Timestamp, collection, getDocs, orderBy, query, updateDoc, doc } from 'firebase/firestore';
import { format } from 'date-fns';
import { ChevronDown, ChevronRight, Plus } from 'lucide-react';
import BackButton from '@/components/BackButton';
import { useAuth } from '@/lib/auth/AuthContext';
import { db } from '@/lib/firebase/config';
import { normalizeAttendanceName } from '@/lib/utils/attendance';

interface ImportantEvent {
  id: string;
  type: 'birthday' | 'baptism' | 'attendanceStart' | 'anniversary' | 'other';
  date: string;
  title: string;
  notes?: string;
}

interface FirestoreAttendanceHousehold {
  householdName?: string;
  normalizedName?: string;
  active?: boolean;
  availableFrom?: Timestamp;
  createdAt?: Timestamp;
  importantEvents?: ImportantEvent[];
}

interface AttendanceMemberRow {
  id: string;
  householdName: string;
  normalizedName: string;
  availableFrom: Date;
  importantEvents: ImportantEvent[];
}

const EVENT_TYPE_LABELS: Record<ImportantEvent['type'], string> = {
  birthday: 'Birthday',
  baptism: 'Baptism',
  attendanceStart: 'Attendance Start',
  anniversary: 'Anniversary',
  other: 'Other',
};

export default function AttendanceMembersPage() {
  useEffect(() => {
    document.title = 'Attendance Members List | Sioux Falls Church of Christ';
  }, []);

  const { userProfile } = useAuth();
  const router = useRouter();
  const [members, setMembers] = useState<AttendanceMemberRow[]>([]);
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const [selectedMember, setSelectedMember] = useState<AttendanceMemberRow | null>(null);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [eventType, setEventType] = useState<ImportantEvent['type']>('birthday');
  const [eventDate, setEventDate] = useState('');
  const [eventTitle, setEventTitle] = useState('');
  const [eventNotes, setEventNotes] = useState('');
  const [savingEvent, setSavingEvent] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userProfile && !userProfile.isAdmin) {
      router.push('/');
    }
  }, [router, userProfile]);

  useEffect(() => {
    if (!userProfile?.isAdmin) {
      return;
    }

    const loadMembers = async () => {
      try {
        setLoading(true);
        setError(null);

        const snapshot = await getDocs(query(collection(db, 'attendanceHouseholds'), orderBy('householdName', 'asc')));
        setMembers(
          snapshot.docs
            .map((doc) => {
              const data = doc.data() as FirestoreAttendanceHousehold;
              return {
                id: doc.id,
                householdName: data.householdName || 'Unnamed Household',
                normalizedName: data.normalizedName || normalizeAttendanceName(data.householdName || ''),
                availableFrom: data.availableFrom?.toDate() || data.createdAt?.toDate() || new Date(2000, 0, 2, 12, 0, 0, 0),
                importantEvents: Array.isArray(data.importantEvents) ? data.importantEvents : [],
                active: data.active !== false,
              };
            })
            .filter((member) => member.active)
            .map((member) => ({
              id: member.id,
              householdName: member.householdName,
              normalizedName: member.normalizedName,
              availableFrom: member.availableFrom,
              importantEvents: [...member.importantEvents].sort((a, b) => a.date.localeCompare(b.date)),
            })),
        );
      } catch (loadError) {
        console.error('Error loading attendance members:', loadError);
        setError('Failed to load attendance members.');
      } finally {
        setLoading(false);
      }
    };

    loadMembers();
  }, [userProfile]);

  if (!userProfile?.isAdmin) {
    return null;
  }

  const toggleExpanded = (memberId: string) => {
    setExpandedIds((current) =>
      current.includes(memberId) ? current.filter((id) => id !== memberId) : [...current, memberId],
    );
  };

  const openEventModal = (member: AttendanceMemberRow) => {
    setSelectedMember(member);
    setEditingEventId(null);
    setEventType('birthday');
    setEventDate('');
    setEventTitle('');
    setEventNotes('');
  };

  const openEditEventModal = (member: AttendanceMemberRow, importantEvent: ImportantEvent) => {
    setSelectedMember(member);
    setEditingEventId(importantEvent.id);
    setEventType(importantEvent.type);
    setEventDate(importantEvent.date);
    setEventTitle(importantEvent.title);
    setEventNotes(importantEvent.notes || '');
  };

  const closeEventModal = () => {
    setSelectedMember(null);
    setEditingEventId(null);
    setSavingEvent(false);
  };

  const handleSaveEvent = async () => {
    if (!selectedMember || !eventDate || !eventTitle.trim()) {
      setError('Event title and date are required.');
      return;
    }

    try {
      setSavingEvent(true);
      setError(null);

      const nextEvent: ImportantEvent = {
        id: editingEventId || crypto.randomUUID(),
        type: eventType,
        date: eventDate,
        title: eventTitle.trim(),
        ...(eventNotes.trim() ? { notes: eventNotes.trim() } : {}),
      };
      const nextEvents = editingEventId
        ? selectedMember.importantEvents
            .map((event) => (event.id === editingEventId ? nextEvent : event))
            .sort((a, b) => a.date.localeCompare(b.date))
        : [...selectedMember.importantEvents, nextEvent].sort((a, b) => a.date.localeCompare(b.date));

      await updateDoc(doc(db, 'attendanceHouseholds', selectedMember.id), {
        importantEvents: nextEvents,
        updatedAt: Timestamp.now(),
      });

      setMembers((current) =>
        current.map((member) =>
          member.id === selectedMember.id ? { ...member, importantEvents: nextEvents } : member,
        ),
      );
      setExpandedIds((current) => (current.includes(selectedMember.id) ? current : [...current, selectedMember.id]));
      closeEventModal();
    } catch (saveError) {
      console.error('Error saving important event:', saveError);
      setError('Failed to save important event.');
      setSavingEvent(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex items-center">
        <BackButton className="mr-4" />
        <div>
          <h1 className="text-3xl font-bold text-charcoal">Members List</h1>
          <p className="mt-2 text-sm text-text-light">All imported attendance households and when they started attending.</p>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : loading ? (
        <div className="flex min-h-[240px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#D6805F]"></div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
          <table className="min-w-full border-collapse text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="border-b border-border px-4 py-3 text-left font-semibold text-charcoal">Household</th>
                <th className="border-b border-border px-4 py-3 text-left font-semibold text-charcoal">Started Attending</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => {
                const expanded = expandedIds.includes(member.id);

                return (
                  <>
                    <tr key={member.id} className="odd:bg-white even:bg-slate-50/40">
                      <td className="border-t border-border px-4 py-3 text-charcoal">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => toggleExpanded(member.id)}
                            className="rounded-md border border-border p-1 text-charcoal transition hover:border-coral hover:text-coral"
                            aria-label={expanded ? 'Collapse member row' : 'Expand member row'}
                          >
                            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => openEventModal(member)}
                            className="text-left font-medium text-charcoal transition hover:text-coral"
                          >
                            {member.householdName}
                          </button>
                        </div>
                      </td>
                      <td className="border-t border-border px-4 py-3 text-charcoal">{format(member.availableFrom, 'MMMM d, yyyy')}</td>
                    </tr>
                    {expanded ? (
                      <tr key={`${member.id}-events`} className="bg-slate-50/60">
                        <td colSpan={2} className="border-t border-border px-4 py-4">
                          {member.importantEvents.length === 0 ? (
                            <p className="text-sm text-text-light">No important events recorded yet.</p>
                          ) : (
                            <div className="space-y-1">
                              {member.importantEvents.map((event) => (
                                <div key={event.id} className="text-sm text-charcoal">
                                  <span className="text-text-light">{EVENT_TYPE_LABELS[event.type]} — </span>
                                  <button
                                    type="button"
                                    onClick={() => openEditEventModal(member, event)}
                                    className="font-medium text-left transition hover:text-coral"
                                  >
                                    {event.title}
                                  </button>
                                  <span className="text-text-light"> • {format(new Date(`${event.date}T12:00:00`), 'MMMM d, yyyy')}</span>
                                  {event.notes ? <span className="text-text-light"> • {event.notes}</span> : null}
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    ) : null}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {selectedMember ? (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/30" aria-hidden="true" onClick={closeEventModal} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
              <div className="border-b border-border px-6 py-4">
                <h2 className="text-lg font-semibold text-charcoal">{selectedMember.householdName}</h2>
                <p className="mt-1 text-sm text-text-light">
                  {editingEventId ? 'Edit this important event.' : 'Add an important event for this household.'}
                </p>
              </div>
              <div className="space-y-4 px-6 py-4">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-charcoal">Event Type</span>
                  <select
                    value={eventType}
                    onChange={(event) => setEventType(event.target.value as ImportantEvent['type'])}
                    className="w-full rounded-md border border-border px-3 py-2 text-sm text-charcoal focus:border-coral focus:outline-none"
                  >
                    {Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-charcoal">Date</span>
                  <input
                    type="date"
                    value={eventDate}
                    onChange={(event) => setEventDate(event.target.value)}
                    className="w-full rounded-md border border-border px-3 py-2 text-sm text-charcoal focus:border-coral focus:outline-none"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-charcoal">Title</span>
                  <input
                    type="text"
                    value={eventTitle}
                    onChange={(event) => setEventTitle(event.target.value)}
                    placeholder="Who is this for?"
                    className="w-full rounded-md border border-border px-3 py-2 text-sm text-charcoal focus:border-coral focus:outline-none"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-charcoal">Notes</span>
                  <textarea
                    value={eventNotes}
                    onChange={(event) => setEventNotes(event.target.value)}
                    rows={3}
                    placeholder="Optional details"
                    className="w-full rounded-md border border-border px-3 py-2 text-sm text-charcoal focus:border-coral focus:outline-none"
                  />
                </label>
              </div>
              <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
                <button
                  type="button"
                  onClick={closeEventModal}
                  className="rounded-md border border-border px-4 py-2 text-sm font-medium text-charcoal transition hover:border-coral hover:text-coral"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEvent}
                  disabled={savingEvent}
                  className="inline-flex items-center rounded-md bg-[#D6805F] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#c56f4d] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {savingEvent ? 'Saving...' : editingEventId ? 'Save Changes' : 'Add Event'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
