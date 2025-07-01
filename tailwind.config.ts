import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fdf2f2',
          100: '#fde8e8',
          200: '#fbd5d5',
          300: '#f8b4b4',
          400: '#f98080',
          500: '#f05252',
          600: '#e02424',
          700: '#c81e1e',
          800: '#9b1c1c',
          900: '#771d1d',
        },
        sage: {
          50: '#f7f9f7',
          100: '#e6ede6',
          200: '#ccd9cc',
          300: '#a8bfa8',
          400: '#7f9d7f',
          500: '#5f7f5f',
          600: '#4c664c',
          700: '#3d523d',
          800: '#314031',
          900: '#2a362a',
        },
        charcoal: {
          50: '#f8f9fa',
          100: '#eceef1',
          200: '#d4d9df',
          300: '#b0b9c2',
          400: '#8593a2',
          500: '#667585',
          600: '#525d6b',
          700: '#434b57',
          800: '#393f48',
          900: '#32363d',
        },
        coral: '#FF6B6B',
      },
      fontFamily: {
        serif: ['Lora', 'serif'],
        sans: ['Inter', 'sans-serif'],
      },
      backgroundColor: {
        base: '#171717',
      },
      textColor: {
        base: '#ededed',
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: 'none',
            color: 'inherit',
            p: {
              color: 'inherit',
              marginTop: '1rem',
              marginBottom: '1rem',
            },
            a: {
              color: '#FF6B6B',
              textDecoration: 'none',
              '&:hover': {
                textDecoration: 'underline',
              },
            },
            strong: {
              color: 'inherit',
              fontWeight: '700',
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
              color: 'inherit',
              marginTop: '0.25rem',
              marginBottom: '0.25rem',
            },
            'li::marker': {
              color: 'inherit',
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