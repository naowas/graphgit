function withOpacity(varName, fallback) {
  return ({ opacityValue }) => {
    if (opacityValue !== undefined) {
      return `color-mix(in srgb, var(${varName}, ${fallback}) calc(${opacityValue} * 100%), transparent)`;
    }
    return `var(${varName}, ${fallback})`;
  };
}

export default {
  content: ['./src/renderer/**/*.{ts,tsx,html}'],
  theme: {
    extend: {
      colors: {
        base: withOpacity('--color-base', '#181a1f'),
        panel: withOpacity('--color-panel', '#1e1f24'),
        panel2: withOpacity('--color-panel2', '#24262c'),
        panel3: withOpacity('--color-panel3', '#2b2e35'),
        edge: withOpacity('--color-edge', '#2e3038'),
        fg: withOpacity('--color-fg', '#d7dae0'),
        dim: withOpacity('--color-dim', '#9aa0aa'),
        faint: withOpacity('--color-faint', '#6b7280'),
        accent: withOpacity('--color-accent', '#4f8cff'),
        'accent-hover': withOpacity('--color-accent-hover', '#3b7bf0'),
        add: withOpacity('--color-add', '#4caf6e'),
        'add-bg': withOpacity('--color-add-bg', '#1f3d2b'),
        del: withOpacity('--color-del', '#e06c75'),
        'del-bg': withOpacity('--color-del-bg', '#3d1f1f'),
        warn: withOpacity('--color-warn', '#d7a94f')
      },
      fontFamily: {
        sans: ['var(--font-sans)', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['var(--font-mono)', '"JetBrains Mono"', '"Fira Code"', 'Menlo', 'Consolas', 'monospace']
      },
      fontSize: {
        xs: ['calc(var(--font-size-ui, 13px) - 2px)', '1.35'],
        sm: ['calc(var(--font-size-ui, 13px) - 1px)', '1.4'],
        base: ['var(--font-size-ui, 13px)', '1.45'],
        code: ['var(--font-size-code, 12px)', '1.5']
      }
    }
  },
  plugins: []
} satisfies Config;
