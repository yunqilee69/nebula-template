import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { NebulaLocale } from '@/i18n/types';

export interface LocaleState {
  locale: NebulaLocale;
  setLocale: (locale: NebulaLocale) => void;
  toggleLocale: () => void;
}

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set) => ({
      locale: 'zh-CN',
      setLocale: (locale) => set({ locale }),
      toggleLocale: () =>
        set((state) => ({
          locale: state.locale === 'zh-CN' ? 'en-US' : 'zh-CN',
        })),
    }),
    { name: 'nebula-locale' },
  ),
);
