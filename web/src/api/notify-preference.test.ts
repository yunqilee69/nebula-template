import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/request/request', () => ({
  request: vi.fn(),
}));

import { request } from '@/request/request';
import { notifyPreferenceService } from './notify-preference';
import type { NotifyPreferenceResp, UpdateNotifyPreferenceReq } from '@/types/notify';

const mockedRequest = vi.mocked(request);

const preference: NotifyPreferenceResp = {
  categories: [
    {
      code: 'SECURITY',
      name: '安全与账号',
      mandatory: true,
      sort: 10,
      channels: [
        { channel: 'SITE', enabled: true, editable: false },
        { channel: 'EMAIL', enabled: true, editable: false },
        { channel: 'PUSH', enabled: true, editable: false },
      ],
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('notifyPreferenceService', () => {
  it('getPreference calls GET /api/notify/preferences/current', async () => {
    mockedRequest.mockResolvedValueOnce(preference);

    const result = await notifyPreferenceService.getPreference();

    expect(result).toBe(preference);
    expect(mockedRequest).toHaveBeenCalledWith({ method: 'GET', url: '/api/notify/preferences/current' });
  });

  it('updatePreference calls PUT /api/notify/preferences/current with the payload', async () => {
    const data: UpdateNotifyPreferenceReq = {
      items: [{ categoryCode: 'TODO', channel: 'PUSH', enabled: false }],
    };
    mockedRequest.mockResolvedValueOnce(preference);

    const result = await notifyPreferenceService.updatePreference(data);

    expect(result).toBe(preference);
    expect(mockedRequest).toHaveBeenCalledWith({ method: 'PUT', url: '/api/notify/preferences/current', data });
  });

  it('resetPreference calls POST /api/notify/preferences/current/reset', async () => {
    mockedRequest.mockResolvedValueOnce(preference);

    const result = await notifyPreferenceService.resetPreference();

    expect(result).toBe(preference);
    expect(mockedRequest).toHaveBeenCalledWith({ method: 'POST', url: '/api/notify/preferences/current/reset' });
  });
});
