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

    // Try to delete the file - we know it's a raw file in the 'files' folder
    try {
      // For unsigned uploads, we need to strip the version number from the public ID
      const publicIdWithoutVersion = publicId.replace(/^v\d+\//, '');
      
      // Log both IDs for debugging
      console.log('Delete request details:', {
        originalPublicId: publicId,
        strippedPublicId: publicIdWithoutVersion,
        resourceType: 'raw',
        type: 'upload'
      });

      const result = await cloudinary.uploader.destroy(publicIdWithoutVersion, { 
        resource_type: 'raw',
        type: 'upload',
        invalidate: true
      });
      
      // Log the complete result object
      console.log('Complete Cloudinary delete result:', JSON.stringify(result, null, 2));
      
      if (result.result === 'ok') {
        return NextResponse.json({ message: 'File deleted successfully' });
      }
      
      // If we got a result but not 'ok', try with the original ID as fallback
      console.log('First attempt failed, trying with original public ID...');
      
      const fallbackResult = await cloudinary.uploader.destroy(publicId, { 
        resource_type: 'raw',
        type: 'upload',
        invalidate: true
      });

      console.log('Fallback attempt result:', JSON.stringify(fallbackResult, null, 2));

      if (fallbackResult.result === 'ok') {
        return NextResponse.json({ message: 'File deleted successfully (fallback)' });
      }

      // If both attempts failed, throw error with more details
      throw new Error(`Delete operation failed. First attempt: ${result.result}, Fallback attempt: ${fallbackResult.result}`);
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