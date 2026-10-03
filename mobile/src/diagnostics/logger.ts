/**
 * 结构化日志与敏感信息脱敏。
 *
 * <p><b>硬性约束</b>：push token / access token / refresh token 等属于个人数据，
 * 日志中不得出现完整值（功能说明书 §5.4、`docs/spec/09-security.md`）。</p>
 */

/** 需要脱敏的字段名（小写比较）。 */
export const SENSITIVE_KEYS: readonly string[] = [
  'token',
  'pushtoken',
  'accesstoken',
  'refreshtoken',
  'authorization',
  'password',
  'secret',
  'appsecret',
  'privatekey',
];

const MASK = '***';

/** 脱敏单个 token：非空一律返回固定掩码，绝不保留任何片段。 */
export function redactToken(token?: string | null): string {
  if (token === undefined || token === null || token === '') return '';
  return MASK;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** 递归脱敏对象中的敏感字段。 */
export function redactSensitive(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((item) => redactSensitive(item));
  if (!isPlainObject(value)) return value;

  const result: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (SENSITIVE_KEYS.includes(key.toLowerCase())) {
      result[key] = redactToken(typeof entry === 'string' ? entry : MASK);
    } else {
      result[key] = redactSensitive(entry);
    }
  }
  return result;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogRecord {
  level: LogLevel;
  message: string;
  timestamp: number;
  context?: Record<string, unknown>;
  data?: unknown;
}

export interface LogSink {
  log(record: LogRecord): void;
}

/** 默认输出到控制台（RN 下即 Metro 日志）。 */
export const consoleLogSink: LogSink = {
  log(record) {
    // eslint-disable-next-line no-console
    console[record.level === 'debug' ? 'log' : record.level](record.message, record.data ?? '');
  },
};

export interface LoggerDeps {
  sink?: LogSink;
  context?: Record<string, unknown>;
  now?: () => number;
}

export interface Logger {
  debug(message: string, data?: unknown): void;
  info(message: string, data?: unknown): void;
  warn(message: string, data?: unknown): void;
  error(message: string, data?: unknown): void;
  child(context: Record<string, unknown>): Logger;
}

export function createLogger(deps: LoggerDeps = {}): Logger {
  const sink = deps.sink ?? consoleLogSink;
  const now = deps.now ?? Date.now;
  const context = deps.context ?? {};

  const emit = (level: LogLevel, message: string, data?: unknown): void => {
    const record: LogRecord = { level, message, timestamp: now(), context };
    if (data !== undefined) record.data = redactSensitive(data);
    sink.log(record);
  };

  return {
    debug: (message, data) => emit('debug', message, data),
    info: (message, data) => emit('info', message, data),
    warn: (message, data) => emit('warn', message, data),
    error: (message, data) => emit('error', message, data),
    child(childContext) {
      return createLogger({ sink, now, context: { ...context, ...childContext } });
    },
  };
}
