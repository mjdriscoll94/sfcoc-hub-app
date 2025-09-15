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
    <div className="min-h-screen bg-bg py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text uppercase tracking-wide">Church Calendar</h1>
          <p className="mt-2 text-text/60">View and stay updated with church events and activities</p>
        </div>

        <div className="bg-card rounded-lg overflow-hidden border border-sage/20">
          {isLoading && (
            <div className="flex justify-center items-center min-h-[600px]">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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