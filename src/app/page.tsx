'use client';

import { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/lib/auth/AuthContext';

const MemberDashboard = dynamic(
  () => import('@/components/MemberDashboard').then((module) => module.MemberDashboard),
  { loading: () => <p className="mx-auto max-w-7xl px-4 py-12 text-text-light" role="status">Loading your member home…</p> }
);
const PublicHome = dynamic(
  () => import('@/components/PublicHome').then((module) => module.PublicHome),
  { loading: () => <p className="mx-auto max-w-7xl px-4 py-12 text-text-light" role="status">Loading church information…</p> }
);

export default function HomePage() {
  const { user } = useAuth();

  useEffect(() => {
    document.title = 'Home | Sioux Falls Church of Christ';
  }, []);

  return user ? <MemberDashboard /> : <PublicHome />;
}
