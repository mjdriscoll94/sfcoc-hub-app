import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Lesson Notes PDFs | South Franklin Church of Christ',
  description: 'Access lesson notes and study materials from our services and Bible classes.',
};

export default function LessonNotesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
} 