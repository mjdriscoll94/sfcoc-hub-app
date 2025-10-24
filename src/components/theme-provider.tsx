'use client';

import { type ReactNode } from 'react';

interface ThemeProviderProps {
  children: ReactNode;
}

// Simplified theme provider - no more light/dark mode switching
// The app now uses a single, unified brand color scheme
export function ThemeProvider({ children }: ThemeProviderProps) {
  return <>{children}</>;
}
