import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ControlApiError, request } from './http';
import { clearTokens, saveTokens } from './token';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('control http client', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('unwraps successful business responses without sending a tenant code', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ code: '0', message: 'ok', data: { id: 't1' } }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(request<{ id: string }>('/api/auth/tenants')).resolves.toEqual({ id: 't1' });

    const headers = new Headers(fetchMock.mock.calls[0][1].headers as HeadersInit);
    expect(headers.get('X-Tenant-Code')).toBeNull();
    expect(headers.get('Authorization')).toBeNull();
  });

  it('throws a typed error for non-zero business codes', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      jsonResponse({ code: '19014', message: '仅平台管理员可操作', data: null }),
    ));

    await expect(request('/api/auth/tenants')).rejects.toMatchObject<Partial<ControlApiError>>({
      code: '19014',
      message: '仅平台管理员可操作',
    });
  });

  it('uses the stored access token for authenticated requests', async () => {
    saveTokens({ accessToken: 'access-token', refreshToken: 'refresh-token' });
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ code: '0', message: 'ok', data: true }));
    vi.stubGlobal('fetch', fetchMock);

    await request('/api/auth/current-user');

    const headers = new Headers(fetchMock.mock.calls[0][1].headers as HeadersInit);
    expect(headers.get('Authorization')).toBe('Bearer access-token');
    expect(headers.get('X-Tenant-Code')).toBeNull();

    clearTokens();
  });
});
