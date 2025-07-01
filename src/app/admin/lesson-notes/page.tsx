'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { db } from '@/lib/firebase/config';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { Upload, FileText } from 'lucide-react';
import BackButton from '@/components/BackButton';
import { uploadLessonNotes } from '@/lib/cloudinary/upload';

interface LessonNote {
  title: string;
  date: Date;
  fileUrl: string;
  uploadedAt: Date;
  uploadedBy: string;
}

export default function LessonNotesManagement() {
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const { userProfile } = useAuth();
  const router = useRouter();

  // Redirect if not admin
  if (!userProfile?.isAdmin) {
    router.push('/');
    return null;
  }

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
      await addDoc(collection(db, 'lesson-notes'), {
        title: title.trim(),
        date: new Date(),
        fileUrl,
        uploadedAt: Timestamp.now(),
        uploadedBy: userProfile.uid,
        fileName: file.name
      });

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
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-white/10 shadow-sm focus:border-[#D6805F] focus:ring-[#D6805F] dark:bg-white/5 dark:text-white sm:text-sm"
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
    </div>
  );
} 