'use client';

import { useLessonNotes } from '@/hooks/useLessonNotes';
import { FileText, Download, Calendar, Clock } from 'lucide-react';

export default function LessonNotesPage() {
  const { notes, loading, error } = useLessonNotes();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6 text-[#D6805F] text-center sm:text-left">Lesson Notes</h1>
      
      {loading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D6805F]"></div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/50 p-4 rounded-lg mb-6">
          <p className="text-red-600 dark:text-red-200">{error}</p>
        </div>
      )}

      {!loading && !error && notes.length === 0 && (
        <div className="bg-[#1f1f1f] rounded-lg p-6">
          <p className="text-gray-300 mb-4">
            No lesson notes have been uploaded yet. Please check back soon as we continue to add more resources.
          </p>
        </div>
      )}

      {!loading && !error && notes.length > 0 && (
        <div className="grid gap-4">
          {notes.map((note) => (
            <div
              key={note.id}
              className="bg-white dark:bg-white/5 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow duration-200 border border-gray-200 dark:border-white/10"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <FileText className="h-6 w-6 text-[#D6805F]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      {note.title}
                    </h3>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        <span>{note.date.toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        <span>Uploaded {note.uploadedAt.toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <a
                  href={note.fileUrl}
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