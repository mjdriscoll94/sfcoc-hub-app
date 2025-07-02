'use client';

import { useState, useEffect } from 'react';
import { APP_VERSION, APP_NAME } from '@/lib/version';

export default function BuildInfo({ className = '' }: { className?: string }) {
  const [buildInfo, setBuildInfo] = useState<{ status: string; createdAt: string } | null>(null);

  useEffect(() => {
    const fetchBuildInfo = async () => {
      try {
        const response = await fetch('/api/build-status');
        if (response.ok) {
          const data = await response.json();
          setBuildInfo(data);
        }
      } catch (error) {
        console.error('Error fetching build info:', error);
      }
    };

    fetchBuildInfo();
  }, []);

  if (!buildInfo) return null;

  return (
    <div className={`text-center text-sm text-gray-500 dark:text-white/40 ${className}`}>
      {APP_NAME} v{APP_VERSION} • Built {new Date(buildInfo.createdAt).toLocaleDateString()}
    </div>
  );
} 