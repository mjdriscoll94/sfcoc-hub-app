'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { useAuth } from '@/lib/auth/AuthContext';

export type ThemePreference = 'light' | 'dark' | 'system';

interface ThemeResponse {
  themePreference: ThemePreference;
}

export function useUserTheme() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { userProfile } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load user's theme preference from server on mount
  useEffect(() => {
    const loadUserTheme = async () => {
      if (!userProfile) {
        // If not authenticated, use system theme
        setTheme('system');
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/user/theme');
        if (response.ok) {
          const data: ThemeResponse = await response.json();
          setTheme(data.themePreference);
        } else {
          // Fallback to system if API fails
          setTheme('system');
        }
      } catch (error) {
        console.error('Failed to load user theme preference:', error);
        setTheme('system');
      } finally {
        setIsLoading(false);
      }
    };

    loadUserTheme();
  }, [userProfile, setTheme]);

  // Save theme preference to server when it changes
  const updateThemePreference = async (newTheme: ThemePreference) => {
    if (!userProfile) return;

    setIsSaving(true);
    try {
      const response = await fetch('/api/user/theme', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ themePreference: newTheme }),
      });

      if (!response.ok) {
        throw new Error('Failed to save theme preference');
      }

      setTheme(newTheme);
    } catch (error) {
      console.error('Failed to save theme preference:', error);
      // Revert to previous theme on error
      // The theme state will be reverted by the error handling
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  return {
    theme: theme as ThemePreference,
    resolvedTheme,
    setTheme: updateThemePreference,
    isLoading,
    isSaving,
  };
}
