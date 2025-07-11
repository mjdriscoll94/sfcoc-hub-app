import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

export async function POST(request: Request) {
  try {
    const { publicId, cloudName, apiKey, apiSecret } = await request.json();
    console.log('Attempting to delete file with public ID:', publicId);

    if (!publicId) {
      return NextResponse.json(
        { error: 'Public ID is required' },
        { status: 400 }
      );
    }

    // Configure Cloudinary with the provided credentials
    const config = {
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret
    };

    // Log configuration status
    console.log('Cloudinary Configuration Status:', {
      hasCloudName: !!config.cloud_name,
      hasApiKey: !!config.api_key,
      hasApiSecret: !!config.api_secret,
      cloudName: config.cloud_name
    });

    if (!config.cloud_name || !config.api_key || !config.api_secret) {
      console.error('Missing Cloudinary credentials');
      return NextResponse.json(
        { error: 'Server configuration error - missing Cloudinary credentials' },
        { status: 500 }
      );
    }

    // Configure Cloudinary
    cloudinary.config(config);

    try {
      // For raw files, we need to handle version numbers
      const publicIdParts = publicId.split('/');
      const versionMatch = publicIdParts[0].match(/^v\d+$/);
      
      // If first part is a version number, remove it for the destroy call
      const finalPublicId = versionMatch ? publicIdParts.slice(1).join('/') : publicId;
      
      console.log('Delete request details:', {
        originalPublicId: publicId,
        finalPublicId,
        resourceType: 'raw',
        type: 'upload'
      });

      const result = await cloudinary.uploader.destroy(finalPublicId, { 
        resource_type: 'raw',
        type: 'upload',
        invalidate: true
      });
      
      console.log('Cloudinary delete result:', JSON.stringify(result, null, 2));
      
      if (result.result === 'ok') {
        return NextResponse.json({ message: 'File deleted successfully' });
      }
      
      throw new Error(`Delete operation failed: ${result.result}`);
    } catch (error) {
      console.error('Detailed error:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        name: error instanceof Error ? error.name : 'Unknown',
        publicId,
        resourceType: 'raw',
        fullError: error
      });
      
      return NextResponse.json(
        { error: `Failed to delete file from Cloudinary: ${error instanceof Error ? error.message : 'unknown error'}` },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in delete route:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
} 