import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSiteMessageStream } from './realtime-client';

type FakeReader = {
  read: () => Promise<{ done: boolean; value?: Uint8Array }>;
  cancel: () => Promise<void>;
};

function sseResponse(chunks: readonly string[], status = 200): Response {
  let index = 0;
  const reader: FakeReader = {
    read: async () => {
      if (index >= chunks.length) return { done: true, value: undefined };
      const chunk = chunks[index] ?? '';
      index += 1;
      return { done: false, value: new TextEncoder().encode(chunk) };
    },
    cancel: async () => {},
  };
  return {
    ok: status >= 200 && status < 300,
    status,
    body: { getReader: () => reader },
  } as unknown as Response;
}

function pendingResponse(): Response {
  const reader: FakeReader = {
    read: () => new Promise(() => {}),
    cancel: async () => {},
  };
  return {
    ok: true,
    status: 200,
    body: { getReader: () => reader },
  } as unknown as Response;
}

function signalFrame(messageId: string, createTime = '2026-10-09 12:00:00'): string {
  return `id:${messageId}\nevent:site-message\ndata:{"messageId":"${messageId}","createTime":"${createTime}"}\n\n`;
}

describe('createSiteMessageStream', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('opens the stream with Bearer token and sse accept header', async () => {
    const fetchImpl = vi.fn(async (_url: string, _init: RequestInit) => pendingResponse());

    const stream = createSiteMessageStream({
      getToken: () => 'access-token',
      refreshToken: async () => null,
      onSignal: () => {},
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    await vi.advanceTimersByTimeAsync(0);

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toBe('/api/notify/site-messages/subscribe');
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer access-token');
    expect(headers.Accept).toBe('text/event-stream');

    stream.close();
  });

  it('delivers parsed signals and ignores heartbeat frames', async () => {
    const onSignal = vi.fn();
    const fetchImpl = vi.fn(async (_url: string, _init: RequestInit) => sseResponse([': ping\n\n', signalFrame('message-1')]));

    const stream = createSiteMessageStream({
      getToken: () => 'token',
      refreshToken: async () => null,
      onSignal,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    await vi.advanceTimersByTimeAsync(0);

    expect(onSignal).toHaveBeenCalledTimes(1);
    expect(onSignal).toHaveBeenCalledWith({ messageId: 'message-1', createTime: '2026-10-09 12:00:00' });

    stream.close();
  });

  it('refreshes the token once on 401 and retries with the new token', async () => {
    const onSignal = vi.fn();
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(sseResponse([], 401))
      .mockResolvedValueOnce(sseResponse([signalFrame('message-1')]));
    const refreshToken = vi.fn(async () => 'refreshed-token');
    let token = 'stale-token';

    const stream = createSiteMessageStream({
      getToken: () => token,
      refreshToken: async () => {
        token = 'refreshed-token';
        return refreshToken();
      },
      onSignal,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    await vi.advanceTimersByTimeAsync(0);

    expect(refreshToken).toHaveBeenCalledTimes(1);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    const secondHeaders = fetchImpl.mock.calls[1]![1].headers as Record<string, string>;
    expect(secondHeaders.Authorization).toBe('Bearer refreshed-token');
    expect(onSignal).toHaveBeenCalledTimes(1);

    stream.close();
  });

  it('reconnects with exponential backoff after a failed response', async () => {
    const onError = vi.fn();
    const fetchImpl = vi.fn(async (_url: string, _init: RequestInit) => sseResponse([], 500));

    const stream = createSiteMessageStream({
      getToken: () => 'token',
      refreshToken: async () => null,
      onSignal: () => {},
      onError,
      minRetryDelayMs: 100,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    await vi.advanceTimersByTimeAsync(0);
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(100);
    expect(fetchImpl).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(199);
    expect(fetchImpl).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(1);
    expect(fetchImpl).toHaveBeenCalledTimes(3);

    expect(onError).toHaveBeenCalled();

    stream.close();
  });

  it('reconnects after the stream ends normally', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(sseResponse([signalFrame('message-1')]))
      .mockResolvedValue(pendingResponse());

    const stream = createSiteMessageStream({
      getToken: () => 'token',
      refreshToken: async () => null,
      onSignal: () => {},
      minRetryDelayMs: 50,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    await vi.advanceTimersByTimeAsync(0);
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(50);
    expect(fetchImpl).toHaveBeenCalledTimes(2);

    stream.close();
  });

  it('resets backoff after a successful connection', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(sseResponse([], 500))
      .mockResolvedValueOnce(sseResponse([signalFrame('message-1')]))
      .mockResolvedValue(sseResponse([], 500));

    const stream = createSiteMessageStream({
      getToken: () => 'token',
      refreshToken: async () => null,
      onSignal: () => {},
      minRetryDelayMs: 100,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    // 第一次失败 → 100ms 后重连成功
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(100);
    expect(fetchImpl).toHaveBeenCalledTimes(2);

    // 成功后断开（第二段流已结束）→ 退避重置为 100ms，而不是 200ms
    await vi.advanceTimersByTimeAsync(100);
    expect(fetchImpl).toHaveBeenCalledTimes(3);

    stream.close();
  });

  it('stops reconnecting after close', async () => {
    const fetchImpl = vi.fn(async (_url: string, _init: RequestInit) => sseResponse([], 500));

    const stream = createSiteMessageStream({
      getToken: () => 'token',
      refreshToken: async () => null,
      onSignal: () => {},
      minRetryDelayMs: 10,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    await vi.advanceTimersByTimeAsync(0);
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    stream.close();
    await vi.advanceTimersByTimeAsync(1000);

    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('does not open a connection without a token', async () => {
    const fetchImpl = vi.fn(async (_url: string, _init: RequestInit) => pendingResponse());

    const stream = createSiteMessageStream({
      getToken: () => null,
      refreshToken: async () => null,
      onSignal: () => {},
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    await vi.advanceTimersByTimeAsync(1000);

    expect(fetchImpl).not.toHaveBeenCalled();

    stream.close();
  });

  it('degrades to polling without retry when fetch is unavailable', async () => {
    const onError = vi.fn();
    const originalFetch = globalThis.fetch;
    // 模拟不支持 fetch 的宿主环境
    Reflect.deleteProperty(globalThis, 'fetch');

    try {
      const stream = createSiteMessageStream({
        getToken: () => 'token',
        refreshToken: async () => null,
        onSignal: () => {},
        onError,
        minRetryDelayMs: 10,
      });

      await vi.advanceTimersByTimeAsync(1000);

      expect(onError).toHaveBeenCalledTimes(1);
      stream.close();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
