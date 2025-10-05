import { useEffect } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { withStorageDomEvents } from '@/middleware/withStorageDomEvents';

const statusBarColor = {
  light: '#ffffff',
  dark: '#1E232A',
} as const;

const localStorageKey = 'aimage-theme';

const isSystemInDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;

type ThemeStore = {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
};

export const useTheme = create<ThemeStore>()(
  persist(
    (set) => ({
      theme: isSystemInDarkMode ? 'dark' : 'light',
      toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
    }),
    { name: localStorageKey },
  ),
);

withStorageDomEvents(useTheme);

export function setDaisyUiTheme(theme: string) {
  document.documentElement.setAttribute('data-theme', theme);
}

export function setThemeColor(color: string) {
  const themeMeta = document.head.querySelector('meta[name="theme-color"]');
  themeMeta?.setAttribute('content', color);
}

export function useAutoChangeTheme() {
  const { theme } = useTheme();
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    setDaisyUiTheme(theme);
    setThemeColor(statusBarColor[theme]);
  }, [theme]);
}
