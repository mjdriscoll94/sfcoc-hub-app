export const uploadFamilyPhoto = async (file: File, userId: string): Promise<string> => {
  try {
    console.log('Starting photo upload process...', { fileName: file.name, fileSize: file.size });
    
    // Create form data
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || '');
    formData.append('folder', `family-photos/${userId}`);
    
    // Upload to Cloudinary using the upload preset
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Upload successful:', data.secure_url);
    
    return data.secure_url;
  } catch (error) {
    console.error('Error in uploadFamilyPhoto:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to upload photo: ${error.message}`);
    }
    throw new Error('Failed to upload photo: Unknown error');
  }
};

export const uploadLessonNotes = async (file: File): Promise<string> => {
  try {
    console.log('Starting lesson notes upload process...', { fileName: file.name, fileSize: file.size });
    
    // Create form data
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || '');
    formData.append('folder', 'lesson-notes');
    formData.append('resource_type', 'raw'); // This allows non-image files like PDFs
    formData.append('access_mode', 'public'); // Make the file publicly accessible
    
    // Upload to Cloudinary using the upload preset
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/raw/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Upload successful:', data.secure_url);
    
    return data.secure_url;
  } catch (error) {
    console.error('Error in uploadLessonNotes:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to upload PDF: ${error.message}`);
    }
    throw new Error('Failed to upload PDF: Unknown error');
  }
};

export const deleteFamilyPhoto = async (publicId: string): Promise<void> => {
  try {
    const response = await fetch('/api/cloudinary/delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ publicId }),
    });

    if (!response.ok) {
      throw new Error(`Delete failed: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Error deleting family photo:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to delete photo: ${error.message}`);
    }
    throw new Error('Failed to delete photo: Unknown error');
  }
}; 