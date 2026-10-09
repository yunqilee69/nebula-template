export interface SiteMessageSignal {
  readonly messageId: string;
  readonly createTime?: string;
}

export interface ParsedSseFrame {
  readonly id: string;
  readonly event: string;
  readonly data: string;
}

export interface SseParser {
  push(chunk: string): void;
}

const DATA_PREFIX = 'data:';
const ID_PREFIX = 'id:';
const EVENT_PREFIX = 'event:';

function readField(line: string, prefix: string): string | undefined {
  if (!line.startsWith(prefix)) return undefined;
  const value = line.slice(prefix.length);
  return value.startsWith(' ') ? value.slice(1) : value;
}

/**
 * 增量 SSE 帧解析器：按 `\n\n` 分帧，缓存跨 chunk 的半帧。
 * 只处理 id / event / data 三类字段，注释帧（心跳）不产生事件。
 */
export function createSseParser(onFrame: (frame: ParsedSseFrame) => void): SseParser {
  let buffer = '';

  const flushFrame = (rawFrame: string) => {
    let id = '';
    let event = '';
    const dataLines: string[] = [];
    let hasField = false;

    for (const line of rawFrame.split('\n')) {
      const normalized = line.endsWith('\r') ? line.slice(0, -1) : line;
      if (normalized === '') continue;

      const idValue = readField(normalized, ID_PREFIX);
      if (idValue !== undefined) {
        id = idValue;
        hasField = true;
        continue;
      }
      const eventValue = readField(normalized, EVENT_PREFIX);
      if (eventValue !== undefined) {
        event = eventValue;
        hasField = true;
        continue;
      }
      const dataValue = readField(normalized, DATA_PREFIX);
      if (dataValue !== undefined) {
        dataLines.push(dataValue);
        hasField = true;
      }
    }

    if (!hasField || dataLines.length === 0) return;
    onFrame({ id, event, data: dataLines.join('\n') });
  };

  return {
    push(chunk: string) {
      buffer += chunk;
      let separatorIndex = buffer.indexOf('\n\n');
      while (separatorIndex >= 0) {
        flushFrame(buffer.slice(0, separatorIndex));
        buffer = buffer.slice(separatorIndex + 2);
        separatorIndex = buffer.indexOf('\n\n');
      }
    },
  };
}

export const SITE_MESSAGE_STREAM_URL = '/api/notify/site-messages/subscribe';

const SITE_MESSAGE_EVENT = 'site-message';
const DEFAULT_MESSAGE_EVENT = 'message';
const DEFAULT_MIN_RETRY_DELAY_MS = 1000;
const DEFAULT_MAX_RETRY_DELAY_MS = 60000;

export interface SiteMessageStreamOptions {
  readonly getToken: () => string | null;
  /**
   * 刷新 access token。与普通请求共用同一套单飞刷新逻辑，
   * 刷新期间另起的请求会复用同一个 Promise。
   */
  readonly refreshToken: () => Promise<string | null>;
  readonly onSignal: (signal: SiteMessageSignal) => void;
  /** 连接建立（含重连成功）时回调，用于触发一次补偿拉取。 */
  readonly onOpen?: () => void;
  readonly onError?: (error: unknown) => void;
  readonly url?: string;
  readonly fetchImpl?: typeof fetch;
  readonly minRetryDelayMs?: number;
  readonly maxRetryDelayMs?: number;
}

export interface SiteMessageStream {
  close(): void;
}

function toSignal(frame: ParsedSseFrame): SiteMessageSignal | null {
  if (frame.event !== SITE_MESSAGE_EVENT && frame.event !== DEFAULT_MESSAGE_EVENT) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(frame.data);
    if (!parsed || typeof parsed !== 'object') return null;
    const candidate = parsed as { messageId?: unknown; createTime?: unknown };
    if (typeof candidate.messageId !== 'string' || !candidate.messageId) return null;
    return {
      messageId: candidate.messageId,
      createTime: typeof candidate.createTime === 'string' ? candidate.createTime : undefined,
    };
  } catch {
    return null;
  }
}

/**
 * 站内信实时信号流（SSE）。
 *
 * <p>用 fetch + ReadableStream 而非原生 EventSource：原生 EventSource 无法携带
 * Authorization 头，而本项目鉴权只认 Bearer 头，禁止把 token 放进 query。</p>
 *
 * <p>断线/非 2xx/流正常结束都会按指数退避重连（上限 60 秒），401 时先刷新 token
 * 再重试一次；收到信号只表示「有新消息」，数据仍需回拉接口获取。</p>
 */
export function createSiteMessageStream(options: SiteMessageStreamOptions): SiteMessageStream {
  const minRetryDelayMs = options.minRetryDelayMs ?? DEFAULT_MIN_RETRY_DELAY_MS;
  const maxRetryDelayMs = options.maxRetryDelayMs ?? DEFAULT_MAX_RETRY_DELAY_MS;
  const fetchImpl = options.fetchImpl
    ?? (typeof fetch === 'function' ? fetch.bind(globalThis) : undefined);
  const url = options.url ?? SITE_MESSAGE_STREAM_URL;

  let closed = false;
  let attempt = 0;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let abortController: AbortController | undefined;

  if (!fetchImpl) {
    // 环境不支持 fetch（老浏览器/非浏览器宿主）：直接降级到兜底轮询，不进入重试循环
    options.onError?.(new Error('当前环境不支持 fetch，站内信实时通道降级为轮询'));
    return { close() {} };
  }

  const scheduleReconnect = () => {
    if (closed) return;
    const delay = Math.min(maxRetryDelayMs, minRetryDelayMs * 2 ** attempt);
    attempt += 1;
    retryTimer = setTimeout(() => {
      retryTimer = undefined;
      void connect();
    }, delay);
  };

  const readStream = async (response: Response, token: string): Promise<void> => {
    const body = response.body;
    if (!body) {
      scheduleReconnect();
      return;
    }
    const parser = createSseParser((frame) => {
      const signal = toSignal(frame);
      if (signal) options.onSignal(signal);
    });
    const reader = body.getReader();
    const decoder = new TextDecoder();
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done || closed) break;
        if (value) parser.push(decoder.decode(value, { stream: true }));
      }
    } catch (error) {
      if (!closed) options.onError?.(error);
    } finally {
      try {
        await reader.cancel();
      } catch {
        // 连接已断开，取消失败无需处理
      }
    }
    if (!closed && token) scheduleReconnect();
  };

  const connect = async (): Promise<void> => {
    if (closed) return;
    const token = options.getToken();
    if (!token) return;

    abortController = new AbortController();
    let response: Response;
    try {
      response = await fetchImpl(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'text/event-stream',
          'X-Client-Type': 'WEB',
        },
        signal: abortController.signal,
      });
    } catch (error) {
      if (!closed) {
        options.onError?.(error);
        scheduleReconnect();
      }
      return;
    }

    if (closed) return;

    if (response.status === 401) {
      const refreshed = await options.refreshToken();
      if (closed) return;
      if (refreshed) {
        await connect();
      } else {
        options.onError?.(new Error('站内信实时通道鉴权失败'));
        scheduleReconnect();
      }
      return;
    }

    if (!response.ok) {
      options.onError?.(new Error(`站内信实时通道建立失败: ${response.status}`));
      scheduleReconnect();
      return;
    }

    attempt = 0;
    options.onOpen?.();
    await readStream(response, token);
  };

  void connect();

  return {
    close() {
      closed = true;
      if (retryTimer !== undefined) {
        clearTimeout(retryTimer);
        retryTimer = undefined;
      }
      abortController?.abort();
    },
  };
}
