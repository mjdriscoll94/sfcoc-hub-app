'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase/config';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import BackButton from '@/components/BackButton';
import { EventCategory, HomePageEvent, HomePageEventIcon } from '@/types';
import {
  PencilIcon,
  TrashIcon,
  PlusIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline';
import ConfirmationModal from '@/components/ConfirmationModal';
import EventIcon from '@/components/EventIcon';

const ICON_OPTIONS: { value: HomePageEventIcon; label: string }[] = [
  { value: 'church', label: 'Church / Home' },
  { value: 'book', label: 'Book / Study' },
  { value: 'people', label: 'People / Group' },
];

const DEFAULT_EVENTS: Omit<EventCategory, 'id'>[] = [
  {
    title: 'Group Events',
    order: 0,
    events: [
      {
        name: 'Sunday Service',
        time: '9:45AM - 12:00PM',
        day: 'Every Sunday',
        description: 'Join us for worship, fellowship, and bible classes',
        icon: 'church',
      },
      {
        name: 'Wednesday Study',
        time: '7:00 PM',
        day: 'Every Wednesday',
        description: "Deep dive into God's word",
        icon: 'book',
      },
      {
        name: '4th Sunday Fellowship',
        time: '5:00 PM',
        day: 'Last Sunday of each month',
        description: 'Food and fellowship',
        icon: 'book',
      },
      {
        name: '5th Sunday Singing',
        time: '5:00 PM',
        day: 'Each 5th Sunday of a month',
        description: 'Worship and a shared meal with other congregations',
        icon: 'book',
      },
    ],
  },
  {
    title: "Men's Events",
    order: 1,
    events: [
      {
        name: "Men's Bible Study",
        time: '8:30 PM',
        day: 'Every Thursday',
        description: 'Bible study and discussion for men',
        icon: 'book',
      },
      {
        name: "Men's Breakfast",
        time: '8:00 AM',
        day: 'Last Saturday of each month',
        description: 'Breakfast and fellowship for men',
        icon: 'people',
      },
    ],
  },
  {
    title: "Women's Events",
    order: 2,
    events: [
      {
        name: 'Ladies Bible Study',
        time: '8:30 AM',
        day: 'Every Other Thursday',
        description: 'Bible study and discussion for ladies',
        icon: 'book',
      },
    ],
  },
  {
    title: 'Youth Events',
    order: 3,
    events: [
      {
        name: 'Youth Group',
        time: '7:00 PM',
        day: 'Every Wednesday',
        description: 'Bible Study classes for youth',
        icon: 'people',
      },
      {
        name: 'Youth/Young Adults Bible Study',
        time: '7:00 PM',
        day: 'One Saturday of each month',
        description: 'Bible study and discussion for youth and young adults',
        icon: 'book',
      },
    ],
  },
];

export default function EventsManagement() {
  useEffect(() => {
    document.title = 'Home Page Events | Sioux Falls Church of Christ';
  }, []);

  const { userProfile } = useAuth();
  const router = useRouter();
  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingEventKey, setEditingEventKey] = useState<string | null>(null);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [showEventForm, setShowEventForm] = useState<string | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<EventCategory | null>(null);
  const [eventToDelete, setEventToDelete] = useState<{ category: EventCategory; event: HomePageEvent; index: number } | null>(null);
  const [isDeleteCategoryOpen, setIsDeleteCategoryOpen] = useState(false);
  const [isDeleteEventOpen, setIsDeleteEventOpen] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const [categoryForm, setCategoryForm] = useState({ title: '' });
  const [eventForm, setEventForm] = useState<Omit<HomePageEvent, 'id'>>({
    name: '',
    time: '',
    day: '',
    description: '',
    icon: 'book',
  });

  useEffect(() => {
    if (userProfile && !userProfile.isAdmin) {
      router.push('/');
    }
  }, [userProfile, router]);

  useEffect(() => {
    const q = query(
      collection(db, 'eventCategories'),
      orderBy('order', 'asc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((docSnap) => {
          const d = docSnap.data();
          return {
            id: docSnap.id,
            title: d.title || '',
            order: d.order ?? 0,
            events: (d.events || []).map((e: Record<string, unknown>, i: number) => ({
              id: e.id ?? `event-${i}`,
              name: e.name || '',
              time: e.time || '',
              day: e.day || '',
              description: e.description || '',
              icon: (e.icon as HomePageEventIcon) || 'book',
            })),
          } as EventCategory;
        });
        setCategories(data);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error fetching event categories:', err);
        setError('Failed to load events');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const toggleCategory = (id: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const resetCategoryForm = () => {
    setCategoryForm({ title: '' });
    setEditingCategoryId(null);
    setShowCategoryForm(false);
  };

  const resetEventForm = () => {
    setEventForm({
      name: '',
      time: '',
      day: '',
      description: '',
      icon: 'book',
    });
    setEditingEventKey(null);
    setShowEventForm(null);
  };

  const handleCreateCategory = () => {
    resetCategoryForm();
    setShowCategoryForm(true);
  };

  const handleEditCategory = (cat: EventCategory) => {
    setCategoryForm({ title: cat.title });
    setEditingCategoryId(cat.id);
    setShowCategoryForm(false);
  };

  const handleSaveCategory = async () => {
    if (!userProfile || !categoryForm.title.trim()) return;
    try {
      if (editingCategoryId) {
        await updateDoc(doc(db, 'eventCategories', editingCategoryId), {
          title: categoryForm.title.trim(),
          updatedAt: Timestamp.now(),
        });
      } else {
        const maxOrder = categories.reduce((m, c) => Math.max(m, c.order), -1);
        await addDoc(collection(db, 'eventCategories'), {
          title: categoryForm.title.trim(),
          order: maxOrder + 1,
          events: [],
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          createdBy: userProfile.uid,
        });
      }
      resetCategoryForm();
      setError(null);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to save category');
    }
  };

  const handleDeleteCategory = async () => {
    if (!categoryToDelete) return;
    try {
      await deleteDoc(doc(db, 'eventCategories', categoryToDelete.id));
      setCategoryToDelete(null);
      setIsDeleteCategoryOpen(false);
      setError(null);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to delete category');
    }
  };

  const handleCreateEvent = (categoryId: string) => {
    resetEventForm();
    setShowEventForm(categoryId);
  };

  const handleEditEvent = (category: EventCategory, event: HomePageEvent, index: number) => {
    setEventForm({
      name: event.name,
      time: event.time,
      day: event.day,
      description: event.description,
      icon: event.icon,
    });
    setEditingEventKey(`${category.id}-${index}`);
    setShowEventForm(null);
  };

  const handleSaveEvent = async () => {
    if (!userProfile) return;
    const catId = showEventForm || (editingEventKey ? editingEventKey.split('-')[0] : null);
    if (!catId) return;

    const cat = categories.find((c) => c.id === catId);
    if (!cat) return;

    const eventData = {
      name: eventForm.name.trim(),
      time: eventForm.time.trim(),
      day: eventForm.day.trim(),
      description: eventForm.description.trim(),
      icon: eventForm.icon,
    };

    try {
      const events = [...cat.events];
      if (editingEventKey) {
        const idx = parseInt(editingEventKey.split('-')[1] ?? '0', 10);
        events[idx] = { ...events[idx], ...eventData };
      } else {
        events.push(eventData);
      }

      await updateDoc(doc(db, 'eventCategories', catId), {
        events,
        updatedAt: Timestamp.now(),
      });
      resetEventForm();
      setError(null);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to save event');
    }
  };

  const handleDeleteEvent = async () => {
    if (!eventToDelete) return;
    const { category, index } = eventToDelete;
    const events = [...category.events];
    events.splice(index, 1);
    try {
      await updateDoc(doc(db, 'eventCategories', category.id), {
        events,
        updatedAt: Timestamp.now(),
      });
      setEventToDelete(null);
      setIsDeleteEventOpen(false);
      setError(null);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to delete event');
    }
  };

  const handleSeedDefaults = async () => {
    if (!userProfile || categories.length > 0) return;
    setSeeding(true);
    setError(null);
    try {
      const batch = writeBatch(db);
      const col = collection(db, 'eventCategories');
      for (let i = 0; i < DEFAULT_EVENTS.length; i++) {
        const d = DEFAULT_EVENTS[i];
        const ref = doc(col);
        batch.set(ref, {
          ...d,
          order: i,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          createdBy: userProfile.uid,
        });
      }
      await batch.commit();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to seed default events');
    } finally {
      setSeeding(false);
    }
  };

  const moveCategory = async (cat: EventCategory, direction: 'up' | 'down') => {
    const idx = categories.findIndex((c) => c.id === cat.id);
    if (idx < 0) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= categories.length) return;
    const other = categories[swapIdx];
    try {
      await Promise.all([
        updateDoc(doc(db, 'eventCategories', cat.id), {
          order: other.order,
          updatedAt: Timestamp.now(),
        }),
        updateDoc(doc(db, 'eventCategories', other.id), {
          order: cat.order,
          updatedAt: Timestamp.now(),
        }),
      ]);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to reorder');
    }
  };

  if (!userProfile?.isAdmin) return null;

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-coral"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center">
          <BackButton className="mr-4" />
          <h1 className="text-3xl font-bold text-charcoal">Home Page Events</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {categories.length === 0 && (
            <button
              onClick={handleSeedDefaults}
              disabled={seeding}
              className="inline-flex items-center px-4 py-2 bg-sage text-white rounded-lg hover:bg-sage/90 transition-colors disabled:opacity-50"
            >
              {seeding ? 'Seeding...' : 'Load default events'}
            </button>
          )}
          <button
            onClick={handleCreateCategory}
            className="inline-flex items-center px-4 py-2 bg-coral text-white rounded-lg hover:bg-coral-dark transition-colors"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Add category
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Category form */}
      {(showCategoryForm || editingCategoryId) && (
        <div className="mb-6 p-6 bg-white rounded-lg border border-border">
          <h2 className="text-xl font-semibold text-charcoal mb-4">
            {editingCategoryId ? 'Edit category' : 'New category'}
          </h2>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-charcoal mb-1">Category title</label>
              <input
                type="text"
                value={categoryForm.title}
                onChange={(e) => setCategoryForm({ title: e.target.value })}
                placeholder="e.g. Group Events"
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-coral bg-white text-charcoal"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={resetCategoryForm}
                className="px-4 py-2 border border-border rounded-md text-charcoal hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCategory}
                disabled={!categoryForm.title.trim()}
                className="px-4 py-2 bg-coral text-white rounded-md hover:bg-coral-dark disabled:opacity-50"
              >
                {editingCategoryId ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Event form (inline for a category) */}
      {(showEventForm || editingEventKey) && (
        <div className="mb-6 p-6 bg-white rounded-lg border border-border">
          <h2 className="text-xl font-semibold text-charcoal mb-4">
            {editingEventKey ? 'Edit event' : 'New event'}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Event name</label>
              <input
                type="text"
                value={eventForm.name}
                onChange={(e) => setEventForm({ ...eventForm, name: e.target.value })}
                placeholder="e.g. Sunday Service"
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-coral bg-white text-charcoal"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Time</label>
              <input
                type="text"
                value={eventForm.time}
                onChange={(e) => setEventForm({ ...eventForm, time: e.target.value })}
                placeholder="e.g. 9:45AM - 12:00PM"
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-coral bg-white text-charcoal"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Day</label>
              <input
                type="text"
                value={eventForm.day}
                onChange={(e) => setEventForm({ ...eventForm, day: e.target.value })}
                placeholder="e.g. Every Sunday"
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-coral bg-white text-charcoal"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Icon</label>
              <select
                value={eventForm.icon}
                onChange={(e) => setEventForm({ ...eventForm, icon: e.target.value as HomePageEventIcon })}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-coral bg-white text-charcoal"
              >
                {ICON_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-charcoal mb-1">Description</label>
              <textarea
                value={eventForm.description}
                onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                rows={3}
                placeholder="Brief description of the event"
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-coral bg-white text-charcoal resize-none"
              />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={resetEventForm}
              className="px-4 py-2 border border-border rounded-md text-charcoal hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveEvent}
              disabled={!eventForm.name.trim()}
              className="px-4 py-2 bg-coral text-white rounded-md hover:bg-coral-dark disabled:opacity-50"
            >
              {editingEventKey ? 'Update' : 'Add event'}
            </button>
          </div>
        </div>
      )}

      {/* Categories list */}
      <div className="space-y-4">
        {categories.length === 0 && !showCategoryForm ? (
          <div className="text-center py-12 bg-white rounded-lg border border-border">
            <p className="text-text-light mb-4">No event categories yet.</p>
            <p className="text-text-light text-sm mb-4">Click &quot;Load default events&quot; to use the current home page events, or add a category to start from scratch.</p>
            <button
              onClick={handleCreateCategory}
              className="inline-flex items-center px-4 py-2 bg-coral text-white rounded-lg hover:bg-coral-dark"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Add category
            </button>
          </div>
        ) : (
          categories.map((cat, catIndex) => (
            <div
              key={cat.id}
              className="bg-white rounded-lg border border-border overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-coral/5 to-sage/5">
                <button
                  onClick={() => toggleCategory(cat.id)}
                  className="flex items-center gap-2 text-left flex-1"
                >
                  {expandedCategories.has(cat.id) ? (
                    <ChevronDownIcon className="h-5 w-5 text-coral" />
                  ) : (
                    <ChevronUpIcon className="h-5 w-5 text-coral rotate-180" />
                  )}
                  <span className="font-semibold text-charcoal">{cat.title}</span>
                  <span className="text-text-light text-sm">({cat.events.length} events)</span>
                </button>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => moveCategory(cat, 'up')}
                    disabled={catIndex === 0}
                    className="p-2 text-coral hover:bg-coral/10 rounded disabled:opacity-40"
                    title="Move up"
                  >
                    <ChevronUpIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => moveCategory(cat, 'down')}
                    disabled={catIndex === categories.length - 1}
                    className="p-2 text-coral hover:bg-coral/10 rounded disabled:opacity-40"
                    title="Move down"
                  >
                    <ChevronDownIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleEditCategory(cat)}
                    className="p-2 text-coral hover:bg-coral/10 rounded"
                    title="Edit category"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      setCategoryToDelete(cat);
                      setIsDeleteCategoryOpen(true);
                    }}
                    className="p-2 text-red-600 hover:bg-red-50 rounded"
                    title="Delete category"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleCreateEvent(cat.id)}
                    className="inline-flex items-center px-3 py-1.5 text-sm bg-coral text-white rounded hover:bg-coral-dark"
                  >
                    <PlusIcon className="h-4 w-4 mr-1" />
                    Event
                  </button>
                </div>
              </div>

              {expandedCategories.has(cat.id) && (
                <div className="p-4 border-t border-border">
                  {cat.events.length === 0 ? (
                    <p className="text-text-light text-sm mb-4">No events. Add one with the button above.</p>
                  ) : (
                    <div className="space-y-3">
                      {cat.events.map((evt, evtIndex) => (
                        <div
                          key={evt.id ?? evtIndex}
                          className="flex items-start gap-4 p-3 bg-card rounded-lg border border-border"
                        >
                          <div className="flex-shrink-0 p-2 bg-gradient-to-br from-coral/20 to-sage/20 rounded-full">
                            <EventIcon icon={evt.icon} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-charcoal">{evt.name}</h4>
                            <p className="text-coral text-sm">{evt.time}</p>
                            <p className="text-sage text-sm">{evt.day}</p>
                            <p className="text-text-light text-sm">{evt.description}</p>
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            <button
                              onClick={() => handleEditEvent(cat, evt, evtIndex)}
                              className="p-2 text-coral hover:bg-coral/10 rounded"
                              title="Edit"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => {
                                setEventToDelete({ category: cat, event: evt, index: evtIndex });
                                setIsDeleteEventOpen(true);
                              }}
                              className="p-2 text-red-600 hover:bg-red-50 rounded"
                              title="Delete"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <ConfirmationModal
        isOpen={isDeleteCategoryOpen}
        onClose={() => {
          setIsDeleteCategoryOpen(false);
          setCategoryToDelete(null);
        }}
        onConfirm={handleDeleteCategory}
        title="Delete category"
        message={
          categoryToDelete
            ? `Are you sure you want to delete "${categoryToDelete.title}"? All events in this category will be removed.`
            : ''
        }
        confirmText="Delete"
        cancelText="Cancel"
      />

      <ConfirmationModal
        isOpen={isDeleteEventOpen}
        onClose={() => {
          setIsDeleteEventOpen(false);
          setEventToDelete(null);
        }}
        onConfirm={handleDeleteEvent}
        title="Delete event"
        message={
          eventToDelete
            ? `Are you sure you want to delete "${eventToDelete.event.name}"?`
            : ''
        }
        confirmText="Delete"
        cancelText="Cancel"
      />
    </div>
  );
}
