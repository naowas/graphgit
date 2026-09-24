import { create } from 'zustand';

export type ThemeId =
  | 'stratagit-dark'
  | 'graphgit-dark'
  | 'github-dark'
  | 'dracula'
  | 'nord'
  | 'cyberpunk'
  | 'monokai'
  | 'one-dark'
  | 'solarized-dark'
  | 'light';

export interface ThemeDefinition {
  id: ThemeId;
  name: string;
  description: string;
  isLight?: boolean;
  colors: {
    base: string;
    panel: string;
    panel2: string;
    panel3: string;
    edge: string;
    fg: string;
    dim: string;
    faint: string;
    accent: string;
    accentHover: string;
    add: string;
    addBg: string;
    del: string;
    delBg: string;
    warn: string;
  };
}

export const THEMES: Record<ThemeId, ThemeDefinition> = {
  'stratagit-dark': {
    id: 'stratagit-dark',
    name: 'StrataGit Dark',
    description: 'Sleek onyx & electric cyan theme inspired by modern dev tools',
    colors: {
      base: '#14171d',
      panel: '#1a1d24',
      panel2: '#222630',
      panel3: '#2a303d',
      edge: '#2d3340',
      fg: '#e2e8f0',
      dim: '#94a3b8',
      faint: '#64748b',
      accent: '#38bdf8',
      accentHover: '#0ea5e9',
      add: '#34d399',
      addBg: '#064e3b4d',
      del: '#f87171',
      delBg: '#7f1d1d4d',
      warn: '#fbbf24'
    }
  },
  'graphgit-dark': {
    id: 'graphgit-dark',
    name: 'StrataGit Dark (Legacy)',
    description: 'Legacy alias for StrataGit Dark',
    colors: {
      base: '#14171d',
      panel: '#1a1d24',
      panel2: '#222630',
      panel3: '#2a303d',
      edge: '#2d3340',
      fg: '#e2e8f0',
      dim: '#94a3b8',
      faint: '#64748b',
      accent: '#38bdf8',
      accentHover: '#0ea5e9',
      add: '#34d399',
      addBg: '#064e3b4d',
      del: '#f87171',
      delBg: '#7f1d1d4d',
      warn: '#fbbf24'
    }
  },
  'github-dark': {
    id: 'github-dark',
    name: 'GitHub Dark Dimmed',
    description: 'Subtle slate & blue theme familiar to GitHub users',
    colors: {
      base: '#1c2128',
      panel: '#22272e',
      panel2: '#2d333b',
      panel3: '#373e47',
      edge: '#444c56',
      fg: '#adbac7',
      dim: '#768390',
      faint: '#545d68',
      accent: '#539bf5',
      accentHover: '#4184e4',
      add: '#57ab5a',
      addBg: '#1f3d2b',
      del: '#e5534b',
      delBg: '#461c19',
      warn: '#c69026'
    }
  },
  dracula: {
    id: 'dracula',
    name: 'Dracula',
    description: 'Classic dark vampire theme with vibrant pink & purple accents',
    colors: {
      base: '#1e1f29',
      panel: '#282a36',
      panel2: '#343746',
      panel3: '#44475a',
      edge: '#4d5166',
      fg: '#f8f8f2',
      dim: '#b0b4c8',
      faint: '#6272a4',
      accent: '#bd93f9',
      accentHover: '#a77bee',
      add: '#50fa7b',
      addBg: '#183b26',
      del: '#ff5555',
      delBg: '#4d1c24',
      warn: '#f1fa8c'
    }
  },
  nord: {
    id: 'nord',
    name: 'Nord Arctic',
    description: 'Arctic, north-bluish clean dark palette',
    colors: {
      base: '#242933',
      panel: '#2e3440',
      panel2: '#3b4252',
      panel3: '#434c5e',
      edge: '#4c566a',
      fg: '#eceff4',
      dim: '#d8dee9',
      faint: '#7b88a1',
      accent: '#88c0d0',
      accentHover: '#81a1c1',
      add: '#a3be8c',
      addBg: '#25382b',
      del: '#bf616a',
      delBg: '#42242b',
      warn: '#ebcb8b'
    }
  },
  cyberpunk: {
    id: 'cyberpunk',
    name: 'Cyberpunk Neon',
    description: 'High-contrast retro-future dark with glowing neon cyan & hot pink',
    colors: {
      base: '#120e24',
      panel: '#1a1433',
      panel2: '#261c4a',
      panel3: '#362768',
      edge: '#4a358c',
      fg: '#f5eeff',
      dim: '#b8a3e0',
      faint: '#7f66ad',
      accent: '#00f0ff',
      accentHover: '#00cce0',
      add: '#05ffa1',
      addBg: '#053d26',
      del: '#ff2a85',
      delBg: '#4d0b28',
      warn: '#ffe600'
    }
  },
  monokai: {
    id: 'monokai',
    name: 'Monokai Pro',
    description: 'Warm charcoal with cheerful yellow, green, and red highlights',
    colors: {
      base: '#19181a',
      panel: '#221f22',
      panel2: '#2d2a2e',
      panel3: '#3d373f',
      edge: '#49434c',
      fg: '#fcfcfa',
      dim: '#939293',
      faint: '#727072',
      accent: '#ffd866',
      accentHover: '#e6c152',
      add: '#a9dc76',
      addBg: '#23381a',
      del: '#ff6188',
      delBg: '#421822',
      warn: '#fc9867'
    }
  },
  'one-dark': {
    id: 'one-dark',
    name: 'One Dark Pro',
    description: 'Beloved Atom & VS Code dark theme with balanced contrast',
    colors: {
      base: '#1e2227',
      panel: '#21252b',
      panel2: '#282c34',
      panel3: '#323842',
      edge: '#3e4451',
      fg: '#abb2bf',
      dim: '#828997',
      faint: '#5c6370',
      accent: '#61afef',
      accentHover: '#4d98d8',
      add: '#98c379',
      addBg: '#23381e',
      del: '#e06c75',
      delBg: '#3d1f23',
      warn: '#e5c07b'
    }
  },
  'solarized-dark': {
    id: 'solarized-dark',
    name: 'Solarized Dark',
    description: 'Scientifically crafted teal-tinted low contrast dark palette',
    colors: {
      base: '#00212b',
      panel: '#073642',
      panel2: '#0b4250',
      panel3: '#0f5263',
      edge: '#166276',
      fg: '#93a1a1',
      dim: '#839496',
      faint: '#586e75',
      accent: '#268bd2',
      accentHover: '#1d76b5',
      add: '#859900',
      addBg: '#1b360b',
      del: '#dc322f',
      delBg: '#421616',
      warn: '#b58900'
    }
  },
  light: {
    id: 'light',
    name: 'Clean Studio Light',
    description: 'Crisp, high-readability daylight theme with sharp typography',
    isLight: true,
    colors: {
      base: '#f6f8fa',
      panel: '#ffffff',
      panel2: '#f0f2f5',
      panel3: '#e4e7eb',
      edge: '#d0d7de',
      fg: '#1f2328',
      dim: '#57606a',
      faint: '#8c959f',
      accent: '#0969da',
      accentHover: '#0854ad',
      add: '#1a7f37',
      addBg: '#dafbe1',
      del: '#cf222e',
      delBg: '#ffebe9',
      warn: '#9a6700'
    }
  }
};

export const UI_FONT_PRESETS = [
  { label: 'System Default', value: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' },
  { label: 'Inter', value: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif' },
  { label: 'Outfit', value: '"Outfit", -apple-system, BlinkMacSystemFont, sans-serif' },
  { label: 'Roboto', value: '"Roboto", -apple-system, BlinkMacSystemFont, sans-serif' },
  { label: 'Segoe UI', value: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif' },
  { label: 'Ubuntu', value: '"Ubuntu", -apple-system, BlinkMacSystemFont, sans-serif' },
  { label: 'Custom…', value: 'custom' }
];

export const CODE_FONT_PRESETS = [
  { label: 'JetBrains Mono', value: '"JetBrains Mono", Menlo, Consolas, monospace' },
  { label: 'Fira Code', value: '"Fira Code", monospace' },
  { label: 'Menlo', value: 'Menlo, Monaco, Consolas, monospace' },
  { label: 'Consolas', value: 'Consolas, "Liberation Mono", Courier, monospace' },
  { label: 'Source Code Pro', value: '"Source Code Pro", monospace' },
  { label: 'Inconsolata', value: '"Inconsolata", monospace' },
  { label: 'Custom…', value: 'custom' }
];

export interface SettingsState {
  isSettingsOpen: boolean;
  theme: ThemeId;
  uiFontSize: number;
  codeFontSize: number;
  uiFontFamily: string;
  customUiFont: string;
  codeFontFamily: string;
  customCodeFont: string;
  graphRowHeight: number;

  openSettings: () => void;
  closeSettings: () => void;
  setTheme: (theme: ThemeId) => void;
  setUiFontSize: (size: number) => void;
  setCodeFontSize: (size: number) => void;
  setUiFontFamily: (font: string) => void;
  setCustomUiFont: (font: string) => void;
  setCodeFontFamily: (font: string) => void;
  setCustomCodeFont: (font: string) => void;
  setGraphRowHeight: (height: number) => void;
  resetDefaults: () => void;
}

const STORAGE_KEY = 'stratagit:settings:v1';
const LEGACY_STORAGE_KEY = 'graphgit:settings:v1';

const DEFAULT_SETTINGS = {
  theme: 'stratagit-dark' as ThemeId,
  uiFontSize: 13,
  codeFontSize: 12,
  uiFontFamily: 'Inter',
  customUiFont: '',
  codeFontFamily: 'JetBrains Mono',
  customCodeFont: '',
  graphRowHeight: 26
};

function loadStoredSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    if (parsed.theme === 'graphgit-dark') {
      parsed.theme = 'stratagit-dark';
    }
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveSettings(settings: Partial<typeof DEFAULT_SETTINGS>) {
  try {
    const current = loadStoredSettings();
    const updated = { ...current, ...settings };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Ignore storage quota errors
  }
}

export function applySettingsToDOM(settings: {
  theme: ThemeId;
  uiFontSize: number;
  codeFontSize: number;
  uiFontFamily: string;
  customUiFont: string;
  codeFontFamily: string;
  customCodeFont: string;
}) {
  const root = document.documentElement;
  const theme = THEMES[settings.theme] || THEMES['stratagit-dark'];

  // Apply colors
  for (const [key, value] of Object.entries(theme.colors)) {
    root.style.setProperty(`--color-${key}`, value);
  }

  // Handle color scheme class
  if (theme.isLight) {
    root.classList.add('light');
    root.classList.remove('dark');
    root.style.colorScheme = 'light';
  } else {
    root.classList.add('dark');
    root.classList.remove('light');
    root.style.colorScheme = 'dark';
  }

  root.setAttribute('data-theme', theme.id);

  // Apply font sizes
  root.style.setProperty('--font-size-ui', `${settings.uiFontSize}px`);
  root.style.setProperty('--font-size-code', `${settings.codeFontSize}px`);

  // UI Font resolution
  let sansFont = settings.uiFontFamily;
  if (sansFont === 'custom' && settings.customUiFont.trim()) {
    sansFont = `"${settings.customUiFont.trim()}", -apple-system, BlinkMacSystemFont, sans-serif`;
  } else {
    const preset = UI_FONT_PRESETS.find((p) => p.label === sansFont || p.value === sansFont);
    sansFont = preset ? preset.value : `"${sansFont}", sans-serif`;
  }
  root.style.setProperty('--font-sans', sansFont);

  // Code Font resolution
  let monoFont = settings.codeFontFamily;
  if (monoFont === 'custom' && settings.customCodeFont.trim()) {
    monoFont = `"${settings.customCodeFont.trim()}", monospace`;
  } else {
    const preset = CODE_FONT_PRESETS.find((p) => p.label === monoFont || p.value === monoFont);
    monoFont = preset ? preset.value : `"${monoFont}", monospace`;
  }
  root.style.setProperty('--font-mono', monoFont);
}

// Initial application on file load
const initial = loadStoredSettings();
if (typeof document !== 'undefined') {
  applySettingsToDOM(initial);
}

export const useSettings = create<SettingsState>((set, get) => ({
  isSettingsOpen: false,
  ...initial,

  openSettings: () => set({ isSettingsOpen: true }),
  closeSettings: () => set({ isSettingsOpen: false }),

  setTheme: (theme: ThemeId) => {
    set({ theme });
    saveSettings({ theme });
    applySettingsToDOM({ ...get(), theme });
  },

  setUiFontSize: (uiFontSize: number) => {
    set({ uiFontSize });
    saveSettings({ uiFontSize });
    applySettingsToDOM({ ...get(), uiFontSize });
  },

  setCodeFontSize: (codeFontSize: number) => {
    set({ codeFontSize });
    saveSettings({ codeFontSize });
    applySettingsToDOM({ ...get(), codeFontSize });
  },

  setUiFontFamily: (uiFontFamily: string) => {
    set({ uiFontFamily });
    saveSettings({ uiFontFamily });
    applySettingsToDOM({ ...get(), uiFontFamily });
  },

  setCustomUiFont: (customUiFont: string) => {
    set({ customUiFont });
    saveSettings({ customUiFont });
    applySettingsToDOM({ ...get(), customUiFont });
  },

  setCodeFontFamily: (codeFontFamily: string) => {
    set({ codeFontFamily });
    saveSettings({ codeFontFamily });
    applySettingsToDOM({ ...get(), codeFontFamily });
  },

  setCustomCodeFont: (customCodeFont: string) => {
    set({ customCodeFont });
    saveSettings({ customCodeFont });
    applySettingsToDOM({ ...get(), customCodeFont });
  },

  setGraphRowHeight: (graphRowHeight: number) => {
    set({ graphRowHeight });
    saveSettings({ graphRowHeight });
  },

  resetDefaults: () => {
    set(DEFAULT_SETTINGS);
    saveSettings(DEFAULT_SETTINGS);
    applySettingsToDOM(DEFAULT_SETTINGS);
  }
}));
