import { NextResponse } from 'next/server';

const VERCEL_API_TOKEN = process.env.VERCEL_API_TOKEN;
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID;
const PROJECT_ID = process.env.VERCEL_PROJECT_ID;

export async function GET() {
  if (!VERCEL_API_TOKEN || !PROJECT_ID) {
    return NextResponse.json(
      { error: 'Vercel API configuration missing' },
      { status: 500 }
    );
  }

  try {
    // Fetch the latest deployment
    const deploymentsUrl = `https://api.vercel.com/v6/deployments?projectId=${PROJECT_ID}&limit=1&state=BUILDING,READY,ERROR${VERCEL_TEAM_ID ? `&teamId=${VERCEL_TEAM_ID}` : ''}`;
    
    const response = await fetch(deploymentsUrl, {
      headers: {
        Authorization: `Bearer ${VERCEL_API_TOKEN}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch deployments');
    }

    const data = await response.json();
    
    if (!data.deployments || data.deployments.length === 0) {
      return NextResponse.json({
        status: 'READY',
        createdAt: new Date().toISOString(),
      });
    }

    const latestDeployment = data.deployments[0];

    return NextResponse.json({
      status: latestDeployment.state,
      createdAt: latestDeployment.created,
    });
  } catch (error) {
    console.error('Error fetching deployment status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch deployment status' },
      { status: 500 }
    );
  }
} 