'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase/config';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  updateDoc,
  deleteDoc,
  doc,
  Timestamp
} from 'firebase/firestore';
import { CheckIcon, XMarkIcon, PencilIcon } from '@heroicons/react/24/outline';

interface PendingOpportunity {
  id: string;
  title: string;
  description: string;
  dateTime: Date;
  location: string;
  contactEmail: string;
  contactPhone?: string;
  maxVolunteers: number;
  createdBy: {
    uid: string;
    displayName: string;
  };
  createdAt: Date;
  approvalStatus: 'pending';
}

interface EditingItem {
  id: string;
  title: string;
  description: string;
  dateTime: string;
  location: string;
  contactEmail: string;
  contactPhone: string;
  maxVolunteers: number;
}

export default function VolunteerOpportunityApprovalQueue() {
  const [pendingItems, setPendingItems] = useState<PendingOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<EditingItem | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, 'volunteerOpportunities'),
      where('approvalStatus', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            dateTime: (data.dateTime as Timestamp).toDate(),
            createdAt: (data.createdAt as Timestamp).toDate()
          } as PendingOpportunity;
        });
        setPendingItems(items);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching pending volunteer opportunities:', err);
        setError('Failed to load pending opportunities');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleApprove = async (id: string) => {
    try {
      const docRef = doc(db, 'volunteerOpportunities', id);
      
      // If editing, update with new values
      if (editingItem?.id === id) {
        await updateDoc(docRef, {
          title: editingItem.title,
          description: editingItem.description,
          dateTime: Timestamp.fromDate(new Date(editingItem.dateTime)),
          location: editingItem.location,
          contactEmail: editingItem.contactEmail,
          contactPhone: editingItem.contactPhone || null,
          maxVolunteers: editingItem.maxVolunteers,
          approvalStatus: 'approved'
        });
      } else {
        // Just approve without changes
        await updateDoc(docRef, {
          approvalStatus: 'approved'
        });
      }

      setEditingItem(null);
    } catch (err) {
      console.error('Failed to approve opportunity:', err);
      alert('Failed to approve opportunity. Please try again.');
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm('Are you sure you want to reject this volunteer opportunity? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'volunteerOpportunities', id));
      if (editingItem?.id === id) {
        setEditingItem(null);
      }
    } catch (err) {
      console.error('Failed to reject opportunity:', err);
      alert('Failed to reject opportunity. Please try again.');
    }
  };

  const handleEdit = (item: PendingOpportunity) => {
    setEditingItem({
      id: item.id,
      title: item.title,
      description: item.description,
      dateTime: item.dateTime.toISOString().slice(0, 16),
      location: item.location,
      contactEmail: item.contactEmail,
      contactPhone: item.contactPhone || '',
      maxVolunteers: item.maxVolunteers
    });
  };

  const handleCancelEdit = () => {
    setEditingItem(null);
  };

  const formatDateTime = (date: Date) => {
    return `${date.toLocaleDateString()} at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  if (loading) {
    return (
      <div className="text-center py-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-coral mx-auto"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-error text-center py-4">
        {error}
      </div>
    );
  }

  if (pendingItems.length === 0) {
    return (
      <div className="text-text-muted text-center py-4">
        No pending volunteer opportunities to approve.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {pendingItems.map((item) => (
        <div
          key={item.id}
          className="border border-sage/20 rounded-lg p-4 bg-card hover:shadow-md transition-shadow"
        >
          {editingItem?.id === item.id ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1">Title</label>
                <input
                  type="text"
                  value={editingItem.title}
                  onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-card text-charcoal"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1">Description</label>
                <textarea
                  value={editingItem.description}
                  onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-card text-charcoal resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-charcoal mb-1">Date & Time</label>
                  <input
                    type="datetime-local"
                    value={editingItem.dateTime}
                    onChange={(e) => setEditingItem({ ...editingItem, dateTime: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-card text-charcoal"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-charcoal mb-1">Location</label>
                  <input
                    type="text"
                    value={editingItem.location}
                    onChange={(e) => setEditingItem({ ...editingItem, location: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-card text-charcoal"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-charcoal mb-1">Contact Email</label>
                  <input
                    type="email"
                    value={editingItem.contactEmail}
                    onChange={(e) => setEditingItem({ ...editingItem, contactEmail: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-card text-charcoal"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-charcoal mb-1">Contact Phone</label>
                  <input
                    type="tel"
                    value={editingItem.contactPhone}
                    onChange={(e) => setEditingItem({ ...editingItem, contactPhone: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-card text-charcoal"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-charcoal mb-1">Max Volunteers</label>
                <input
                  type="number"
                  min="1"
                  value={editingItem.maxVolunteers}
                  onChange={(e) => setEditingItem({ ...editingItem, maxVolunteers: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-card text-charcoal"
                />
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={() => handleApprove(item.id)}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  <CheckIcon className="h-4 w-4 mr-1" />
                  Save & Approve
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="inline-flex items-center px-3 py-2 border border-border text-sm font-medium rounded shadow-sm text-charcoal bg-card hover:bg-bg-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-border"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-charcoal">{item.title}</h3>
                  <p className="text-sm text-text-light">
                    Submitted by {item.createdBy.displayName} • {formatDateTime(item.createdAt)}
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-sm mb-4">
                <p className="text-text">{item.description}</p>
                
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <span className="font-medium text-charcoal">Event Time:</span>
                    <span className="text-text-light ml-2">{formatDateTime(item.dateTime)}</span>
                  </div>
                  <div>
                    <span className="font-medium text-charcoal">Location:</span>
                    <span className="text-text-light ml-2">{item.location}</span>
                  </div>
                  <div>
                    <span className="font-medium text-charcoal">Volunteers Needed:</span>
                    <span className="text-text-light ml-2">{item.maxVolunteers}</span>
                  </div>
                  <div>
                    <span className="font-medium text-charcoal">Contact:</span>
                    <span className="text-text-light ml-2">{item.contactEmail}</span>
                  </div>
                  {item.contactPhone && (
                    <div>
                      <span className="font-medium text-charcoal">Phone:</span>
                      <span className="text-text-light ml-2">{item.contactPhone}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={() => handleEdit(item)}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <PencilIcon className="h-4 w-4 mr-1" />
                  Edit
                </button>
                <button
                  onClick={() => handleApprove(item.id)}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  <CheckIcon className="h-4 w-4 mr-1" />
                  Approve
                </button>
                <button
                  onClick={() => handleReject(item.id)}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  <XMarkIcon className="h-4 w-4 mr-1" />
                  Reject
                </button>
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

