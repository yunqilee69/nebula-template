import { request } from '@/request/request';
import type { NotifyPreferenceResp, UpdateNotifyPreferenceReq } from '@/types/notify';

export interface NotifyPreferenceService {
  getPreference: () => Promise<NotifyPreferenceResp>;
  updatePreference: (data: UpdateNotifyPreferenceReq) => Promise<NotifyPreferenceResp>;
  resetPreference: () => Promise<NotifyPreferenceResp>;
}

export const notifyPreferenceService: NotifyPreferenceService = {
  getPreference: () => request<NotifyPreferenceResp>({ method: 'GET', url: '/api/notify/preferences/current' }),
  updatePreference: (data) => request<NotifyPreferenceResp>({ method: 'PUT', url: '/api/notify/preferences/current', data }),
  resetPreference: () => request<NotifyPreferenceResp>({ method: 'POST', url: '/api/notify/preferences/current/reset' }),
};
