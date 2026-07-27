'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Timestamp, collection, doc, getDocs, orderBy, query, updateDoc } from 'firebase/firestore';
import { format } from 'date-fns';
import { ChevronDown, ChevronRight, Pencil, Plus, Trash2, UserPlus } from 'lucide-react';
import BackButton from '@/components/BackButton';
import { useAuth } from '@/lib/auth/AuthContext';
import { db } from '@/lib/firebase/config';
import { normalizeAttendanceName } from '@/lib/utils/attendance';

type ImportantEventType = 'birthday' | 'baptism' | 'attendanceStart' | 'anniversary' | 'other';

interface ImportantEvent {
  id: string;
  type: ImportantEventType;
  date: string;
  title: string;
  notes?: string;
}

interface HouseholdPerson {
  id: string;
  firstName: string;
  lastName: string;
  importantEvents: ImportantEvent[];
}

interface AttendanceHousehold {
  id: string;
  householdName: string;
  normalizedName: string;
  availableFrom: Date;
  members: HouseholdPerson[];
  importantEvents: ImportantEvent[];
}

const EVENT_TYPE_LABELS: Record<ImportantEventType, string> = {
  birthday: 'Birthday',
  baptism: 'Baptism',
  attendanceStart: 'Attendance Start',
  anniversary: 'Anniversary',
  other: 'Other',
};

const isCelebrationEvent = (type: ImportantEventType) => type === 'birthday' || type === 'anniversary';
const getDaysInMonth = (month: number) => new Date(2000, month, 0).getDate();

const getMonthDayParts = (date: string) => {
  const match = /^(?:(\d{4})-)?(\d{2})-(\d{2})$/.exec(date);
  if (!match) return null;
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsedDate = new Date(2000, month - 1, day);
  return parsedDate.getMonth() === month - 1 && parsedDate.getDate() === day ? { month, day } : null;
};

const formatEventDate = (event: ImportantEvent) => {
  if (isCelebrationEvent(event.type)) {
    const dateParts = getMonthDayParts(event.date);
    return dateParts ? format(new Date(2000, dateParts.month - 1, dateParts.day), 'MMMM d') : event.date;
  }
  const date = new Date(`${event.date}T12:00:00`);
  return Number.isNaN(date.getTime()) ? event.date : format(date, 'MMMM d, yyyy');
};

const sortEvents = (events: ImportantEvent[]) => [...events].sort((a, b) => a.date.localeCompare(b.date) || a.type.localeCompare(b.type));

export default function AttendanceMembersPage() {
  const { userProfile } = useAuth();
  const router = useRouter();
  const [households, setHouseholds] = useState<AttendanceHousehold[]>([]);
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const [editingHousehold, setEditingHousehold] = useState<AttendanceHousehold | null>(null);
  const [householdName, setHouseholdName] = useState('');
  const [personEditor, setPersonEditor] = useState<{ household: AttendanceHousehold; person?: HouseholdPerson } | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [eventEditor, setEventEditor] = useState<{ household: AttendanceHousehold; person: HouseholdPerson; event?: ImportantEvent } | null>(null);
  const [eventType, setEventType] = useState<ImportantEventType>('birthday');
  const [eventDate, setEventDate] = useState('');
  const [eventMonth, setEventMonth] = useState(new Date().getMonth() + 1);
  const [eventDay, setEventDay] = useState(new Date().getDate());
  const [eventTitle, setEventTitle] = useState('');
  const [eventNotes, setEventNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Attendance Members List | Sioux Falls Church of Christ';
  }, []);

  useEffect(() => {
    if (userProfile && !userProfile.isAdmin) router.push('/');
  }, [router, userProfile]);

  useEffect(() => {
    if (!userProfile?.isAdmin) return;
    const loadHouseholds = async () => {
      try {
        setLoading(true);
        setError(null);
        const snapshot = await getDocs(query(collection(db, 'attendanceHouseholds'), orderBy('householdName', 'asc')));
        setHouseholds(snapshot.docs.flatMap((snapshot) => {
          const data = snapshot.data() as { householdName?: string; normalizedName?: string; active?: boolean; availableFrom?: Timestamp; createdAt?: Timestamp; members?: HouseholdPerson[]; importantEvents?: ImportantEvent[] };
          if (data.active === false) return [];
          return [{
            id: snapshot.id,
            householdName: data.householdName || 'Unnamed Household',
            normalizedName: data.normalizedName || normalizeAttendanceName(data.householdName || ''),
            availableFrom: data.availableFrom?.toDate() || data.createdAt?.toDate() || new Date(2000, 0, 2, 12),
            members: Array.isArray(data.members) ? data.members.map((person) => ({ ...person, importantEvents: sortEvents(person.importantEvents || []) })) : [],
            importantEvents: sortEvents(Array.isArray(data.importantEvents) ? data.importantEvents : []),
          }];
        }));
      } catch (loadError) {
        console.error('Error loading attendance households:', loadError);
        setError('Failed to load attendance households.');
      } finally {
        setLoading(false);
      }
    };
    loadHouseholds();
  }, [userProfile]);

  if (!userProfile?.isAdmin) return null;

  const updateLocalHousehold = (nextHousehold: AttendanceHousehold) => {
    setHouseholds((current) => current.map((household) => household.id === nextHousehold.id ? nextHousehold : household));
  };

  const openHouseholdEditor = (household: AttendanceHousehold) => {
    setEditingHousehold(household);
    setHouseholdName(household.householdName);
  };

  const saveHouseholdName = async () => {
    if (!editingHousehold || !householdName.trim()) return;
    try {
      setSaving(true);
      const nextHousehold = { ...editingHousehold, householdName: householdName.trim(), normalizedName: normalizeAttendanceName(householdName) };
      await updateDoc(doc(db, 'attendanceHouseholds', editingHousehold.id), {
        householdName: nextHousehold.householdName,
        normalizedName: nextHousehold.normalizedName,
        updatedAt: Timestamp.now(),
      });
      updateLocalHousehold(nextHousehold);
      setEditingHousehold(null);
    } catch (saveError) {
      console.error('Error saving household:', saveError);
      setError('Failed to save household name.');
    } finally {
      setSaving(false);
    }
  };

  const openPersonEditor = (household: AttendanceHousehold, person?: HouseholdPerson) => {
    setPersonEditor({ household, person });
    setFirstName(person?.firstName || '');
    setLastName(person?.lastName || '');
  };

  const savePerson = async () => {
    if (!personEditor || !firstName.trim()) return;
    try {
      setSaving(true);
      const person = personEditor.person
        ? { ...personEditor.person, firstName: firstName.trim(), lastName: lastName.trim() }
        : { id: crypto.randomUUID(), firstName: firstName.trim(), lastName: lastName.trim(), importantEvents: [] };
      const nextMembers = personEditor.person
        ? personEditor.household.members.map((current) => current.id === person.id ? person : current)
        : [...personEditor.household.members, person];
      const nextHousehold = { ...personEditor.household, members: nextMembers };
      await updateDoc(doc(db, 'attendanceHouseholds', nextHousehold.id), { members: nextMembers, updatedAt: Timestamp.now() });
      updateLocalHousehold(nextHousehold);
      setExpandedIds((current) => current.includes(nextHousehold.id) ? current : [...current, nextHousehold.id]);
      setPersonEditor(null);
    } catch (saveError) {
      console.error('Error saving household member:', saveError);
      setError('Failed to save household member.');
    } finally {
      setSaving(false);
    }
  };

  const deletePerson = async (household: AttendanceHousehold, person: HouseholdPerson) => {
    if (!window.confirm(`Delete ${person.firstName} ${person.lastName}? Their member-specific events will also be deleted.`)) return;
    try {
      setError(null);
      const members = household.members.filter((current) => current.id !== person.id);
      const nextHousehold = { ...household, members };
      await updateDoc(doc(db, 'attendanceHouseholds', household.id), { members, updatedAt: Timestamp.now() });
      updateLocalHousehold(nextHousehold);
    } catch (deleteError) {
      console.error('Error deleting household member:', deleteError);
      setError('Failed to delete household member.');
    }
  };

  const openEventEditor = (household: AttendanceHousehold, person: HouseholdPerson, event?: ImportantEvent) => {
    setEventEditor({ household, person, event });
    setEventType(event?.type || 'birthday');
    setEventDate(event?.date || '');
    const dateParts = event ? getMonthDayParts(event.date) : null;
    setEventMonth(dateParts?.month || new Date().getMonth() + 1);
    setEventDay(dateParts?.day || new Date().getDate());
    setEventTitle(event?.title === 'Other' ? '' : event?.title || '');
    setEventNotes(event?.notes || '');
  };

  const savePersonEvent = async () => {
    if (!eventEditor || (!isCelebrationEvent(eventType) && !eventDate) || (eventType === 'other' && !eventTitle.trim())) return;
    try {
      setSaving(true);
      const nextEvent: ImportantEvent = {
        id: eventEditor.event?.id || crypto.randomUUID(),
        type: eventType,
        date: isCelebrationEvent(eventType) ? `${String(eventMonth).padStart(2, '0')}-${String(eventDay).padStart(2, '0')}` : eventDate,
        title: eventType === 'other' ? eventTitle.trim() : EVENT_TYPE_LABELS[eventType],
        ...(eventNotes.trim() ? { notes: eventNotes.trim() } : {}),
      };
      const nextMembers = eventEditor.household.members.map((person) => {
        if (person.id !== eventEditor.person.id) return person;
        const events = eventEditor.event
          ? person.importantEvents.map((event) => event.id === eventEditor.event?.id ? nextEvent : event)
          : [...person.importantEvents, nextEvent];
        return { ...person, importantEvents: sortEvents(events) };
      });
      const nextHousehold = { ...eventEditor.household, members: nextMembers };
      await updateDoc(doc(db, 'attendanceHouseholds', nextHousehold.id), { members: nextMembers, updatedAt: Timestamp.now() });
      updateLocalHousehold(nextHousehold);
      setEventEditor(null);
    } catch (saveError) {
      console.error('Error saving member event:', saveError);
      setError('Failed to save member event.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center gap-4">
        <BackButton className="mr-4" />
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-charcoal">Members List</h1>
          <p className="mt-2 text-sm text-text-light">Manage household names, household members, and member-specific important events.</p>
        </div>
        <Link href="/admin/attendance/members/events" className="inline-flex shrink-0 items-center rounded-md border border-border px-4 py-2 text-sm font-medium text-charcoal transition hover:border-coral hover:text-coral">
          Birthday and Anniversary List
        </Link>
      </div>

      <div className="mb-6 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">Attendance remains household-based: enter one number for each household on the Attendance page. Add people here to connect events to the right person.</div>

      {error ? <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}
      {loading ? (
        <div className="flex min-h-[240px] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#D6805F]" /></div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
          <table className="min-w-full border-collapse text-sm">
            <thead className="bg-slate-50"><tr><th className="border-b border-border px-4 py-3 text-left font-semibold text-charcoal">Household</th><th className="border-b border-border px-4 py-3 text-left font-semibold text-charcoal">Started Attending</th></tr></thead>
            <tbody>
              {households.map((household) => {
                const expanded = expandedIds.includes(household.id);
                return (
                  <>
                    <tr key={household.id} className="odd:bg-white even:bg-slate-50/40">
                      <td className="border-t border-border px-4 py-3 text-charcoal"><div className="flex items-center gap-2"><button type="button" onClick={() => setExpandedIds((current) => current.includes(household.id) ? current.filter((id) => id !== household.id) : [...current, household.id])} className="rounded-md border border-border p-1 transition hover:border-coral hover:text-coral" aria-label={expanded ? 'Collapse household' : 'Expand household'}>{expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</button><span className="font-medium">{household.householdName}</span><button type="button" onClick={() => openHouseholdEditor(household)} className="rounded p-1 text-text-light transition hover:text-coral" aria-label={`Edit ${household.householdName}`}><Pencil className="h-3.5 w-3.5" /></button></div></td>
                      <td className="border-t border-border px-4 py-3 text-charcoal">{format(household.availableFrom, 'MMMM d, yyyy')}</td>
                    </tr>
                    {expanded ? <tr key={`${household.id}-members`} className="bg-slate-50/60"><td colSpan={2} className="border-t border-border p-4"><div className="flex items-center justify-between"><h2 className="font-semibold text-charcoal">Household Members</h2><button type="button" onClick={() => openPersonEditor(household)} className="inline-flex items-center rounded-md border border-border px-3 py-1.5 text-sm font-medium text-charcoal transition hover:border-coral hover:text-coral"><UserPlus className="mr-1.5 h-4 w-4" />Add Member</button></div>
                      {household.members.length === 0 ? <p className="mt-3 text-sm text-text-light">No members added yet.</p> : <div className="mt-3 space-y-3">{household.members.map((person) => <div key={person.id} className="rounded-lg border border-border bg-white p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-medium text-charcoal">{person.firstName} {person.lastName}</h3>{person.importantEvents.length ? <div className="mt-2 space-y-1">{person.importantEvents.map((event) => <div key={event.id} className="text-sm text-text-light"><span className="font-medium text-charcoal">{EVENT_TYPE_LABELS[event.type]}</span> • {formatEventDate(event)}{event.notes ? ` • ${event.notes}` : ''}<button type="button" onClick={() => openEventEditor(household, person, event)} className="ml-2 text-coral hover:underline">Edit</button></div>)}</div> : <p className="mt-1 text-sm text-text-light">No important events yet.</p>}</div><div className="flex gap-1"><button type="button" onClick={() => openEventEditor(household, person)} className="rounded border border-border p-1.5 transition hover:border-coral hover:text-coral" aria-label={`Add event for ${person.firstName}`}><Plus className="h-4 w-4" /></button><button type="button" onClick={() => openPersonEditor(household, person)} className="rounded border border-border p-1.5 transition hover:border-coral hover:text-coral" aria-label={`Edit ${person.firstName}`}><Pencil className="h-4 w-4" /></button><button type="button" onClick={() => deletePerson(household, person)} className="rounded border border-border p-1.5 text-red-700 transition hover:border-red-400" aria-label={`Delete ${person.firstName}`}><Trash2 className="h-4 w-4" /></button></div></div></div>)}</div>}
                      {household.importantEvents.length ? <div className="mt-4 border-t border-border pt-4"><h3 className="text-sm font-semibold text-charcoal">Unassigned household events</h3><p className="mt-1 text-xs text-text-light">These are older events. New events should be added to a specific member above.</p><div className="mt-2 space-y-1">{household.importantEvents.map((event) => <p key={event.id} className="text-sm text-text-light"><span className="font-medium text-charcoal">{EVENT_TYPE_LABELS[event.type]}</span> — {event.title} • {formatEventDate(event)}</p>)}</div></div> : null}
                    </td></tr> : null}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {editingHousehold ? <Modal title="Edit Household" onClose={() => setEditingHousehold(null)}><label className="block"><span className="mb-2 block text-sm font-medium text-charcoal">Household Name</span><input value={householdName} onChange={(event) => setHouseholdName(event.target.value)} className="w-full rounded-md border border-border px-3 py-2" /></label><ModalActions saving={saving} onCancel={() => setEditingHousehold(null)} onSave={saveHouseholdName} label="Save Household" /></Modal> : null}
      {personEditor ? <Modal title={personEditor.person ? 'Edit Member' : 'Add Member'} onClose={() => setPersonEditor(null)}><div className="grid grid-cols-2 gap-3"><label><span className="mb-2 block text-sm font-medium text-charcoal">First Name</span><input value={firstName} onChange={(event) => setFirstName(event.target.value)} className="w-full rounded-md border border-border px-3 py-2" /></label><label><span className="mb-2 block text-sm font-medium text-charcoal">Last Name</span><input value={lastName} onChange={(event) => setLastName(event.target.value)} className="w-full rounded-md border border-border px-3 py-2" /></label></div><ModalActions saving={saving} onCancel={() => setPersonEditor(null)} onSave={savePerson} label={personEditor.person ? 'Save Member' : 'Add Member'} /></Modal> : null}
      {eventEditor ? <Modal title={`${eventEditor.person.firstName}'s Important Event`} onClose={() => setEventEditor(null)}><div className="space-y-4"><label className="block"><span className="mb-2 block text-sm font-medium text-charcoal">Event Type</span><select value={eventType} onChange={(event) => setEventType(event.target.value as ImportantEventType)} className="w-full rounded-md border border-border px-3 py-2">{Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>{isCelebrationEvent(eventType) ? <div><span className="mb-2 block text-sm font-medium text-charcoal">Date</span><div className="grid grid-cols-2 gap-3"><select value={eventMonth} onChange={(event) => { const month = Number(event.target.value); setEventMonth(month); setEventDay((day) => Math.min(day, getDaysInMonth(month))); }} className="rounded-md border border-border px-3 py-2">{Array.from({ length: 12 }, (_, month) => <option key={month} value={month + 1}>{format(new Date(2000, month, 1), 'MMMM')}</option>)}</select><select value={eventDay} onChange={(event) => setEventDay(Number(event.target.value))} className="rounded-md border border-border px-3 py-2">{Array.from({ length: getDaysInMonth(eventMonth) }, (_, day) => <option key={day} value={day + 1}>{day + 1}</option>)}</select></div></div> : <label className="block"><span className="mb-2 block text-sm font-medium text-charcoal">Date</span><input type="date" value={eventDate} onChange={(event) => setEventDate(event.target.value)} className="w-full rounded-md border border-border px-3 py-2" /></label>}{eventType === 'other' ? <label className="block"><span className="mb-2 block text-sm font-medium text-charcoal">Event Description</span><input value={eventTitle} onChange={(event) => setEventTitle(event.target.value)} className="w-full rounded-md border border-border px-3 py-2" /></label> : null}<label className="block"><span className="mb-2 block text-sm font-medium text-charcoal">Notes</span><textarea value={eventNotes} onChange={(event) => setEventNotes(event.target.value)} rows={3} className="w-full rounded-md border border-border px-3 py-2" /></label></div><ModalActions saving={saving} onCancel={() => setEventEditor(null)} onSave={savePersonEvent} label={eventEditor.event ? 'Save Event' : 'Add Event'} /></Modal> : null}
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return <div className="fixed inset-0 z-50"><div className="absolute inset-0 bg-black/30" onClick={onClose} /><div className="relative flex min-h-full items-center justify-center p-4"><div className="w-full max-w-lg rounded-xl bg-white shadow-xl"><div className="border-b border-border px-6 py-4"><h2 className="text-lg font-semibold text-charcoal">{title}</h2></div><div className="px-6 py-4">{children}</div></div></div></div>;
}

function ModalActions({ saving, onCancel, onSave, label }: { saving: boolean; onCancel: () => void; onSave: () => void; label: string }) {
  return <div className="mt-6 flex justify-end gap-2 border-t border-border pt-4"><button type="button" onClick={onCancel} className="rounded-md border border-border px-4 py-2 text-sm font-medium text-charcoal">Cancel</button><button type="button" onClick={onSave} disabled={saving} className="rounded-md bg-[#D6805F] px-4 py-2 text-sm font-medium text-white disabled:opacity-60">{saving ? 'Saving...' : label}</button></div>;
}
