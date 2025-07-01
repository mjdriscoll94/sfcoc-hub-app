import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { FirebaseApp } from 'firebase/app';
import { app } from './config';

// Initialize Firebase Storage
const storage = getStorage(app as FirebaseApp);

export const uploadFamilyPhoto = async (file: File, userId: string): Promise<string> => {
  try {
    console.log('Starting photo upload process...', { fileName: file.name, fileSize: file.size });
    
    // Create a reference to the file location
    const fileRef = ref(storage, `family-photos/${userId}/${Date.now()}-${file.name}`);
    console.log('Created storage reference:', fileRef.fullPath);
    
    // Upload the file
    console.log('Uploading file...');
    const snapshot = await uploadBytes(fileRef, file);
    console.log('File uploaded successfully:', snapshot.metadata);
    
    // Get the download URL
    console.log('Getting download URL...');
    const downloadURL = await getDownloadURL(fileRef);
    console.log('Download URL obtained:', downloadURL);
    
    return downloadURL;
  } catch (error) {
    console.error('Error in uploadFamilyPhoto:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to upload photo: ${error.message}`);
    }
    throw new Error('Failed to upload photo: Unknown error');
  }
};

export const deleteFamilyPhoto = async (photoURL: string): Promise<void> => {
  try {
    // Get the reference from the URL
    const fileRef = ref(storage, photoURL);
    
    // Delete the file
    await deleteObject(fileRef);
  } catch (error) {
    console.error('Error deleting family photo:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to delete photo: ${error.message}`);
    }
    throw new Error('Failed to delete photo: Unknown error');
  }
}; 