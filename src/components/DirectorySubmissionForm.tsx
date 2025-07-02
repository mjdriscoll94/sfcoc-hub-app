'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { db } from '@/lib/firebase/config';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { Plus, X, Loader2, Camera } from 'lucide-react';
import { uploadFamilyPhoto } from '@/lib/cloudinary/upload';

interface FamilyMember {
  firstName: string;
  lastName: string;
  relationship: string;
  birthday: string;
}

interface DirectorySubmission {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  address?: string;
  anniversary?: string;
  familyMembers: FamilyMember[];
  submittedBy: string;
  submittedAt: Date;
  status: 'pending' | 'approved' | 'rejected';
  photoURL?: string;
}

export default function DirectorySubmissionForm() {
  const { user, userProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<Omit<DirectorySubmission, 'submittedBy' | 'submittedAt' | 'status'>>({
    firstName: '',
    lastName: '',
    email: user?.email || '',
    phoneNumber: '',
    address: '',
    anniversary: '',
    familyMembers: [],
    photoURL: ''
  });

  const [familyMember, setFamilyMember] = useState<FamilyMember>({
    firstName: '',
    lastName: '',
    relationship: '',
    birthday: ''
  });

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please upload an image file');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Please upload an image smaller than 5MB');
        return;
      }

      setPhotoFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError('You must be logged in to submit directory information.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log('Starting directory submission process...');

      let photoURL = '';
      if (photoFile) {
        console.log('Uploading photo...');
        try {
          photoURL = await uploadFamilyPhoto(photoFile, user.uid);
          console.log('Photo uploaded successfully:', photoURL);
        } catch (photoError) {
          console.error('Error uploading photo:', photoError);
          setError('Failed to upload photo. Please try again or skip the photo upload.');
          setLoading(false);
          return;
        }
      }

      console.log('Preparing submission data...');
      const submission: DirectorySubmission = {
        ...formData,
        photoURL,
        submittedBy: user.uid,
        submittedAt: new Date(),
        status: 'pending'
      };

      console.log('Adding document to Firestore...');
      const docRef = await addDoc(collection(db, 'directorySubmissions'), {
        ...submission,
        submittedAt: Timestamp.fromDate(submission.submittedAt)
      });
      console.log('Document added successfully with ID:', docRef.id);

      setSuccess(true);
      setFormData({
        firstName: '',
        lastName: '',
        email: user.email || '',
        phoneNumber: '',
        address: '',
        anniversary: '',
        familyMembers: [],
        photoURL: ''
      });
      setPhotoFile(null);
      setPhotoPreview(null);
    } catch (err) {
      console.error('Error submitting directory information:', err);
      let errorMessage = 'Failed to submit directory information. ';
      if (err instanceof Error) {
        errorMessage += err.message;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const addFamilyMember = () => {
    if (familyMember.firstName && familyMember.lastName && familyMember.relationship) {
      setFormData(prev => ({
        ...prev,
        familyMembers: [...prev.familyMembers, familyMember]
      }));
      setFamilyMember({ firstName: '', lastName: '', relationship: '', birthday: '' });
    }
  };

  const removeFamilyMember = (index: number) => {
    setFormData(prev => ({
      ...prev,
      familyMembers: prev.familyMembers.filter((_, i) => i !== index)
    }));
  };

  if (success) {
    return (
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-500/30 rounded-lg p-6">
        <h3 className="text-lg font-medium text-green-800 dark:text-green-200">Submission Successful!</h3>
        <p className="mt-2 text-sm text-green-700 dark:text-green-300">
          Your directory information has been submitted for approval. An administrator will review it shortly.
        </p>
        <button
          onClick={() => setSuccess(false)}
          className="mt-4 px-4 py-2 bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-200 rounded-md hover:bg-green-200 dark:hover:bg-green-700"
        >
          Submit Another Entry
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 rounded-md p-4">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      <div className="space-y-6">
        {/* Photo Upload Section */}
        <div className="col-span-full">
          <label htmlFor="photo" className="block text-sm font-medium text-white">
            Family Photo
          </label>
          <div className="mt-2 flex items-center gap-x-3">
            {photoPreview ? (
              <div className="relative">
                <img
                  src={photoPreview}
                  alt="Family photo preview"
                  className="h-24 w-24 object-cover rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => {
                    setPhotoFile(null);
                    setPhotoPreview(null);
                  }}
                  className="absolute -top-2 -right-2 rounded-full bg-red-500 text-white p-1 hover:bg-red-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-center h-24 w-24 rounded-lg border border-dashed border-gray-300 dark:border-white/10">
                <Camera className="h-8 w-8 text-gray-400 dark:text-white/40" />
              </div>
            )}
            <input
              type="file"
              id="photo"
              accept="image/*"
              onChange={handlePhotoChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => document.getElementById('photo')?.click()}
              className="rounded-md bg-white dark:bg-white/5 px-2.5 py-1.5 text-sm font-semibold text-gray-900 dark:text-white shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-white/10 hover:bg-gray-50 dark:hover:bg-white/10"
            >
              {photoPreview ? 'Change photo' : 'Upload photo'}
            </button>
          </div>
          <p className="mt-2 text-sm text-gray-500 dark:text-white/60">
            JPG, PNG or GIF up to 5MB
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-white">
              First Name
            </label>
            <input
              type="text"
              id="firstName"
              required
              value={formData.firstName}
              onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
              className="mt-1 block w-full rounded-md border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/40 focus:border-[#D6805F] focus:outline-none focus:ring-[#D6805F] sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-white">
              Last Name
            </label>
            <input
              type="text"
              id="lastName"
              required
              value={formData.lastName}
              onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
              className="mt-1 block w-full rounded-md border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/40 focus:border-[#D6805F] focus:outline-none focus:ring-[#D6805F] sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-white">
              Email
            </label>
            <input
              type="email"
              id="email"
              required
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className="mt-1 block w-full rounded-md border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/40 focus:border-[#D6805F] focus:outline-none focus:ring-[#D6805F] sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="phoneNumber" className="block text-sm font-medium text-white">
              Phone Number <span className="text-white/40">(optional)</span>
            </label>
            <input
              type="tel"
              id="phoneNumber"
              value={formData.phoneNumber}
              onChange={(e) => setFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
              className="mt-1 block w-full rounded-md border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/40 focus:border-[#D6805F] focus:outline-none focus:ring-[#D6805F] sm:text-sm"
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="address" className="block text-sm font-medium text-white">
              Address <span className="text-white/40">(optional)</span>
            </label>
            <input
              type="text"
              id="address"
              value={formData.address}
              onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
              className="mt-1 block w-full rounded-md border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/40 focus:border-[#D6805F] focus:outline-none focus:ring-[#D6805F] sm:text-sm"
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="anniversary" className="block text-sm font-medium text-white">
              Anniversary <span className="text-white/40">(optional)</span>
            </label>
            <input
              type="date"
              id="anniversary"
              value={formData.anniversary}
              onChange={(e) => setFormData(prev => ({ ...prev, anniversary: e.target.value }))}
              className="mt-1 block w-full rounded-md border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-gray-900 dark:text-white focus:border-[#D6805F] focus:outline-none focus:ring-[#D6805F] sm:text-sm"
            />
          </div>
        </div>

        <div className="border-t border-gray-200 dark:border-white/10 pt-6">
          <h3 className="text-lg font-medium text-white dark:text-white mb-4">Family Members</h3>
          
          {formData.familyMembers.length > 0 && (
            <div className="mb-4 space-y-2">
              {formData.familyMembers.map((member, index) => (
                <div key={index} className="flex items-center justify-between bg-gray-50 dark:bg-white/5 p-3 rounded-md">
                  <div>
                    <span className="text-gray-900 dark:text-white">{member.firstName} {member.lastName}</span>
                    <span className="text-gray-500 dark:text-white/60 ml-2">({member.relationship})</span>
                    {member.birthday && (
                      <span className="text-gray-500 dark:text-white/60 ml-2">• Born: {new Date(member.birthday).toLocaleDateString()}</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFamilyMember(index)}
                    className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4 sm:gap-3">
            <div>
              <label htmlFor="familyFirstName" className="block text-sm font-medium text-white">
                First Name
              </label>
              <input
                type="text"
                id="familyFirstName"
                value={familyMember.firstName}
                onChange={(e) => setFamilyMember(prev => ({ ...prev, firstName: e.target.value }))}
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/40 focus:border-[#D6805F] focus:outline-none focus:ring-[#D6805F] sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="familyLastName" className="block text-sm font-medium text-white">
                Last Name
              </label>
              <input
                type="text"
                id="familyLastName"
                value={familyMember.lastName}
                onChange={(e) => setFamilyMember(prev => ({ ...prev, lastName: e.target.value }))}
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/40 focus:border-[#D6805F] focus:outline-none focus:ring-[#D6805F] sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="relationship" className="block text-sm font-medium text-white">
                Relationship
              </label>
              <select
                id="relationship"
                value={familyMember.relationship}
                onChange={(e) => setFamilyMember(prev => ({ ...prev, relationship: e.target.value }))}
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-gray-900 dark:text-white focus:border-[#D6805F] focus:outline-none focus:ring-[#D6805F] sm:text-sm"
              >
                <option value="">Select...</option>
                <option value="Spouse">Spouse</option>
                <option value="Child">Child</option>
                <option value="Parent">Parent</option>
                <option value="Sibling">Sibling</option>
              </select>
            </div>

            <div>
              <label htmlFor="birthday" className="block text-sm font-medium text-white">
                Birthday
              </label>
              <input
                type="date"
                id="birthday"
                value={familyMember.birthday}
                onChange={(e) => setFamilyMember(prev => ({ ...prev, birthday: e.target.value }))}
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-gray-900 dark:text-white focus:border-[#D6805F] focus:outline-none focus:ring-[#D6805F] sm:text-sm"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={addFamilyMember}
            disabled={!familyMember.firstName || !familyMember.lastName || !familyMember.relationship}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-[#D6805F] bg-[#D6805F]/10 hover:bg-[#D6805F]/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#D6805F] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Family Member
          </button>
        </div>

        <div className="pt-6">
          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-[#D6805F] hover:bg-[#D6805F]/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#D6805F] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin h-5 w-5 mr-2" />
                Submitting...
              </>
            ) : (
              'Submit Directory Information'
            )}
          </button>
        </div>
      </div>
    </form>
  );
} 