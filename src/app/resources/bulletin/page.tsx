'use client';

import { useEffect } from 'react';
import { useBulletins } from '@/hooks/useBulletins';
import { FileText, Download, Calendar } from 'lucide-react';
import { LoadingCardList } from '@/components/LoadingSkeleton';

export default function BulletinPage() {
  useEffect(() => {
    document.title = 'Bulletin | Sioux Falls Church of Christ';
  }, []);

  const { bulletins, loading, error } = useBulletins();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6 text-charcoal text-center sm:text-left">Bulletin</h1>

      {loading && (
        <LoadingCardList label="Loading bulletins…" count={3} compact />
      )}

      {error && (
        <div role="alert" className="mb-6 rounded-lg border border-error/20 bg-error/10 p-4">
          <p className="text-error">{error}</p>
        </div>
      )}

      {!loading && !error && bulletins.length === 0 && (
        <div className="bg-card rounded-lg p-6 border border-sage/20">
          <p className="text-charcoal mb-4">
            No bulletins have been uploaded yet. Please check back soon.
          </p>
        </div>
      )}

      {!loading && !error && bulletins.length > 0 && (
        <div className="grid gap-4">
          {bulletins.map((bulletin) => (
            <div
              key={bulletin.id}
          className="rounded-xl border border-border bg-card p-4 shadow-sm transition-shadow duration-200 hover:shadow-md"
            >
              <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <FileText className="h-6 w-6 text-coral" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-charcoal">
                      {bulletin.title}
                    </h3>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        <time dateTime={bulletin.date.toISOString()}>{bulletin.date.toLocaleDateString()}</time>
                      </div>
                    </div>
                  </div>
                </div>
                <a
                  href={bulletin.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-h-11 w-full items-center justify-center space-x-1 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:bg-primary-hover sm:w-auto"
                >
                  <Download aria-hidden="true" className="h-4 w-4" />
                  <span>Open bulletin<span className="sr-only">: {bulletin.title} (opens in a new window)</span></span>
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
