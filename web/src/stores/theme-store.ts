import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type NebulaThemeMode = 'light' | 'dark';

export interface ThemeState {
  mode: NebulaThemeMode;
  compactMode: boolean;
  setMode: (mode: NebulaThemeMode) => void;
  toggleMode: () => void;
  setCompactMode: (compactMode: boolean) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      mode: 'light',
      compactMode: false,
      setMode: (mode) => set({ mode }),
      toggleMode: () => set((state) => ({ mode: state.mode === 'light' ? 'dark' : 'light' })),
      setCompactMode: (compactMode) => set({ compactMode }),
    }),
    { name: 'nebula-theme' },
  ),
);
