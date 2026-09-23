import type { Config } from 'tailwindcss';

export default {
  content: ['./src/renderer/**/*.{ts,tsx,html}'],
  theme: {
    extend: {
      colors: {
        base: '#181a1f',
        panel: '#1e1f24',
        panel2: '#24262c',
        panel3: '#2b2e35',
        edge: '#2e3038',
        fg: '#d7dae0',
        dim: '#9aa0aa',
        faint: '#6b7280',
        accent: '#4f8cff',
        'accent-hover': '#3b7bf0',
        add: '#4caf6e',
        'add-bg': '#1f3d2b',
        del: '#e06c75',
        'del-bg': '#3d1f1f',
        warn: '#d7a94f'
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'Menlo', 'Consolas', 'monospace']
      },
      fontSize: {
        xs: ['11px', '14px'],
        sm: ['12px', '16px'],
        base: ['13px', '18px']
      }
    }
  },
  plugins: []
} satisfies Config;
