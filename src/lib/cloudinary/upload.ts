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
    console.log('Starting lesson notes upload process...', { 
      fileName: file.name, 
      fileSize: file.size,
      fileType: file.type,
      uploadPreset: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
      cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
    });
    
    // Create form data
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || '');
    formData.append('folder', 'files'); // Match the asset folder from preset
    formData.append('resource_type', 'raw'); // Use 'raw' for PDF files
    formData.append('use_filename', 'true');
    formData.append('unique_filename', 'true');
    formData.append('use_filename_as_display_name', 'true');
    
    // Upload to Cloudinary using the upload preset
    const uploadUrl = `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/raw/upload`;
    console.log('Uploading to:', uploadUrl);
    
    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error('Upload failed response:', {
        status: response.status,
        statusText: response.statusText,
        errorData,
        responseHeaders: Object.fromEntries(response.headers.entries())
      });
      throw new Error(`Upload failed: ${response.statusText}${errorData ? ` - ${JSON.stringify(errorData)}` : ''}`);
    }

    const data = await response.json();
    console.log('Upload successful:', data);
    
    return data.secure_url; // Don't modify the URL since we're using preset settings
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