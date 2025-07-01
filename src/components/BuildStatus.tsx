'use client';

import { useEffect, useState } from 'react';

interface BuildStatus {
  status: 'READY' | 'BUILDING' | 'ERROR' | 'QUEUED' | 'CANCELED' | 'INITIALIZING';
  createdAt: string;
}

export default function BuildStatus() {
  const [buildStatus, setBuildStatus] = useState<BuildStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBuildStatus = async () => {
      try {
        const response = await fetch('/api/build-status');
        if (!response.ok) {
          throw new Error('Failed to fetch build status');
        }
        const data = await response.json();
        setBuildStatus(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch build status');
      }
    };

    // Fetch immediately
    fetchBuildStatus();

    // Then fetch every 30 seconds
    const interval = setInterval(fetchBuildStatus, 30000);

    return () => clearInterval(interval);
  }, []);

  if (error) {
    return null; // Don't show anything if there's an error
  }

  if (!buildStatus) {
    return null; // Don't show anything while loading
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'READY':
        return 'bg-green-500';
      case 'BUILDING':
      case 'QUEUED':
      case 'INITIALIZING':
        return 'bg-yellow-500';
      case 'ERROR':
      case 'CANCELED':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'READY':
        return 'Live';
      case 'BUILDING':
        return 'Building';
      case 'QUEUED':
        return 'Queued';
      case 'INITIALIZING':
        return 'Initializing';
      case 'ERROR':
        return 'Error';
      case 'CANCELED':
        return 'Canceled';
      default:
        return status;
    }
  };

  return (
    <div className="flex items-center justify-center space-x-2 py-2 px-4 bg-gray-100 rounded-full shadow-sm max-w-fit mx-auto">
      <div className={`w-2 h-2 rounded-full ${getStatusColor(buildStatus.status)}`} />
      <span className="text-sm font-medium text-gray-700">
        {getStatusText(buildStatus.status)}
      </span>
      {buildStatus.status !== 'READY' && (
        <span className="text-xs text-gray-500">
          {new Date(buildStatus.createdAt).toLocaleTimeString()}
        </span>
      )}
    </div>
  );
} 