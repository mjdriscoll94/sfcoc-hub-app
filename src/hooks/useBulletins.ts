import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase/config';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';

export interface Bulletin {
  id: string;
  title: string;
  date: Date;
  fileUrl: string;
  uploadedAt: Date;
  uploadedBy: string;
  uploaderName: string;
  fileName: string;
}

export function useBulletins() {
  const [bulletins, setBulletins] = useState<Bulletin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBulletins = async () => {
      try {
        const q = query(
          collection(db, 'bulletins'),
          orderBy('uploadedAt', 'desc')
        );

        const querySnapshot = await getDocs(q);
        const bulletinsData = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            date: data.date?.toDate?.() || new Date(),
            uploadedAt: data.uploadedAt?.toDate?.() || new Date(),
          } as Bulletin;
        });

        setBulletins(bulletinsData);
        setError(null);
      } catch (err) {
        console.error('Error fetching bulletins:', err);
        setError('Failed to load bulletins');
      } finally {
        setLoading(false);
      }
    };

    fetchBulletins();
  }, []);

  return { bulletins, loading, error };
}
