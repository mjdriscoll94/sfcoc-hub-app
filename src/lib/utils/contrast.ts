/**
 * Contrast ratio calculation utilities for accessibility testing
 * Based on WCAG 2.1 guidelines
 */

interface RGB {
  r: number;
  g: number;
  b: number;
}

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex: string): RGB | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

/**
 * Calculate relative luminance of a color
 */
function getLuminance(rgb: RGB): number {
  const { r, g, b } = rgb;
  
  // Convert to sRGB
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculate contrast ratio between two colors
 */
export function getContrastRatio(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  
  if (!rgb1 || !rgb2) {
    throw new Error('Invalid hex color format');
  }
  
  const lum1 = getLuminance(rgb1);
  const lum2 = getLuminance(rgb2);
  
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if contrast ratio meets WCAG AA standards
 */
export function meetsWCAGAA(contrastRatio: number, isLargeText: boolean = false): boolean {
  return isLargeText ? contrastRatio >= 3 : contrastRatio >= 4.5;
}

/**
 * Check if contrast ratio meets WCAG AAA standards
 */
export function meetsWCAGAAA(contrastRatio: number, isLargeText: boolean = false): boolean {
  return isLargeText ? contrastRatio >= 4.5 : contrastRatio >= 7;
}

/**
 * Test our theme colors for accessibility
 */
export function testThemeContrast(): {
  light: Record<string, { ratio: number; aa: boolean; aaa: boolean }>;
  dark: Record<string, { ratio: number; aa: boolean; aaa: boolean }>;
} {
  // Light theme colors
  const lightTheme = {
    text: '#1D252B',
    bg: '#FCFCFD',
    primary: '#FF6F61',
    'on-primary': '#FFFFFF',
    secondary: '#9CAF88',
    'on-secondary': '#0E1A14',
  };

  // Dark theme colors
  const darkTheme = {
    text: '#E6EDF3',
    bg: '#0F1417',
    primary: '#FF8A7B',
    'on-primary': '#2B0D0A',
    secondary: '#B6C9A5',
    'on-secondary': '#132016',
  };

  const testContrast = (textColor: string, bgColor: string) => {
    const ratio = getContrastRatio(textColor, bgColor);
    return {
      ratio: Math.round(ratio * 100) / 100,
      aa: meetsWCAGAA(ratio),
      aaa: meetsWCAGAAA(ratio),
    };
  };

  return {
    light: {
      'text-on-bg': testContrast(lightTheme.text, lightTheme.bg),
      'on-primary-on-primary': testContrast(lightTheme['on-primary'], lightTheme.primary),
      'on-secondary-on-secondary': testContrast(lightTheme['on-secondary'], lightTheme.secondary),
    },
    dark: {
      'text-on-bg': testContrast(darkTheme.text, darkTheme.bg),
      'on-primary-on-primary': testContrast(darkTheme['on-primary'], darkTheme.primary),
      'on-secondary-on-secondary': testContrast(darkTheme['on-secondary'], darkTheme.secondary),
    },
  };
}
