import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Background Colors
        bg: 'var(--bg)',
        'bg-secondary': 'var(--bg-secondary)',
        card: 'var(--card)',
        'card-hover': 'var(--card-hover)',
        
        // Text Colors
        text: 'var(--text)',
        'text-light': 'var(--text-light)',
        'text-muted': 'var(--text-muted)',
        
        // Brand Colors
        coral: {
          DEFAULT: 'var(--coral)',
          light: 'var(--coral-light)',
          dark: 'var(--coral-dark)',
        },
        sage: {
          DEFAULT: 'var(--sage)',
          light: 'var(--sage-light)',
          dark: 'var(--sage-dark)',
        },
        charcoal: {
          DEFAULT: 'var(--charcoal)',
          light: 'var(--charcoal-light)',
        },
        
        // Semantic Colors
        primary: {
          DEFAULT: 'var(--primary)',
          hover: 'var(--primary-hover)',
        },
        'on-primary': 'var(--on-primary)',
        
        secondary: {
          DEFAULT: 'var(--secondary)',
          hover: 'var(--secondary-hover)',
        },
        'on-secondary': 'var(--on-secondary)',
        
        accent: {
          DEFAULT: 'var(--accent)',
          light: 'var(--accent-light)',
        },
        'on-accent': 'var(--on-accent)',
        
        // UI Colors
        border: {
          DEFAULT: 'var(--border)',
          light: 'var(--border-light)',
        },
        divider: 'var(--divider)',
        
        // State Colors
        success: {
          DEFAULT: 'var(--success)',
          bg: 'var(--success-bg)',
        },
        warning: {
          DEFAULT: 'var(--warning)',
          bg: 'var(--warning-bg)',
        },
        error: {
          DEFAULT: 'var(--error)',
          bg: 'var(--error-bg)',
        },
        info: {
          DEFAULT: 'var(--info)',
          bg: 'var(--info-bg)',
        },
      },
      boxShadow: {
        'sm': 'var(--shadow-sm)',
        'DEFAULT': 'var(--shadow)',
        'md': 'var(--shadow-md)',
        'lg': 'var(--shadow-lg)',
      },
      fontFamily: {
        serif: ['Lora', 'serif'],
        sans: ['Inter', 'Arial', 'sans-serif'],
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: 'none',
            color: 'var(--text)',
            p: {
              color: 'var(--text)',
              marginTop: '1rem',
              marginBottom: '1rem',
            },
            a: {
              color: 'var(--primary)',
              textDecoration: 'none',
              fontWeight: '500',
              '&:hover': {
                textDecoration: 'underline',
                color: 'var(--primary-hover)',
              },
            },
            strong: {
              color: 'var(--text)',
              fontWeight: '700',
            },
            h1: {
              color: 'var(--text)',
            },
            h2: {
              color: 'var(--text)',
            },
            h3: {
              color: 'var(--text)',
            },
            h4: {
              color: 'var(--text)',
            },
            ul: {
              listStyleType: 'disc',
              paddingLeft: '1.5rem',
            },
            ol: {
              listStyleType: 'decimal',
              paddingLeft: '1.5rem',
            },
            li: {
              color: 'var(--text)',
              marginTop: '0.25rem',
              marginBottom: '0.25rem',
            },
            'li::marker': {
              color: 'var(--primary)',
            },
          },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
}

export default config
