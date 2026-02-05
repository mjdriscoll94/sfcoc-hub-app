'use client';

import { useEffect } from 'react';
import { useBulletins } from '@/hooks/useBulletins';
import { FileText, Download, Calendar, Clock } from 'lucide-react';

export default function BulletinPage() {
  useEffect(() => {
    document.title = 'Bulletin | Sioux Falls Church of Christ';
  }, []);

  const { bulletins, loading, error } = useBulletins();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6 text-coral text-center sm:text-left">Bulletin</h1>

      {loading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D6805F]"></div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 p-4 rounded-lg mb-6">
          <p className="text-red-600">{error}</p>
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
              className="bg-card rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow duration-200 border border-border"
            >
              <div className="flex items-start justify-between">
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
                        <span>{bulletin.date.toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        <span>Uploaded {bulletin.uploadedAt.toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <a
                  href={bulletin.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-1 px-3 py-1.5 text-sm font-medium text-white bg-[#D6805F] rounded-md hover:bg-[#c0734f] transition-colors duration-200"
                >
                  <Download className="h-4 w-4" />
                  <span>Download</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
