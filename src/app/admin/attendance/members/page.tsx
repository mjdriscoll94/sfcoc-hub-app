'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Timestamp, addDoc, collection, doc, getDocs, orderBy, query, updateDoc } from 'firebase/firestore';
import { format } from 'date-fns';
import { ChevronDown, ChevronRight, Pencil, Plus, Trash2, UserPlus } from 'lucide-react';
import BackButton from '@/components/BackButton';
import { useAuth } from '@/lib/auth/AuthContext';
import { db } from '@/lib/firebase/config';
import { getSundayForDate, getSundayKey, normalizeAttendanceName } from '@/lib/utils/attendance';
import { canManageAttendance } from '@/types/roles';

type ImportantEventType = 'birthday' | 'baptism' | 'attendanceStart' | 'anniversary' | 'other';

interface ImportantEvent {
  id: string;
  type: ImportantEventType;
  date: string;
  title: string;
  notes?: string;
  memberIds?: string[];
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
  const [addingHousehold, setAddingHousehold] = useState(false);
  const [householdStartDate, setHouseholdStartDate] = useState(getSundayKey(new Date()));
  const [personEditor, setPersonEditor] = useState<{ household: AttendanceHousehold; person?: HouseholdPerson } | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [eventEditor, setEventEditor] = useState<{ household: AttendanceHousehold; person?: HouseholdPerson; event?: ImportantEvent } | null>(null);
  const [eventType, setEventType] = useState<ImportantEventType>('birthday');
  const [eventDate, setEventDate] = useState('');
  const [eventMonth, setEventMonth] = useState(new Date().getMonth() + 1);
  const [eventDay, setEventDay] = useState(new Date().getDate());
  const [eventTitle, setEventTitle] = useState('');
  const [eventNotes, setEventNotes] = useState('');
  const [anniversaryMemberIds, setAnniversaryMemberIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Attendance Members List | Sioux Falls Church of Christ';
  }, []);

  useEffect(() => {
    if (userProfile && !canManageAttendance(userProfile)) router.push('/');
  }, [router, userProfile]);

  useEffect(() => {
    if (!userProfile || !canManageAttendance(userProfile)) return;
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

  if (!userProfile || !canManageAttendance(userProfile)) return null;

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

  const createHousehold = async () => {
    if (!householdName.trim() || !householdStartDate) {
      setError('Household name and starting attendance date are required.');
      return;
    }
    try {
      setSaving(true);
      const name = householdName.trim();
      const availableFrom = getSundayForDate(new Date(`${householdStartDate}T12:00:00`));
      const householdRef = await addDoc(collection(db, 'attendanceHouseholds'), {
        householdName: name,
        normalizedName: normalizeAttendanceName(name),
        active: true,
        availableFrom: Timestamp.fromDate(availableFrom),
        members: [],
        importantEvents: [],
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      setHouseholds((current) => [...current, {
        id: householdRef.id,
        householdName: name,
        normalizedName: normalizeAttendanceName(name),
        availableFrom,
        members: [],
        importantEvents: [],
      }].sort((a, b) => a.householdName.localeCompare(b.householdName)));
      setAddingHousehold(false);
    } catch (createError) {
      console.error('Error creating household:', createError);
      setError('Failed to create household.');
    } finally {
      setSaving(false);
    }
  };

  const deleteHousehold = async (household: AttendanceHousehold) => {
    if (!window.confirm(`Delete ${household.householdName} from attendance tracking? Its historical attendance records will be preserved.`)) return;
    try {
      await updateDoc(doc(db, 'attendanceHouseholds', household.id), { active: false, updatedAt: Timestamp.now() });
      setHouseholds((current) => current.filter((currentHousehold) => currentHousehold.id !== household.id));
    } catch (deleteError) {
      console.error('Error deleting household:', deleteError);
      setError('Failed to delete household.');
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
    setAnniversaryMemberIds([]);
  };

  const openHouseholdAnniversaryEditor = (household: AttendanceHousehold, event?: ImportantEvent) => {
    setEventEditor({ household, event });
    setEventType('anniversary');
    setEventDate(event?.date || '');
    const dateParts = event ? getMonthDayParts(event.date) : null;
    setEventMonth(dateParts?.month || new Date().getMonth() + 1);
    setEventDay(dateParts?.day || new Date().getDate());
    setEventTitle('');
    setEventNotes(event?.notes || '');
    setAnniversaryMemberIds(event?.memberIds || []);
  };

  const savePersonEvent = async () => {
    if (!eventEditor || (!isCelebrationEvent(eventType) && !eventDate) || (eventType === 'other' && !eventTitle.trim())) return;
    if (!eventEditor.person && anniversaryMemberIds.length !== 2) {
      setError('Select the two household members celebrating this anniversary.');
      return;
    }
    try {
      setSaving(true);
      const anniversaryNames = eventEditor.household.members
        .filter((person) => anniversaryMemberIds.includes(person.id))
        .map((person) => `${person.firstName} ${person.lastName}`.trim());
      const nextEvent: ImportantEvent = {
        id: eventEditor.event?.id || crypto.randomUUID(),
        type: eventType,
        date: isCelebrationEvent(eventType) ? `${String(eventMonth).padStart(2, '0')}-${String(eventDay).padStart(2, '0')}` : eventDate,
        title: eventEditor.person ? (eventType === 'other' ? eventTitle.trim() : EVENT_TYPE_LABELS[eventType]) : anniversaryNames.join(' & '),
        ...(eventNotes.trim() ? { notes: eventNotes.trim() } : {}),
        ...(!eventEditor.person ? { memberIds: anniversaryMemberIds } : {}),
      };
      const nextHousehold = eventEditor.person
        ? {
            ...eventEditor.household,
            members: eventEditor.household.members.map((person) => {
              if (person.id !== eventEditor.person?.id) return person;
              const events = eventEditor.event
                ? person.importantEvents.map((event) => event.id === eventEditor.event?.id ? nextEvent : event)
                : [...person.importantEvents, nextEvent];
              return { ...person, importantEvents: sortEvents(events) };
            }),
          }
        : {
            ...eventEditor.household,
            importantEvents: sortEvents(eventEditor.event
              ? eventEditor.household.importantEvents.map((event) => event.id === eventEditor.event?.id ? nextEvent : event)
              : [...eventEditor.household.importantEvents, nextEvent]),
          };
      await updateDoc(doc(db, 'attendanceHouseholds', nextHousehold.id), {
        members: nextHousehold.members,
        importantEvents: nextHousehold.importantEvents,
        updatedAt: Timestamp.now(),
      });
      updateLocalHousehold(nextHousehold);
      setEventEditor(null);
    } catch (saveError) {
      console.error('Error saving member event:', saveError);
      setError('Failed to save member event.');
    } finally {
      setSaving(false);
    }
  };

  const deletePersonEvent = async (household: AttendanceHousehold, person: HouseholdPerson, event: ImportantEvent) => {
    if (!window.confirm(`Delete this ${EVENT_TYPE_LABELS[event.type].toLowerCase()} for ${person.firstName}?`)) return;
    try {
      const members = household.members.map((current) => current.id === person.id
        ? { ...current, importantEvents: current.importantEvents.filter((currentEvent) => currentEvent.id !== event.id) }
        : current);
      const nextHousehold = { ...household, members };
      await updateDoc(doc(db, 'attendanceHouseholds', household.id), { members, updatedAt: Timestamp.now() });
      updateLocalHousehold(nextHousehold);
    } catch (deleteError) {
      console.error('Error deleting member event:', deleteError);
      setError('Failed to delete member event.');
    }
  };

  const deleteHouseholdEvent = async (household: AttendanceHousehold, event: ImportantEvent) => {
    if (!window.confirm(`Delete this ${EVENT_TYPE_LABELS[event.type].toLowerCase()}?`)) return;
    try {
      const importantEvents = household.importantEvents.filter((currentEvent) => currentEvent.id !== event.id);
      const nextHousehold = { ...household, importantEvents };
      await updateDoc(doc(db, 'attendanceHouseholds', household.id), { importantEvents, updatedAt: Timestamp.now() });
      updateLocalHousehold(nextHousehold);
    } catch (deleteError) {
      console.error('Error deleting household event:', deleteError);
      setError('Failed to delete household event.');
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
        <button type="button" onClick={() => { setHouseholdName(''); setHouseholdStartDate(getSundayKey(new Date())); setAddingHousehold(true); }} className="inline-flex shrink-0 items-center rounded-md bg-[#D6805F] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#c56f4d]">
          <Plus className="mr-1.5 h-4 w-4" />Add Household
        </button>
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
                      <td className="border-t border-border px-4 py-3 text-charcoal"><div className="flex items-center gap-2"><button type="button" onClick={() => setExpandedIds((current) => current.includes(household.id) ? current.filter((id) => id !== household.id) : [...current, household.id])} className="rounded-md border border-border p-1 transition hover:border-coral hover:text-coral" aria-label={expanded ? 'Collapse household' : 'Expand household'}>{expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</button><span className="font-medium">{household.householdName}</span><button type="button" onClick={() => openHouseholdEditor(household)} className="rounded p-1 text-text-light transition hover:text-coral" aria-label={`Edit ${household.householdName}`}><Pencil className="h-3.5 w-3.5" /></button><button type="button" onClick={() => deleteHousehold(household)} className="rounded p-1 text-red-700 transition hover:text-red-900" aria-label={`Delete ${household.householdName}`}><Trash2 className="h-3.5 w-3.5" /></button></div></td>
                      <td className="border-t border-border px-4 py-3 text-charcoal">{format(household.availableFrom, 'MMMM d, yyyy')}</td>
                    </tr>
                    {expanded ? <tr key={`${household.id}-members`} className="bg-slate-50/60"><td colSpan={2} className="border-t border-border p-4"><div className="flex items-center justify-between"><h2 className="font-semibold text-charcoal">Household Members</h2><button type="button" onClick={() => openPersonEditor(household)} className="inline-flex items-center rounded-md border border-border px-3 py-1.5 text-sm font-medium text-charcoal transition hover:border-coral hover:text-coral"><UserPlus className="mr-1.5 h-4 w-4" />Add Member</button></div>
                      {household.members.length === 0 ? <p className="mt-3 text-sm text-text-light">No members added yet.</p> : <div className="mt-3 space-y-3">{household.members.map((person) => <div key={person.id} className="rounded-lg border border-border bg-white p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-medium text-charcoal">{person.firstName} {person.lastName}</h3>{person.importantEvents.length ? <div className="mt-2 space-y-1">{person.importantEvents.map((event) => <div key={event.id} className="flex items-center text-sm text-text-light"><span className="font-medium text-charcoal">{EVENT_TYPE_LABELS[event.type]}</span> • {formatEventDate(event)}{event.notes ? ` • ${event.notes}` : ''}<button type="button" onClick={() => openEventEditor(household, person, event)} className="ml-2 text-coral hover:underline">Edit</button><button type="button" onClick={() => deletePersonEvent(household, person, event)} className="ml-2 text-red-700 hover:underline">Delete</button></div>)}</div> : <p className="mt-1 text-sm text-text-light">No important events yet.</p>}</div><div className="flex gap-1"><button type="button" onClick={() => openEventEditor(household, person)} className="rounded border border-border p-1.5 transition hover:border-coral hover:text-coral" aria-label={`Add event for ${person.firstName}`}><Plus className="h-4 w-4" /></button><button type="button" onClick={() => openPersonEditor(household, person)} className="rounded border border-border p-1.5 transition hover:border-coral hover:text-coral" aria-label={`Edit ${person.firstName}`}><Pencil className="h-4 w-4" /></button><button type="button" onClick={() => deletePerson(household, person)} className="rounded border border-border p-1.5 text-red-700 transition hover:border-red-400" aria-label={`Delete ${person.firstName}`}><Trash2 className="h-4 w-4" /></button></div></div></div>)}</div>}
                      <div className="mt-4 border-t border-border pt-4"><div className="flex items-center justify-between gap-3"><div><h3 className="text-sm font-semibold text-charcoal">Household events</h3><p className="mt-1 text-xs text-text-light">Select the two household members celebrating an anniversary.</p></div><button type="button" onClick={() => openHouseholdAnniversaryEditor(household)} disabled={household.members.length < 2} className="inline-flex shrink-0 items-center rounded-md border border-border px-3 py-1.5 text-sm font-medium text-charcoal transition hover:border-coral hover:text-coral disabled:cursor-not-allowed disabled:opacity-50"><Plus className="mr-1.5 h-4 w-4" />Add Anniversary</button></div>{household.importantEvents.length ? <div className="mt-2 space-y-1">{household.importantEvents.map((event) => <div key={event.id} className="flex items-center text-sm text-text-light"><span className="font-medium text-charcoal">{EVENT_TYPE_LABELS[event.type]}</span> — {event.title} • {formatEventDate(event)}{event.type === 'anniversary' ? <button type="button" onClick={() => openHouseholdAnniversaryEditor(household, event)} className="ml-2 text-coral hover:underline">Edit</button> : null}<button type="button" onClick={() => deleteHouseholdEvent(household, event)} className="ml-2 text-red-700 hover:underline">Delete</button></div>)}</div> : null}</div>
                    </td></tr> : null}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {editingHousehold ? <Modal title="Edit Household" onClose={() => setEditingHousehold(null)}><label className="block"><span className="mb-2 block text-sm font-medium text-charcoal">Household Name</span><input value={householdName} onChange={(event) => setHouseholdName(event.target.value)} className="w-full rounded-md border border-border px-3 py-2" /></label><ModalActions saving={saving} onCancel={() => setEditingHousehold(null)} onSave={saveHouseholdName} label="Save Household" /></Modal> : null}
      {addingHousehold ? <Modal title="Add Household" onClose={() => setAddingHousehold(false)}><div className="space-y-4"><label className="block"><span className="mb-2 block text-sm font-medium text-charcoal">Household Name</span><input value={householdName} onChange={(event) => setHouseholdName(event.target.value)} className="w-full rounded-md border border-border px-3 py-2" /></label><label className="block"><span className="mb-2 block text-sm font-medium text-charcoal">Started Attending</span><input type="date" value={householdStartDate} onChange={(event) => setHouseholdStartDate(event.target.value)} className="w-full rounded-md border border-border px-3 py-2" /><span className="mt-1 block text-xs text-text-light">Attendance is tracked by Sunday; another day will be saved to that week&apos;s Sunday.</span></label></div><ModalActions saving={saving} onCancel={() => setAddingHousehold(false)} onSave={createHousehold} label="Add Household" /></Modal> : null}
      {personEditor ? <Modal title={personEditor.person ? 'Edit Member' : 'Add Member'} onClose={() => setPersonEditor(null)}><div className="grid grid-cols-2 gap-3"><label><span className="mb-2 block text-sm font-medium text-charcoal">First Name</span><input value={firstName} onChange={(event) => setFirstName(event.target.value)} className="w-full rounded-md border border-border px-3 py-2" /></label><label><span className="mb-2 block text-sm font-medium text-charcoal">Last Name</span><input value={lastName} onChange={(event) => setLastName(event.target.value)} className="w-full rounded-md border border-border px-3 py-2" /></label></div><ModalActions saving={saving} onCancel={() => setPersonEditor(null)} onSave={savePerson} label={personEditor.person ? 'Save Member' : 'Add Member'} /></Modal> : null}
      {eventEditor ? <Modal title={eventEditor.person ? `${eventEditor.person.firstName}'s Important Event` : 'Household Anniversary'} onClose={() => setEventEditor(null)}><div className="space-y-4">{eventEditor.person ? <label className="block"><span className="mb-2 block text-sm font-medium text-charcoal">Event Type</span><select value={eventType} onChange={(event) => setEventType(event.target.value as ImportantEventType)} className="w-full rounded-md border border-border px-3 py-2">{Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label> : <p className="text-sm text-text-light">This anniversary will be stored at the household level.</p>}{isCelebrationEvent(eventType) ? <div><span className="mb-2 block text-sm font-medium text-charcoal">Date</span><div className="grid grid-cols-2 gap-3"><select value={eventMonth} onChange={(event) => { const month = Number(event.target.value); setEventMonth(month); setEventDay((day) => Math.min(day, getDaysInMonth(month))); }} className="rounded-md border border-border px-3 py-2">{Array.from({ length: 12 }, (_, month) => <option key={month} value={month + 1}>{format(new Date(2000, month, 1), 'MMMM')}</option>)}</select><select value={eventDay} onChange={(event) => setEventDay(Number(event.target.value))} className="rounded-md border border-border px-3 py-2">{Array.from({ length: getDaysInMonth(eventMonth) }, (_, day) => <option key={day} value={day + 1}>{day + 1}</option>)}</select></div></div> : <label className="block"><span className="mb-2 block text-sm font-medium text-charcoal">Date</span><input type="date" value={eventDate} onChange={(event) => setEventDate(event.target.value)} className="w-full rounded-md border border-border px-3 py-2" /></label>}{!eventEditor.person ? <fieldset><legend className="mb-2 block text-sm font-medium text-charcoal">Members celebrating</legend><div className="space-y-2">{eventEditor.household.members.map((person) => <label key={person.id} className="flex items-center gap-2 text-sm text-charcoal"><input type="checkbox" checked={anniversaryMemberIds.includes(person.id)} onChange={() => setAnniversaryMemberIds((current) => current.includes(person.id) ? current.filter((id) => id !== person.id) : current.length < 2 ? [...current, person.id] : current)} className="h-4 w-4 rounded border-border text-coral focus:ring-coral" /><span>{person.firstName} {person.lastName}</span></label>)}</div><p className="mt-2 text-xs text-text-light">Choose exactly two members.</p></fieldset> : null}{eventType === 'other' ? <label className="block"><span className="mb-2 block text-sm font-medium text-charcoal">Event Description</span><input value={eventTitle} onChange={(event) => setEventTitle(event.target.value)} className="w-full rounded-md border border-border px-3 py-2" /></label> : null}<label className="block"><span className="mb-2 block text-sm font-medium text-charcoal">Notes</span><textarea value={eventNotes} onChange={(event) => setEventNotes(event.target.value)} rows={3} className="w-full rounded-md border border-border px-3 py-2" /></label></div><ModalActions saving={saving} onCancel={() => setEventEditor(null)} onSave={savePersonEvent} label={eventEditor.event ? 'Save Event' : 'Add Anniversary'} /></Modal> : null}
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return <div className="fixed inset-0 z-50"><div className="absolute inset-0 bg-black/30" onClick={onClose} /><div className="relative flex min-h-full items-center justify-center p-4"><div className="w-full max-w-lg rounded-xl bg-white shadow-xl"><div className="border-b border-border px-6 py-4"><h2 className="text-lg font-semibold text-charcoal">{title}</h2></div><div className="px-6 py-4">{children}</div></div></div></div>;
}

function ModalActions({ saving, onCancel, onSave, label }: { saving: boolean; onCancel: () => void; onSave: () => void; label: string }) {
  return <div className="mt-6 flex justify-end gap-2 border-t border-border pt-4"><button type="button" onClick={onCancel} className="rounded-md border border-border px-4 py-2 text-sm font-medium text-charcoal">Cancel</button><button type="button" onClick={onSave} disabled={saving} className="rounded-md bg-[#D6805F] px-4 py-2 text-sm font-medium text-white disabled:opacity-60">{saving ? 'Saving...' : label}</button></div>;
}
