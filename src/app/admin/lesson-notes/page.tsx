'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { db } from '@/lib/firebase/config';
import { collection, addDoc, Timestamp, getDocs, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { Upload, FileText, Trash2, ExternalLink } from 'lucide-react';
import BackButton from '@/components/BackButton';
import { uploadLessonNotes } from '@/lib/cloudinary/upload';

interface LessonNote {
  id: string;
  title: string;
  date: Date;
  fileUrl: string;
  uploadedAt: Date;
  uploadedBy: string;
  fileName: string;
}

export default function LessonNotesManagement() {
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [notes, setNotes] = useState<LessonNote[]>([]);
  const { userProfile } = useAuth();
  const router = useRouter();

  // Redirect if not admin
  if (!userProfile?.isAdmin) {
    router.push('/');
    return null;
  }

  // Fetch existing notes
  useEffect(() => {
    const fetchNotes = async () => {
      try {
        const q = query(collection(db, 'lesson-notes'), orderBy('uploadedAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const notesData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          date: doc.data().date.toDate(),
          uploadedAt: doc.data().uploadedAt.toDate()
        })) as LessonNote[];
        setNotes(notesData);
      } catch (err) {
        console.error('Error fetching notes:', err);
        setError('Failed to load existing notes');
      }
    };

    fetchNotes();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'application/pdf') {
        setError('Please upload a PDF file');
        setFile(null);
        return;
      }
      
      // Check file size (10MB limit)
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        setFile(null);
        return;
      }
      
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title.trim()) {
      setError('Please provide both a title and a PDF file');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Upload file to Cloudinary
      const fileUrl = await uploadLessonNotes(file);
      
      // Add metadata to Firestore
      const docRef = await addDoc(collection(db, 'lesson-notes'), {
        title: title.trim(),
        date: new Date(),
        fileUrl,
        uploadedAt: Timestamp.now(),
        uploadedBy: userProfile.uid,
        fileName: file.name
      });

      // Add the new note to the state
      const newNote = {
        id: docRef.id,
        title: title.trim(),
        date: new Date(),
        fileUrl,
        uploadedAt: new Date(),
        uploadedBy: userProfile.uid,
        fileName: file.name
      };
      setNotes(prevNotes => [newNote, ...prevNotes]);

      setSuccess(true);
      setTitle('');
      setFile(null);
      
      // Reset success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError('Failed to upload file. Please try again.');
      console.error('Upload error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (noteId: string, fileUrl: string) => {
    if (!confirm('Are you sure you want to delete this note? This action cannot be undone.')) {
      return;
    }

    try {
      // Extract the public ID from the Cloudinary URL
      console.log('Original File URL:', fileUrl);
      
      // Remove any query parameters or transformations
      const cleanUrl = fileUrl.split('?')[0];
      console.log('Clean URL:', cleanUrl);
      
      const urlParts = cleanUrl.split('/');
      console.log('URL Parts:', urlParts);
      
      // Find the upload type (raw or fl_attachment)
      const uploadIndex = urlParts.findIndex(part => part === 'upload' || part === 'fl_attachment');
      if (uploadIndex === -1) {
        throw new Error('Invalid Cloudinary URL structure');
      }
      console.log('Upload Index:', uploadIndex);

      // Get the folder and filename parts
      const relevantParts = urlParts.slice(uploadIndex + 1);
      console.log('Relevant Parts:', relevantParts);

      // Remove the file extension
      const publicId = relevantParts.join('/').replace(/\.[^/.]+$/, '');
      console.log('Final Public ID:', publicId);

      // Log Cloudinary configuration (without showing actual secrets)
      console.log('Cloudinary Config Check:', {
        hasCloudName: !!process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
        hasApiKey: !!process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
        hasApiSecret: !!process.env.NEXT_PUBLIC_CLOUDINARY_API_SECRET,
        cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
      });

      const credentials = {
        publicId,
        cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
        apiKey: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
        apiSecret: process.env.NEXT_PUBLIC_CLOUDINARY_API_SECRET
      };

      if (!credentials.cloudName || !credentials.apiKey || !credentials.apiSecret) {
        throw new Error('Missing Cloudinary credentials in frontend configuration');
      }

      // Delete from Cloudinary first
      const cloudinaryResponse = await fetch('/api/cloudinary/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const responseData = await cloudinaryResponse.json();
      
      if (!cloudinaryResponse.ok) {
        console.error('Cloudinary deletion failed:', responseData);
        throw new Error(responseData.error || 'Failed to delete from Cloudinary');
      }

      // If Cloudinary deletion was successful, delete from Firestore
      await deleteDoc(doc(db, 'lesson-notes', noteId));
      setNotes(prevNotes => prevNotes.filter(note => note.id !== noteId));
      setError(null); // Clear any existing errors
    } catch (err) {
      console.error('Error deleting note:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete note. Please try again.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex items-center">
        <BackButton className="mr-4" />
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Lesson Notes Management</h1>
      </div>

      <div className="bg-white dark:bg-white/5 rounded-lg shadow-sm p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
              Lesson Title
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-white/10 shadow-sm focus:border-[#D6805F] focus:ring-[#D6805F] dark:bg-white/5 dark:text-white sm:text-sm px-4 py-2"
              placeholder="Enter the title for this lesson's notes"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
              PDF File
            </label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-white/10 border-dashed rounded-md">
              <div className="space-y-1 text-center">
                <FileText className="mx-auto h-12 w-12 text-gray-400" />
                <div className="flex text-sm text-gray-600 dark:text-gray-300">
                  <label htmlFor="file-upload" className="relative cursor-pointer rounded-md font-medium text-[#D6805F] hover:text-[#c0734f] focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-[#D6805F]">
                    <span>Upload a file</span>
                    <input
                      id="file-upload"
                      name="file-upload"
                      type="file"
                      accept=".pdf"
                      className="sr-only"
                      onChange={handleFileChange}
                    />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  PDF up to 10MB
                </p>
                {file && (
                  <p className="text-sm text-green-600 dark:text-green-400">
                    Selected: {file.name}
                  </p>
                )}
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 dark:bg-red-900/50 p-4">
              <p className="text-sm text-red-600 dark:text-red-200">{error}</p>
            </div>
          )}

          {success && (
            <div className="rounded-md bg-green-50 dark:bg-green-900/50 p-4">
              <p className="text-sm text-green-600 dark:text-green-200">
                Lesson notes uploaded successfully!
              </p>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#D6805F] hover:bg-[#c0734f] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#D6805F] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Uploading...
                </div>
              ) : (
                <div className="flex items-center">
                  <Upload className="h-5 w-5 mr-2" />
                  Upload Notes
                </div>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* List of uploaded notes */}
      <div className="mt-8">
        <h2 className="text-xl font-medium text-gray-900 dark:text-white mb-4">Uploaded Notes</h2>
        <div className="bg-white dark:bg-white/5 rounded-lg shadow-sm overflow-hidden">
          <ul className="divide-y divide-gray-200 dark:divide-white/10">
            {notes.map((note) => (
              <li key={note.id} className="p-4 hover:bg-gray-50 dark:hover:bg-white/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <FileText className="h-5 w-5 text-gray-400" />
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white">{note.title}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Uploaded on {note.uploadedAt.toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <a
                      href={note.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#D6805F] hover:text-[#c0734f] p-2 rounded-full hover:bg-[#D6805F]/10"
                      title="Open PDF"
                    >
                      <ExternalLink className="h-5 w-5" />
                    </a>
                    <button
                      onClick={() => handleDelete(note.id, note.fileUrl)}
                      className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/50"
                      title="Delete"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
            {notes.length === 0 && (
              <li className="p-4 text-center text-gray-500 dark:text-gray-400">
                No notes have been uploaded yet.
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
} 