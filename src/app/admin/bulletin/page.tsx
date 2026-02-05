'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { db } from '@/lib/firebase/config';
import { collection, addDoc, Timestamp, getDocs, deleteDoc, doc, query, orderBy, getDoc, DocumentData } from 'firebase/firestore';
import { Upload, FileText, Trash2, ExternalLink, User } from 'lucide-react';
import BackButton from '@/components/BackButton';
import { uploadBulletin } from '@/lib/cloudinary/upload';

interface Bulletin {
  id: string;
  title: string;
  date: Date;
  fileUrl: string;
  uploadedAt: Date;
  uploadedBy: string;
  uploaderName: string;
  fileName: string;
}

interface FirebaseUser extends DocumentData {
  displayName: string | null;
}

export default function BulletinManagement() {
  useEffect(() => {
    document.title = 'Bulletin Management | Sioux Falls Church of Christ';
  }, []);

  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [bulletins, setBulletins] = useState<Bulletin[]>([]);
  const { userProfile } = useAuth();
  const router = useRouter();

  if (!userProfile?.isAdmin) {
    router.push('/');
    return null;
  }

  useEffect(() => {
    const fetchBulletins = async () => {
      try {
        const q = query(collection(db, 'bulletins'), orderBy('uploadedAt', 'desc'));
        const querySnapshot = await getDocs(q);

        const bulletinsPromises = querySnapshot.docs.map(async (bulletinDoc) => {
          const data = bulletinDoc.data();
          const uploaderDoc = await getDoc(doc(db, 'users', data.uploadedBy));
          const uploaderData = uploaderDoc.data() as FirebaseUser;

          return {
            id: bulletinDoc.id,
            ...data,
            date: data.date?.toDate?.() || new Date(),
            uploadedAt: data.uploadedAt?.toDate?.() || new Date(),
            uploaderName: uploaderData?.displayName || 'Unknown User',
          } as Bulletin;
        });

        const bulletinsData = await Promise.all(bulletinsPromises);
        setBulletins(bulletinsData);
      } catch (err) {
        console.error('Error fetching bulletins:', err);
        setError('Failed to load existing bulletins');
      }
    };

    fetchBulletins();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'application/pdf') {
        setError('Please upload a PDF file');
        setFile(null);
        return;
      }

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
    if (!file || !title.trim() || !userProfile) {
      setError('Please provide both a title and a PDF file');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const fileUrl = await uploadBulletin(file);

      const docRef = await addDoc(collection(db, 'bulletins'), {
        title: title.trim(),
        date: new Date(),
        fileUrl,
        uploadedAt: Timestamp.now(),
        uploadedBy: userProfile.uid,
        fileName: file.name,
      });

      const newBulletin: Bulletin = {
        id: docRef.id,
        title: title.trim(),
        date: new Date(),
        fileUrl,
        uploadedAt: new Date(),
        uploadedBy: userProfile.uid,
        uploaderName: userProfile.displayName || 'Unknown User',
        fileName: file.name,
      };
      setBulletins((prev) => [newBulletin, ...prev]);

      setSuccess(true);
      setTitle('');
      setFile(null);

      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError('Failed to upload file. Please try again.');
      console.error('Upload error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (bulletinId: string, fileUrl: string) => {
    if (!confirm('Are you sure you want to delete this bulletin? This action cannot be undone.')) {
      return;
    }

    try {
      const cleanUrl = fileUrl.split('?')[0];
      const urlParts = cleanUrl.split('/');
      const uploadIndex = urlParts.findIndex((part) => part === 'upload');

      if (uploadIndex === -1) {
        throw new Error('Invalid file URL structure');
      }

      const relevantParts = urlParts.slice(uploadIndex + 1);
      const publicId = relevantParts.join('/');

      const credentials = {
        publicId,
        cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
        apiKey: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
        apiSecret: process.env.NEXT_PUBLIC_CLOUDINARY_API_SECRET,
      };

      if (!credentials.cloudName || !credentials.apiKey || !credentials.apiSecret) {
        throw new Error('Missing Cloudinary credentials');
      }

      const cloudinaryResponse = await fetch('/api/cloudinary/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      const responseData = await cloudinaryResponse.json();

      if (!cloudinaryResponse.ok) {
        throw new Error(responseData.error || 'Failed to delete from Cloudinary');
      }

      await deleteDoc(doc(db, 'bulletins', bulletinId));
      setBulletins((prev) => prev.filter((b) => b.id !== bulletinId));
      setError(null);
    } catch (err) {
      console.error('Error deleting bulletin:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete bulletin. Please try again.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex items-center">
        <BackButton className="mr-4" />
        <h1 className="text-3xl font-bold text-charcoal">Bulletin Management</h1>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6 border border-border">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700">
              Bulletin Title
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 block w-full rounded-md border border-border shadow-sm focus:border-[#D6805F] focus:ring-[#D6805F] bg-white text-charcoal sm:text-sm px-4 py-2"
              placeholder="e.g., Bulletin - January 5, 2025"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">PDF File</label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-border border-dashed rounded-md">
              <div className="space-y-1 text-center">
                <FileText className="mx-auto h-12 w-12 text-gray-400" />
                <div className="flex text-sm text-gray-600">
                  <label htmlFor="file-upload" className="relative cursor-pointer rounded-md font-medium text-coral hover:text-[#c0734f]">
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
                <p className="text-xs text-gray-500">PDF up to 10MB</p>
                {file && (
                  <p className="text-sm text-green-600">Selected: {file.name}</p>
                )}
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {success && (
            <div className="rounded-md bg-green-50 p-4">
              <p className="text-sm text-green-600">Bulletin uploaded successfully!</p>
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
                  Upload Bulletin
                </div>
              )}
            </button>
          </div>
        </form>
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-medium text-charcoal mb-4">Uploaded Bulletins</h2>
        <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-border">
          <ul className="divide-y divide-gray-200">
            {bulletins.map((bulletin) => (
              <li key={bulletin.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <FileText className="h-5 w-5 text-gray-400" />
                    <div>
                      <h3 className="text-sm font-medium text-charcoal">{bulletin.title}</h3>
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <span>Uploaded on {bulletin.uploadedAt.toLocaleDateString()}</span>
                        <span>•</span>
                        <div className="flex items-center space-x-1">
                          <User className="h-4 w-4" />
                          <span>{bulletin.uploaderName}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <a
                      href={bulletin.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-coral hover:text-[#c0734f] p-2 rounded-full hover:bg-[#D6805F]/10"
                      title="Open PDF"
                    >
                      <ExternalLink className="h-5 w-5" />
                    </a>
                    <button
                      onClick={() => handleDelete(bulletin.id, bulletin.fileUrl)}
                      className="text-red-600 hover:text-red-900 p-2 rounded-full hover:bg-red-50"
                      title="Delete"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
            {bulletins.length === 0 && (
              <li className="p-4 text-center text-gray-500">No bulletins have been uploaded yet.</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
