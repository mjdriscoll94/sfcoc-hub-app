import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Navigation from '@/components/Navigation';
import { AuthProvider } from '@/lib/auth/AuthContext';
import RouteGuard from '@/components/RouteGuard';
import FaviconDevRefresh from '@/components/FaviconDevRefresh';
import { ThemeProvider } from '@/components/theme-provider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Sioux Falls Church of Christ',
  description: 'Sioux Falls Church of Christ'
};

// Force favicon refresh in development
// (Moved to a client component to avoid SSR errors)

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-bg text-text min-h-screen`}>
        <ThemeProvider>
          <FaviconDevRefresh />
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
        </ThemeProvider>
      </body>
    </html>
  );
}
