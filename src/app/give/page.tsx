'use client';

import { useEffect } from 'react';

export default function GivePage() {
  useEffect(() => {
    document.title = 'Give | Sioux Falls Church of Christ';
  }, []);
  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-card rounded-lg border border-sage/20 overflow-hidden">
          <div className="aspect-[3/4] w-full max-w-3xl mx-auto">
            <iframe
              src="https://give.tithe.ly/?formId=99dfd8d8-6864-11ee-90fc-1260ab546d11"
              className="w-full h-full bg-card"
              frameBorder="0"
              scrolling="yes"
              allow="payment"
            ></iframe>
          </div>
        </div>
      </div>
    </div>
  );
}