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

    // Try to delete with different resource types
    const resourceTypes = ['raw', 'image', 'video'];
    let deleted = false;
    let lastError: Error | null = null;

    for (const resourceType of resourceTypes) {
      try {
        console.log(`Attempting to delete with resource_type: ${resourceType}`);
        const result = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
        console.log(`Result for ${resourceType}:`, result);
        
        if (result.result === 'ok') {
          deleted = true;
          return NextResponse.json({ message: 'File deleted successfully' });
        }
      } catch (error) {
        console.log(`Error with ${resourceType}:`, error);
        lastError = error instanceof Error ? error : new Error('Unknown error');
      }
    }

    if (!deleted) {
      console.error('Failed to delete with all resource types. Last error:', lastError);
      return NextResponse.json(
        { error: `Failed to delete file from Cloudinary: ${lastError?.message || 'not found'}` },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error deleting file from Cloudinary:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
} 