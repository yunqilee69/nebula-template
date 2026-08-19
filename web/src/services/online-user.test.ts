import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/request/request', () => ({
  request: vi.fn(),
}));

import { request } from '@/request/request';
import { onlineUserService } from './online-user';

const mockedRequest = vi.mocked(request);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('onlineUserService', () => {
  it('calls POST /api/auth/online-users/page with pagination filters', async () => {
    mockedRequest.mockResolvedValue({ data: [], total: 0 });

    await onlineUserService.pageOnlineUsers({ pageNum: 1, pageSize: 20, username: 'alice' });

    expect(mockedRequest).toHaveBeenCalledWith({
      method: 'POST',
      url: '/api/auth/online-users/page',
      data: { pageNum: 1, pageSize: 20, username: 'alice' },
    });
  });

  it('calls POST /api/auth/online-users/{cacheKey}/kick-out to kick out a session', async () => {
    mockedRequest.mockResolvedValue(undefined);

    await onlineUserService.kickOutOnlineUser('session:alice');

    expect(mockedRequest).toHaveBeenCalledWith({
      method: 'POST',
      url: '/api/auth/online-users/session%3Aalice/kick-out',
    });
  });
});
