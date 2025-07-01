import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Lesson Notes PDFs | South Franklin Church of Christ',
  description: 'Access lesson notes and study materials from our services and Bible classes.',
};

export default function LessonNotesPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6 text-[#D6805F]">Lesson Notes</h1>
      <div className="bg-[#1f1f1f] rounded-lg p-6">
        <p className="text-gray-300 mb-4">
          This page will contain downloadable PDF files of lesson notes from our services and Bible classes.
          Check back soon as we continue to add more resources.
        </p>
        {/* PDF list will be added here */}
      </div>
    </div>
  );
} 