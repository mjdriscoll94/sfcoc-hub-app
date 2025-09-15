import { getContrastRatio, meetsWCAGAA, meetsWCAGAAA, testThemeContrast } from '../contrast';

describe('Contrast Utilities', () => {
  describe('getContrastRatio', () => {
    it('should calculate correct contrast ratio for black on white', () => {
      const ratio = getContrastRatio('#000000', '#FFFFFF');
      expect(ratio).toBeCloseTo(21, 1);
    });

    it('should calculate correct contrast ratio for white on black', () => {
      const ratio = getContrastRatio('#FFFFFF', '#000000');
      expect(ratio).toBeCloseTo(21, 1);
    });

    it('should calculate correct contrast ratio for gray on white', () => {
      const ratio = getContrastRatio('#808080', '#FFFFFF');
      expect(ratio).toBeCloseTo(4.5, 1);
    });

    it('should throw error for invalid hex colors', () => {
      expect(() => getContrastRatio('invalid', '#FFFFFF')).toThrow('Invalid hex color format');
    });
  });

  describe('meetsWCAGAA', () => {
    it('should return true for high contrast ratios', () => {
      expect(meetsWCAGAA(4.5)).toBe(true);
      expect(meetsWCAGAA(7)).toBe(true);
      expect(meetsWCAGAA(21)).toBe(true);
    });

    it('should return false for low contrast ratios', () => {
      expect(meetsWCAGAA(3)).toBe(false);
      expect(meetsWCAGAA(4.4)).toBe(false);
    });

    it('should use different thresholds for large text', () => {
      expect(meetsWCAGAA(3, true)).toBe(true);
      expect(meetsWCAGAA(2.9, true)).toBe(false);
    });
  });

  describe('meetsWCAGAAA', () => {
    it('should return true for very high contrast ratios', () => {
      expect(meetsWCAGAAA(7)).toBe(true);
      expect(meetsWCAGAAA(21)).toBe(true);
    });

    it('should return false for moderate contrast ratios', () => {
      expect(meetsWCAGAAA(6.9)).toBe(false);
      expect(meetsWCAGAAA(4.5)).toBe(false);
    });
  });

  describe('testThemeContrast', () => {
    it('should test all theme color combinations', () => {
      const results = testThemeContrast();
      
      expect(results.light).toHaveProperty('text-on-bg');
      expect(results.light).toHaveProperty('on-primary-on-primary');
      expect(results.light).toHaveProperty('on-secondary-on-secondary');
      
      expect(results.dark).toHaveProperty('text-on-bg');
      expect(results.dark).toHaveProperty('on-primary-on-primary');
      expect(results.dark).toHaveProperty('on-secondary-on-secondary');
    });

    it('should have valid contrast ratios', () => {
      const results = testThemeContrast();
      
      // All ratios should be positive numbers
      Object.values(results.light).forEach(result => {
        expect(result.ratio).toBeGreaterThan(0);
      });
      
      Object.values(results.dark).forEach(result => {
        expect(result.ratio).toBeGreaterThan(0);
      });
    });

    it('should meet WCAG AA standards for text on background', () => {
      const results = testThemeContrast();
      
      expect(results.light['text-on-bg'].aa).toBe(true);
      expect(results.dark['text-on-bg'].aa).toBe(true);
    });
  });
});
