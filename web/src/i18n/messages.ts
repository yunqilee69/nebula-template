import type { NebulaLocale, NebulaMessages } from './types';
import { enUS } from './locales/en-US';
import { zhCN } from './locales/zh-CN';

const messages: Record<NebulaLocale, NebulaMessages> = {
  'zh-CN': zhCN,
  'en-US': enUS,
};

export function getMessages(locale: NebulaLocale): NebulaMessages {
  return messages[locale];
}
