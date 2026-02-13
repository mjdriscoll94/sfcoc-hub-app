'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { useRouter } from 'next/navigation';
import BackButton from '@/components/BackButton';
import ConfirmationModal from '@/components/ConfirmationModal';
import RichTextEditor from '@/components/RichTextEditor';
import RichTextContent from '@/components/RichTextContent';
import {
  useAnnouncementsAdmin,
  AdminAnnouncementItem,
  AnnouncementType,
} from '@/hooks/useAnnouncementsAdmin';
import { PencilIcon, TrashIcon, ArchiveBoxIcon } from '@heroicons/react/24/outline';
import { ROLE_PERMISSIONS } from '@/types/roles';

const ANNOUNCEMENT_TYPES: AnnouncementType[] = [
  'General',
  'Weekly',
  'KFC',
  'Youth',
  'Young Adult',
];

export default function ManageAnnouncementsPage() {
  useEffect(() => {
    document.title = 'Manage Announcements | Sioux Falls Church of Christ';
  }, []);

  const { userProfile } = useAuth();
  const router = useRouter();
  const {
    items,
    loading,
    error,
    updateAnnouncement,
    deleteAnnouncement,
  } = useAnnouncementsAdmin();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    title: string;
    content: string;
    type: AnnouncementType;
    status: 'active' | 'archived';
  }>({
    title: '',
    content: '',
    type: 'General',
    status: 'active',
  });
  const [itemToDelete, setItemToDelete] = useState<AdminAnnouncementItem | null>(null);
  const [itemToArchive, setItemToArchive] = useState<AdminAnnouncementItem | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const canManage =
    userProfile?.isAdmin ||
    (userProfile?.role && ROLE_PERMISSIONS[userProfile.role]?.canManageAnnouncements);

  useEffect(() => {
    if (userProfile && !canManage) {
      router.push('/');
    }
  }, [userProfile, canManage, router]);

  const startEdit = (item: AdminAnnouncementItem) => {
    setEditingId(item.id);
    setEditForm({
      title: item.title,
      content: typeof item.content === 'string' ? item.content : JSON.stringify(item.content),
      type: item.type,
      status: item.status,
    });
    setSaveError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setSaveError(null);
  };

  const handleSave = async () => {
    if (!editingId) return;
    setSaveError(null);
    try {
      await updateAnnouncement(editingId, {
        title: editForm.title.trim(),
        content: editForm.content.trim(),
        type: editForm.type,
        status: editForm.status,
      });
      cancelEdit();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save');
    }
  };

  const handleDeleteClick = (item: AdminAnnouncementItem) => {
    setItemToDelete(item);
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;
    try {
      await deleteAnnouncement(itemToDelete.id);
      setItemToDelete(null);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  const handleArchiveClick = (item: AdminAnnouncementItem) => {
    setItemToArchive(item);
  };

  const handleArchiveConfirm = async () => {
    if (!itemToArchive) return;
    try {
      await updateAnnouncement(itemToArchive.id, { status: 'archived' });
      setItemToArchive(null);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to archive');
    }
  };

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentItems = items.filter((item) => item.createdAt >= thirtyDaysAgo);
  const olderItems = items.filter((item) => item.createdAt < thirtyDaysAgo);

  if (!canManage) return null;

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-center items-center min-h-[300px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-coral"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex items-center">
        <BackButton className="mr-4" />
        <h1 className="text-3xl font-bold text-charcoal">Manage Announcements</h1>
      </div>

      {(error || saveError) && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600">{error || saveError}</p>
        </div>
      )}

      <p className="text-text-light mb-6">
        View, edit, or delete announcements. Changes take effect immediately.
      </p>

      {items.length === 0 ? (
        <div className="bg-white rounded-lg border border-border p-8 text-center">
          <p className="text-text-light">No announcements in the system.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {[
            { label: null as string | null, items: recentItems },
            { label: 'Older than 30 days', items: olderItems },
          ]
            .filter((s) => s.items.length > 0)
            .map((section) => (
              <div key={section.label ?? 'recent'} className="space-y-4">
                {section.label && (
                  <h2 className="text-lg font-semibold text-charcoal border-b border-border pb-2">
                    {section.label}
                  </h2>
                )}
                {section.items.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-lg border border-border p-4 shadow-sm"
            >
              {editingId === item.id ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-charcoal mb-1">Title</label>
                    <input
                      type="text"
                      value={editForm.title}
                      onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-coral bg-white text-charcoal"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-charcoal mb-1">Type</label>
                    <select
                      value={editForm.type}
                      onChange={(e) =>
                        setEditForm({ ...editForm, type: e.target.value as AnnouncementType })
                      }
                      className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-coral bg-white text-charcoal"
                    >
                      {ANNOUNCEMENT_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-charcoal mb-1">Status</label>
                    <select
                      value={editForm.status}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          status: e.target.value as 'active' | 'archived',
                        })
                      }
                      className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-coral bg-white text-charcoal"
                    >
                      <option value="active">Active</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-charcoal mb-1">Content</label>
                    <RichTextEditor
                      content={editForm.content}
                      onChange={(content) => setEditForm({ ...editForm, content })}
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="px-4 py-2 border border-border rounded-md text-charcoal hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSave}
                      className="px-4 py-2 bg-coral text-white rounded-md hover:bg-coral-dark"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium bg-coral/20 text-coral">
                          {item.type}
                        </span>
                        <span
                          className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${
                            item.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold text-charcoal mt-2">{item.title}</h3>
                      <p className="text-sm text-text-light mt-1">
                        {item.createdBy?.displayName ?? 'Unknown'} ·{' '}
                        {item.createdAt.toLocaleDateString()}
                      </p>
                      <div className="text-charcoal text-sm mt-2 prose prose-sm max-w-none rich-text-content">
                        <RichTextContent content={item.content} />
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => startEdit(item)}
                        className="p-2 text-coral hover:bg-coral/10 rounded-md transition-colors"
                        title="Edit"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      {item.status === 'active' && (
                        <button
                          type="button"
                          onClick={() => handleArchiveClick(item)}
                          className="p-2 text-amber-600 hover:bg-amber-50 rounded-md transition-colors"
                          title="Archive"
                        >
                          <ArchiveBoxIcon className="h-5 w-5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteClick(item)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        title="Delete"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
                ))}
              </div>
            ))}
        </div>
      )}

      <ConfirmationModal
        isOpen={!!itemToArchive}
        onClose={() => setItemToArchive(null)}
        onConfirm={handleArchiveConfirm}
        title="Archive announcement?"
        message={
          itemToArchive
            ? `Archive "${itemToArchive.title}"? It will no longer appear on the public announcements page.`
            : ''
        }
        confirmText="Archive"
        cancelText="Cancel"
      />
      <ConfirmationModal
        isOpen={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete announcement?"
        message={
          itemToDelete
            ? `Are you sure you want to permanently delete "${itemToDelete.title}"? This cannot be undone.`
            : ''
        }
        confirmText="Delete"
        cancelText="Cancel"
      />
    </div>
  );
}
