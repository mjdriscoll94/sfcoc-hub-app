import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Navigation from '@/components/Navigation';
import { AuthProvider } from '@/lib/auth/AuthContext';
import RouteGuard from '@/components/RouteGuard';
import FaviconDevRefresh from '@/components/FaviconDevRefresh';
import { ThemeProvider } from '@/components/theme-provider';
import { TourWrapper } from '@/components/tour';

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
            <TourWrapper>
              <RouteGuard>
                <div className="relative">
                  <a
                    href="#main-content"
                    className="fixed left-4 top-2 z-[100] -translate-y-20 rounded-lg bg-charcoal px-4 py-3 font-semibold text-white focus:translate-y-0"
                  >
                    Skip to main content
                  </a>
                  <div className="fixed top-0 left-0 right-0 z-50">
                    <Navigation />
                  </div>
                  <main id="main-content" className="min-h-screen pt-16 pb-20 lg:pb-0">
                    {children}
                  </main>
                </div>
              </RouteGuard>
            </TourWrapper>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
