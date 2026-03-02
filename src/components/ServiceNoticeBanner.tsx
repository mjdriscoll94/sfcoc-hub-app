'use client';

import { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

const BANNER_STORAGE_KEY = 'sfcoc-banner-mar29-2026-dismissed';
const CUTOFF_DATE = new Date('2026-03-29T14:45:00.000Z'); // 9:45am Central

export default function ServiceNoticeBanner() {
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const now = new Date();
    if (now >= CUTOFF_DATE) {
      setMounted(true);
      return;
    }
    try {
      const dismissed = localStorage.getItem(BANNER_STORAGE_KEY) === 'true';
      setVisible(!dismissed);
    } catch {
      setVisible(true);
    }
    setMounted(true);
  }, []);

  const handleClose = () => {
    try {
      localStorage.setItem(BANNER_STORAGE_KEY, 'true');
    } catch {
      // ignore
    }
    setVisible(false);
  };

  if (!mounted || !visible) return null;

  return (
    <div
      role="banner"
      className="bg-[#E88B5F] text-white px-4 py-3 flex items-center justify-center gap-4 text-center flex-wrap"
    >
      <p className="text-sm md:text-base flex-1 min-w-0">
        <strong>Service location update:</strong> On March 29th, 2026, service will be held at the Ramkota Hotel on the west side of Sioux Falls. We will not be having service at the church building. We are planning to stream this service online as well.
      </p>
      <button
        type="button"
        onClick={handleClose}
        className="flex-shrink-0 p-1 rounded hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/50"
        aria-label="Dismiss banner"
      >
        <XMarkIcon className="w-5 h-5" />
      </button>
    </div>
  );
}
