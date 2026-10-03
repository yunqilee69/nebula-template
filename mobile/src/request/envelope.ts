import { API_SUCCESS_CODE, type ApiEnvelope } from '../../../packages/client-sdk/index.ts';
import { createBusinessError } from './errors.ts';

/** 解包选项。 */
export interface UnwrapEnvelopeOptions {
  /** 二进制响应不解包 envelope（鉴权下载、图片预览）。 */
  binary?: boolean;
}

const DEFAULT_BUSINESS_ERROR_MESSAGE = '接口请求出错，请稍后重试';

/**
 * 判断是否为 `{code, message, data}` 信封。
 * `code` 允许 string 或 number，但服务端实际序列化为字符串。
 */
export function isApiEnvelope(value: unknown): value is ApiEnvelope<unknown> {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  if (!('code' in record) || !('data' in record)) return false;
  const code = record.code;
  if (typeof code !== 'string' && typeof code !== 'number') return false;
  if ('message' in record && typeof record.message !== 'string') return false;
  return true;
}

/**
 * 解包统一响应信封。
 *
 * <ul>
 *   <li>`code === "0"` → 返回 `data`；</li>
 *   <li>`code != "0"` → 抛出携带服务端 `message` 的业务错误（不自建 code→文案映射）；</li>
 *   <li>二进制响应（`binary`）→ 原样返回，不解包；</li>
 *   <li>非信封响应 → 原样返回（容错，保持与 web 行为一致）。</li>
 * </ul>
 */
export function unwrapEnvelope<T>(payload: unknown, options: UnwrapEnvelopeOptions = {}): T {
  if (options.binary) return payload as T;
  if (!isApiEnvelope(payload)) return payload as T;

  const code = String(payload.code);
  if (code === API_SUCCESS_CODE) return payload.data as T;

  const message = String(payload.message ?? '').trim() || DEFAULT_BUSINESS_ERROR_MESSAGE;
  throw createBusinessError(code, message);
}
