import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequestClient } from '../src/request/client.ts';
import { createHttpError } from '../src/request/errors.ts';
import type { HttpTransport, HttpResponse, TransportRequest } from '../src/request/types.ts';

function envelope<T>(data: T) {
  return { code: '0', message: 'success', data };
}

test('RequestClientTest.testClientTypeHeaderInjected', async () => {
  const requests: TransportRequest[] = [];
  const transport: HttpTransport = {
    async request(req): Promise<HttpResponse> {
      requests.push(req);
      return { status: 200, data: envelope({ ok: true }), headers: {} };
    },
  };
  const client = createRequestClient({ transport, getAccessToken: () => 'token-1' });

  await client.request({ method: 'GET', url: '/api/a' });
  await client.request({ method: 'GET', url: '/api/b' });

  assert.equal(requests.length, 2);
  assert.equal(requests[0]!.headers['X-Client-Type'], 'APP');
  assert.equal(requests[1]!.headers['X-Client-Type'], 'APP');
  assert.equal(requests[0]!.headers.Authorization, 'Bearer token-1');
});

test('RequestClientTest.testAnonymousEndpointHasNoAuthorization', async () => {
  const requests: TransportRequest[] = [];
  const transport: HttpTransport = {
    async request(req): Promise<HttpResponse> {
      requests.push(req);
      return { status: 200, data: envelope({ ok: true }), headers: {} };
    },
  };
  const client = createRequestClient({ transport, getAccessToken: () => 'token-1' });
  await client.request({ method: 'GET', url: '/api/frontend/init' });
  assert.equal(requests[0]!.headers.Authorization, undefined);
});

test('RequestClientTest.testSingleFlightRefresh', async () => {
  let token = 'old';
  let refreshCount = 0;
  const transport: HttpTransport = {
    async request(req): Promise<HttpResponse> {
      if (req.headers.Authorization === 'Bearer old') {
        throw createHttpError(401, 'expired');
      }
      return { status: 200, data: envelope({ url: req.url }), headers: {} };
    },
  };
  const client = createRequestClient({
    transport,
    getAccessToken: () => token,
    refreshAccessToken: async () => {
      refreshCount += 1;
      await new Promise((resolve) => setTimeout(resolve, 5));
      token = 'new';
      return 'new';
    },
  });

  const results = await Promise.all([
    client.request<{ url: string }>({ method: 'GET', url: '/api/a' }),
    client.request<{ url: string }>({ method: 'GET', url: '/api/b' }),
    client.request<{ url: string }>({ method: 'GET', url: '/api/c' }),
  ]);

  assert.equal(refreshCount, 1, '并发 3 个 401 只触发 1 次刷新');
  assert.deepEqual(results.map((item) => item.url), ['/api/a', '/api/b', '/api/c']);
});

test('RequestClientTest.testRefreshFailedClearsSession', async () => {
  let unauthorizedCount = 0;
  const transport: HttpTransport = {
    async request(): Promise<HttpResponse> {
      throw createHttpError(401, 'expired');
    },
  };
  const client = createRequestClient({
    transport,
    getAccessToken: () => 'old',
    refreshAccessToken: async () => null,
    onUnauthorized: () => {
      unauthorizedCount += 1;
    },
  });

  await assert.rejects(() => client.request({ method: 'GET', url: '/api/a' }));
  assert.equal(unauthorizedCount, 1);
});

test('RequestClientTest.testRefreshNotRecursive', async () => {
  let refreshCount = 0;
  const transport: HttpTransport = {
    async request(): Promise<HttpResponse> {
      throw createHttpError(401, 'expired');
    },
  };
  const client = createRequestClient({
    transport,
    getAccessToken: () => 'old',
    refreshAccessToken: async () => {
      refreshCount += 1;
      return 'new';
    },
  });

  await assert.rejects(() =>
    client.request({ method: 'POST', url: '/api/auth/refresh', skipAuthRefresh: true }),
  );
  assert.equal(refreshCount, 0, '刷新请求自身 401 不得再触发刷新');
});

test('RequestClientTest.testBusinessErrorPropagatesMessage', async () => {
  const messages: string[] = [];
  const transport: HttpTransport = {
    async request(): Promise<HttpResponse> {
      return { status: 200, data: { code: '18001', message: '无权限', data: null }, headers: {} };
    },
  };
  const client = createRequestClient({
    transport,
    onBusinessError: (message) => messages.push(message),
  });

  await assert.rejects(
    () => client.request({ method: 'GET', url: '/api/a' }),
    (error: unknown) => (error as Error).message === '无权限',
  );
  assert.deepEqual(messages, ['无权限']);
});
