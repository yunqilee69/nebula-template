import { type PropsWithChildren, useEffect } from 'react';
import { useThemeStore, type NebulaThemeMode } from '@/stores/theme-store';

interface NebulaThemeProviderProps extends PropsWithChildren {
  defaultMode?: NebulaThemeMode;
}

export function NebulaThemeProvider({ defaultMode = 'light', children }: NebulaThemeProviderProps) {
  const setMode = useThemeStore((state) => state.setMode);

  useEffect(() => {
    setMode(defaultMode);
  }, [defaultMode, setMode]);

  return <>{children}</>;
}

export type { NebulaThemeMode };
