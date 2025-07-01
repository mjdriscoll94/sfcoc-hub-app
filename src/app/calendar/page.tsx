'use client';

import { useEffect, useState } from 'react';

export default function CalendarPage() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Give the iframe a moment to load
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-[#1A1A1A] py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Church Calendar</h1>
          <p className="mt-2 text-white/60">View and stay updated with church events and activities</p>
        </div>

        <div className="bg-white/5 rounded-lg overflow-hidden">
          {isLoading && (
            <div className="flex justify-center items-center min-h-[600px]">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D6805F]"></div>
            </div>
          )}
          
          <iframe
            src="https://teamup.com/ks88dd12881d5c8d9f"
            style={{ 
              border: '0',
              width: '100%',
              height: '800px'
            }}
            className={isLoading ? 'hidden' : 'block'}
            title="Church Calendar"
          ></iframe>
        </div>

        
      </div>
    </div>
  );
} 