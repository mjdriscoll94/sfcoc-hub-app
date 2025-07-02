import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase/config';
import { collection, query, orderBy, getDocs, Timestamp } from 'firebase/firestore';

export interface LessonNote {
  id: string;
  title: string;
  date: Date;
  fileUrl: string;
  uploadedAt: Date;
  uploadedBy: string;
  uploaderName: string;
  fileName: string;
}

export function useLessonNotes() {
  const [notes, setNotes] = useState<LessonNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNotes = async () => {
      try {
        const q = query(
          collection(db, 'lesson-notes'),
          orderBy('uploadedAt', 'desc')
        );
        
        const querySnapshot = await getDocs(q);
        const notesData = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            date: data.date.toDate(),
            uploadedAt: data.uploadedAt.toDate(),
          } as LessonNote;
        });

        setNotes(notesData);
        setError(null);
      } catch (err) {
        console.error('Error fetching notes:', err);
        setError('Failed to load lesson notes');
      } finally {
        setLoading(false);
      }
    };

    fetchNotes();
  }, []);

  return { notes, loading, error };
} 