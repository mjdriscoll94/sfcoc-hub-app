import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

export async function POST(request: Request) {
  try {
    const { publicId } = await request.json();
    console.log('Attempting to delete file with public ID:', publicId);

    if (!publicId) {
      return NextResponse.json(
        { error: 'Public ID is required' },
        { status: 400 }
      );
    }

    // Configure Cloudinary with direct values
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    // Log configuration status
    console.log('Cloudinary Configuration Status:', {
      hasCloudName: !!cloudName,
      hasApiKey: !!apiKey,
      hasApiSecret: !!apiSecret,
      cloudName: cloudName // safe to log cloud name
    });

    if (!cloudName || !apiKey || !apiSecret) {
      console.error('Missing Cloudinary credentials:', {
        cloudName: !!cloudName,
        apiKey: !!apiKey,
        apiSecret: !!apiSecret
      });
      return NextResponse.json(
        { error: 'Server configuration error - missing Cloudinary credentials' },
        { status: 500 }
      );
    }

    // Configure Cloudinary with the verified credentials
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret
    });

    // Delete the file from Cloudinary
    const result = await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
    console.log('Cloudinary delete result:', result);

    if (result.result === 'ok') {
      return NextResponse.json({ message: 'File deleted successfully' });
    } else {
      console.error('Cloudinary deletion failed:', result);
      return NextResponse.json(
        { error: `Failed to delete file from Cloudinary: ${result.result}` },
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