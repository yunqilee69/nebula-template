import { useCallback } from 'react';
import type { NebulaMessageKey } from '@/i18n/types';
import { getMessages } from '@/i18n/messages';
import { useLocaleStore } from '@/stores/locale-store';

function resolveMessage(key: NebulaMessageKey, messages: unknown): string {
  let current: unknown = messages;

  for (const segment of key.split('.')) {
    if (typeof current !== 'object' || current === null) {
      return key;
    }

    const record = current as Record<string, unknown>;
    current = record[segment];
  }

  return typeof current === 'string' ? current : key;
}

export function useNebulaI18n() {
  const locale = useLocaleStore((state) => state.locale);
  const setLocale = useLocaleStore((state) => state.setLocale);
  const toggleLocale = useLocaleStore((state) => state.toggleLocale);

  const messages = getMessages(locale);

  const t = useCallback((key: NebulaMessageKey): string => resolveMessage(key, messages), [messages]);

  return { locale, setLocale, toggleLocale, t } as const;
}
