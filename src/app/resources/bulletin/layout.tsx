import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sioux Falls Church of Christ',
  description: 'Access weekly church bulletins.',
};

export default function BulletinLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
