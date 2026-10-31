/** 业务错误：保留后端错误码，供调用方按错误码做分支处理。 */
export class NebulaBusinessError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'NebulaBusinessError';
    this.code = code;
  }
}

export function isNebulaBusinessError(error: unknown): error is NebulaBusinessError {
  return error instanceof NebulaBusinessError;
}
