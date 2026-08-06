import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],

  theme: {
    extend: {
      fontFamily: {
        sans: ['Geist', 'Arial', 'sans-serif'],
        editorial: ['Newsreader', 'Georgia', 'serif'],
        mono: ['Geist Mono', 'SFMono-Regular', 'Consolas', 'monospace'],
      },

      colors: {
        // Reconciled palette: structural token names from the design-system doc, values from
        // the Reconciled Master Prompt / approved reference imagery (pearl white + violet/blue),
        // since the reference image is the source of truth where the two docs disagree.
        marketplace: {
          ink: '#0C0D12',
          charcoal: '#111426',
          paper: '#F7F8FC',
          canvas: '#EEF1F8',
          white: '#FFFFFF',
          muted: '#626A7D',
          'muted-light': '#8992A6',
          line: '#DFE4EF',
          violet: '#7A5CFF',
          'violet-hover': '#6A47F2',
          blue: '#4D82FF',
          midnight: '#090B18',
          'midnight-surface': '#111426',
        },
      },

      backgroundImage: {
        'violet-blue': 'linear-gradient(90deg, #7A5CFF 0%, #4D82FF 100%)',
      },

      fontSize: {
        'hero-mobile': ['3.5rem', { lineHeight: '0.94', letterSpacing: '-0.055em', fontWeight: '650' }],
        hero: ['5.5rem', { lineHeight: '0.94', letterSpacing: '-0.058em', fontWeight: '650' }],
        'section-display': ['4.5rem', { lineHeight: '0.99', letterSpacing: '-0.048em', fontWeight: '620' }],
        'section-title': ['3.25rem', { lineHeight: '1.02', letterSpacing: '-0.042em', fontWeight: '620' }],
        'editorial-display': ['4.75rem', { lineHeight: '0.98', letterSpacing: '-0.035em', fontWeight: '500' }],
        'body-large': ['1.1875rem', { lineHeight: '1.6', letterSpacing: '-0.014em' }],
        body: ['1rem', { lineHeight: '1.6', letterSpacing: '-0.008em' }],
        supporting: ['0.875rem', { lineHeight: '1.5', letterSpacing: '-0.005em' }],
        eyebrow: ['0.75rem', { lineHeight: '1', letterSpacing: '0.16em', fontWeight: '650' }],
      },

      borderRadius: {
        'brand-sm': '12px',
        brand: '18px',
        'brand-lg': '28px',
        'brand-xl': '36px',
      },

      boxShadow: {
        soft: '0 12px 35px rgba(12, 13, 18, 0.07)',
        lift: '0 18px 50px rgba(12, 13, 18, 0.10)',
      },

      maxWidth: {
        page: '1440px',
        reading: '720px',
        copy: '620px',
      },
    },
  },

  plugins: [],
};

export default config;
