'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase/config';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc, updateDoc, Timestamp } from 'firebase/firestore';
import BackButton from '@/components/BackButton';
import { VolunteerOpportunityItem } from '@/hooks/useVolunteerOpportunities';
import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline';

export default function VolunteerOpportunityManagement() {
  useEffect(() => {
    document.title = 'Volunteer Opportunity Management | Sioux Falls Church of Christ';
  }, []);

  const { userProfile } = useAuth();
  const router = useRouter();
  const [opportunities, setOpportunities] = useState<VolunteerOpportunityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState({
    title: '',
    description: '',
    dateTime: '',
    location: '',
    contactEmail: '',
    contactPhone: '',
    maxVolunteers: 1,
  });

  useEffect(() => {
    if (userProfile && !userProfile.isAdmin) {
      router.push('/');
    }
  }, [userProfile, router]);

  useEffect(() => {
    // Fetch all volunteer opportunities (not just approved/open)
    const q = query(
      collection(db, 'volunteerOpportunities'),
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
            dateTime: (data.dateTime as Timestamp)?.toDate() || new Date(),
            createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
            volunteers: data.volunteers || [],
            currentVolunteers: data.currentVolunteers || 0
          } as VolunteerOpportunityItem;
        });
        setOpportunities(items);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error fetching volunteer opportunities:', err);
        setError('Failed to load volunteer opportunities');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleEdit = (opportunity: VolunteerOpportunityItem) => {
    setEditingId(opportunity.id);
    setEditFormData({
      title: opportunity.title,
      description: opportunity.description,
      dateTime: opportunity.dateTime.toISOString().slice(0, 16),
      location: opportunity.location,
      contactEmail: opportunity.contactEmail,
      contactPhone: opportunity.contactPhone || '',
      maxVolunteers: opportunity.maxVolunteers,
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditFormData({
      title: '',
      description: '',
      dateTime: '',
      location: '',
      contactEmail: '',
      contactPhone: '',
      maxVolunteers: 1,
    });
  };

  const handleSaveEdit = async (id: string) => {
    try {
      const docRef = doc(db, 'volunteerOpportunities', id);
      await updateDoc(docRef, {
        title: editFormData.title,
        description: editFormData.description,
        dateTime: Timestamp.fromDate(new Date(editFormData.dateTime)),
        location: editFormData.location,
        contactEmail: editFormData.contactEmail,
        contactPhone: editFormData.contactPhone || null,
        maxVolunteers: editFormData.maxVolunteers,
        updatedAt: Timestamp.now()
      });
      setEditingId(null);
      setError(null);
    } catch (err) {
      console.error('Error updating opportunity:', err);
      setError('Failed to update volunteer opportunity');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this volunteer opportunity? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'volunteerOpportunities', id));
      setError(null);
    } catch (err) {
      console.error('Error deleting opportunity:', err);
      setError('Failed to delete volunteer opportunity');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-green-100 text-green-800';
      case 'closed':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDateTime = (date: Date) => {
    try {
      return `${date.toLocaleDateString()} at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } catch (error) {
      return 'Date not available';
    }
  };

  if (!userProfile?.isAdmin) {
    return null;
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E88B5F]"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex items-center">
        <BackButton className="mr-4" />
        <h1 className="text-3xl font-bold text-charcoal">Volunteer Opportunity Management</h1>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Title
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date & Time
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Volunteers
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created By
                </th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {opportunities.map((opportunity) => (
                editingId === opportunity.id ? (
                  <tr key={opportunity.id} className="bg-blue-50">
                    <td colSpan={7} className="px-6 py-4">
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-charcoal mb-1">Title</label>
                            <input
                              type="text"
                              value={editFormData.title}
                              onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-white text-charcoal"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-charcoal mb-1">Date & Time</label>
                            <input
                              type="datetime-local"
                              value={editFormData.dateTime}
                              onChange={(e) => setEditFormData({ ...editFormData, dateTime: e.target.value })}
                              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-white text-charcoal"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-charcoal mb-1">Description</label>
                          <textarea
                            value={editFormData.description}
                            onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                            rows={4}
                            className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-white text-charcoal resize-none"
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-charcoal mb-1">Location</label>
                            <input
                              type="text"
                              value={editFormData.location}
                              onChange={(e) => setEditFormData({ ...editFormData, location: e.target.value })}
                              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-white text-charcoal"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-charcoal mb-1">Contact Email</label>
                            <input
                              type="email"
                              value={editFormData.contactEmail}
                              onChange={(e) => setEditFormData({ ...editFormData, contactEmail: e.target.value })}
                              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-white text-charcoal"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-charcoal mb-1">Contact Phone</label>
                            <input
                              type="tel"
                              value={editFormData.contactPhone}
                              onChange={(e) => setEditFormData({ ...editFormData, contactPhone: e.target.value })}
                              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-white text-charcoal"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-charcoal mb-1">Max Volunteers</label>
                          <input
                            type="number"
                            min="1"
                            value={editFormData.maxVolunteers}
                            onChange={(e) => setEditFormData({ ...editFormData, maxVolunteers: parseInt(e.target.value) || 1 })}
                            className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-white text-charcoal"
                          />
                        </div>
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={handleCancelEdit}
                            className="px-4 py-2 border border-border rounded-md text-charcoal hover:bg-gray-50 transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleSaveEdit(opportunity.id)}
                            className="px-4 py-2 bg-[#E88B5F] text-white rounded-md hover:bg-[#D6714A] transition-colors"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={opportunity.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-charcoal">{opportunity.title}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{formatDateTime(opportunity.dateTime)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{opportunity.location}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {opportunity.currentVolunteers} / {opportunity.maxVolunteers}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(opportunity.status)}`}>
                        {opportunity.status.charAt(0).toUpperCase() + opportunity.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{opportunity.createdBy?.displayName || 'Unknown'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleEdit(opportunity)}
                          className="text-[#E88B5F] hover:text-[#D6714A] p-1 rounded hover:bg-[#E88B5F]/10 transition-colors"
                          title="Edit"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(opportunity.id)}
                          className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50 transition-colors"
                          title="Delete"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              ))}
            </tbody>
          </table>
          {opportunities.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No volunteer opportunities found.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
