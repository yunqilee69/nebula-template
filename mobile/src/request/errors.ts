/**
 * 请求层错误类型。
 *
 * <p>用工厂函数 + 品牌字段而不是 class：Node 的类型剥离运行时不支持会产出运行时代码的
 * TS 构造（参数属性/装饰器等），工厂函数在 tsc 与 node --test 下行为一致。</p>
 */

/** 业务错误（HTTP 200 但 `code != 0`）。`message` 为服务端已本地化文案，直接展示。 */
export interface NebulaBusinessError extends Error {
  readonly name: 'NebulaBusinessError';
  readonly code: string;
}

/** HTTP 层错误（non-2xx）。 */
export interface NebulaHttpError extends Error {
  readonly name: 'NebulaHttpError';
  readonly status: number;
}

/** 网络错误/超时（请求未拿到响应）。 */
export interface NebulaNetworkError extends Error {
  readonly name: 'NebulaNetworkError';
}

export function createBusinessError(code: string, message: string): NebulaBusinessError {
  const error = new Error(message);
  Object.defineProperty(error, 'name', { value: 'NebulaBusinessError', enumerable: false });
  return Object.assign(error, { code }) as unknown as NebulaBusinessError;
}

export function createHttpError(status: number, message: string): NebulaHttpError {
  const error = new Error(message);
  Object.defineProperty(error, 'name', { value: 'NebulaHttpError', enumerable: false });
  return Object.assign(error, { status }) as unknown as NebulaHttpError;
}

export function createNetworkError(message: string, cause?: unknown): NebulaNetworkError {
  const error = new Error(message);
  Object.defineProperty(error, 'name', { value: 'NebulaNetworkError', enumerable: false });
  if (cause !== undefined) (error as { cause?: unknown }).cause = cause;
  return error as NebulaNetworkError;
}

export function isBusinessError(error: unknown): error is NebulaBusinessError {
  return error instanceof Error && error.name === 'NebulaBusinessError';
}

export function isHttpError(error: unknown): error is NebulaHttpError {
  return error instanceof Error && error.name === 'NebulaHttpError';
}

export function isUnauthorizedError(error: unknown): boolean {
  return isHttpError(error) && error.status === 401;
}

/** 权限不足（服务端既有错误码 `AuthErrorInfo.BUTTON_PERMISSION_DENIED`，基座不新增）。 */
export const BUTTON_PERMISSION_DENIED = '18002';
/** 受限客户端作用域拒绝。 */
export const CLIENT_SCOPE_DENIED = '18003';

export function isPermissionDeniedError(error: unknown): boolean {
  return isBusinessError(error) && error.code === BUTTON_PERMISSION_DENIED;
}

export function isClientScopeDeniedError(error: unknown): boolean {
  return isBusinessError(error) && error.code === CLIENT_SCOPE_DENIED;
}
