'use client';

import { useEffect } from 'react';

export default function FaviconUpdater() {
  useEffect(() => {
    const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
    if (link) {
      link.href = '/favicon.ico?v=' + Date.now();
    }
  }, []);

  return null;
} 