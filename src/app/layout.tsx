import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Navigation from '@/components/Navigation';
import { AuthProvider } from '@/lib/auth/AuthContext';
import RouteGuard from '@/components/RouteGuard';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'SFCOC',
  description: 'Sioux Falls Church of Christ',
  icons: {
    icon: '/favicon.ico'
  }
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-white dark:bg-[#171717] text-base min-h-screen`}>
        <AuthProvider>
          <RouteGuard>
            <div className="relative">
              <div className="fixed top-0 left-0 right-0 z-50">
                <Navigation />
              </div>
              <main className="relative top-16">
                {children}
              </main>
            </div>
          </RouteGuard>
        </AuthProvider>
      </body>
    </html>
  );
}
