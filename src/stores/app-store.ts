import { create } from 'zustand';

interface AppState {
  initialized: boolean;
  siderCollapsed: boolean;
  setInitialized: (initialized: boolean) => void;
  setSiderCollapsed: (collapsed: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  initialized: false,
  siderCollapsed: false,
  setInitialized: (initialized) => set({ initialized }),
  setSiderCollapsed: (siderCollapsed) => set({ siderCollapsed }),
}));
