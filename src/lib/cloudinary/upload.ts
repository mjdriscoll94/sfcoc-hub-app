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
    
    // Create form data - only use parameters allowed with unsigned upload
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || '');
    formData.append('folder', 'files'); // This is allowed
    formData.append('resource_type', 'raw'); // This is a required parameter, not an upload parameter
    
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

export const uploadBulletin = async (file: File): Promise<string> => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || '');
    formData.append('folder', 'bulletins');
    formData.append('resource_type', 'raw');

    const uploadUrl = `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/raw/upload`;

    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(`Upload failed: ${response.statusText}${errorData ? ` - ${JSON.stringify(errorData)}` : ''}`);
    }

    const data = await response.json();
    return data.secure_url;
  } catch (error) {
    console.error('Error in uploadBulletin:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to upload bulletin: ${error.message}`);
    }
    throw new Error('Failed to upload bulletin: Unknown error');
  }
};

export const uploadLifeGroupResource = async (file: File): Promise<string> => {
  try {
    console.log('Starting life group resource upload process...', { 
      fileName: file.name, 
      fileSize: file.size,
      fileType: file.type,
    });
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || '');
    formData.append('folder', 'life-groups');
    formData.append('resource_type', 'raw');
    
    const uploadUrl = `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/raw/upload`;
    
    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(`Upload failed: ${response.statusText}${errorData ? ` - ${JSON.stringify(errorData)}` : ''}`);
    }

    const data = await response.json();
    console.log('Upload successful:', data);
    
    return data.secure_url;
  } catch (error) {
    console.error('Error in uploadLifeGroupResource:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to upload file: ${error.message}`);
    }
    throw new Error('Failed to upload file: Unknown error');
  }
}; 