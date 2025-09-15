'use client';

import { useState, useEffect } from 'react';
import { useUserTheme, ThemePreference } from '@/hooks/useUserTheme';
import { useAuth } from '@/lib/auth/AuthContext';

export default function AppearanceSettings() {
  const { userProfile } = useAuth();
  const { theme, setTheme, isLoading, isSaving } = useUserTheme();
  const [selectedTheme, setSelectedTheme] = useState<ThemePreference>('system');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  // Update local state when theme changes
  useEffect(() => {
    if (theme) {
      setSelectedTheme(theme);
    }
  }, [theme]);

  const handleThemeChange = async (newTheme: ThemePreference) => {
    setSelectedTheme(newTheme);
    setError(null);
    setSaveStatus('saving');

    try {
      await setTheme(newTheme);
      setSaveStatus('saved');
      
      // Clear success message after 2 seconds
      setTimeout(() => {
        setSaveStatus('idle');
      }, 2000);
    } catch (err) {
      setError('Failed to save theme preference. Please try again.');
      setSaveStatus('error');
      
      // Revert to previous theme on error
      setSelectedTheme(theme);
      
      // Clear error message after 5 seconds
      setTimeout(() => {
        setError(null);
        setSaveStatus('idle');
      }, 5000);
    }
  };

  const themeOptions: { value: ThemePreference; label: string; description: string }[] = [
    {
      value: 'light',
      label: 'Light',
      description: 'Always use light theme',
    },
    {
      value: 'dark',
      label: 'Dark',
      description: 'Always use dark theme',
    },
    {
      value: 'system',
      label: 'System',
      description: 'Follow your device settings',
    },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg text-text">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg text-text">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text mb-2">Appearance</h1>
          <p className="text-text/70">
            Customize how the app looks and feels. Your preferences are saved to your profile.
          </p>
        </div>

        <div className="space-y-8">
          {/* Theme Selection */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-xl font-semibold text-text mb-4">Theme</h2>
            
            <div className="space-y-4">
              {themeOptions.map((option) => (
                <label
                  key={option.value}
                  className={`flex items-start space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedTheme === option.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50 hover:bg-muted/50'
                  }`}
                >
                  <input
                    type="radio"
                    name="theme"
                    value={option.value}
                    checked={selectedTheme === option.value}
                    onChange={() => handleThemeChange(option.value)}
                    className="mt-1 h-4 w-4 text-primary border-border focus:ring-primary focus:ring-2"
                    disabled={isSaving}
                  />
                  <div className="flex-1">
                    <div className="font-medium text-text">{option.label}</div>
                    <div className="text-sm text-text/70">{option.description}</div>
                  </div>
                </label>
              ))}
            </div>

            {/* Status Messages */}
            {saveStatus === 'saved' && (
              <div className="mt-4 p-3 bg-success/10 border border-success/20 rounded-md">
                <p className="text-sm text-success">Theme preference saved to your profile</p>
              </div>
            )}

            {error && (
              <div className="mt-4 p-3 bg-error/10 border border-error/20 rounded-md">
                <p className="text-sm text-error">{error}</p>
              </div>
            )}

            {isSaving && (
              <div className="mt-4 flex items-center space-x-2 text-text/70">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                <span className="text-sm">Saving...</span>
              </div>
            )}
          </div>

          {/* Live Preview */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-xl font-semibold text-text mb-4">Preview</h2>
            <p className="text-text/70 mb-6">
              See how your theme choice looks with different UI elements.
            </p>

            <div className="space-y-4">
              {/* Card Preview */}
              <div className="bg-muted border border-border rounded-lg p-4">
                <h3 className="text-lg font-semibold text-text mb-2">Sample Card</h3>
                <p className="text-text/70 mb-4">
                  This is how cards and content areas will appear in your selected theme.
                </p>
                
                <div className="flex space-x-3">
                  <button className="px-4 py-2 bg-primary text-on-primary rounded-md hover:opacity-90 transition-opacity focus-ring">
                    Primary Button
                  </button>
                  <button className="px-4 py-2 bg-secondary text-on-secondary rounded-md hover:opacity-90 transition-opacity focus-ring">
                    Secondary Button
                  </button>
                </div>
              </div>

              {/* Status Indicators */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 bg-success/10 border border-success/20 rounded-md">
                  <div className="text-sm font-medium text-success">Success</div>
                </div>
                <div className="p-3 bg-warning/10 border border-warning/20 rounded-md">
                  <div className="text-sm font-medium text-warning">Warning</div>
                </div>
                <div className="p-3 bg-error/10 border border-error/20 rounded-md">
                  <div className="text-sm font-medium text-error">Error</div>
                </div>
                <div className="p-3 bg-info/10 border border-info/20 rounded-md">
                  <div className="text-sm font-medium text-info">Info</div>
                </div>
              </div>
            </div>
          </div>

          {/* Accessibility Note */}
          <div className="bg-muted border border-border rounded-lg p-4">
            <h3 className="text-sm font-semibold text-text mb-2">Accessibility</h3>
            <p className="text-sm text-text/70">
              All themes are designed to meet WCAG AA contrast requirements. 
              Text and interactive elements maintain proper contrast ratios for readability.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
