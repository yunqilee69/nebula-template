import { CLIENT_TYPE_APP, CLIENT_TYPE_HEADER, type ClientType } from '../../../packages/client-sdk/index.ts';

/** 端标识与请求头构造：基座统一注入 `X-Client-Type: APP`。 */

export interface ClientHeaderOptions {
  clientType?: ClientType;
  /** 如 zh-CN；服务端按此返回国际化消息。 */
  locale?: string;
}

export function buildClientHeaders(options: ClientHeaderOptions = {}): Record<string, string> {
  const headers: Record<string, string> = {
    [CLIENT_TYPE_HEADER]: options.clientType ?? CLIENT_TYPE_APP,
  };
  if (options.locale) headers['Accept-Language'] = options.locale;
  return headers;
}

/** 构造诊断用 UA（排障用，不用于服务端端类型判定——那由 `X-Client-Type` 决定）。 */
export function buildUserAgent(info: {
  appName: string;
  version: string;
  build: number | string;
  os: string;
  osVersion?: string;
}): string {
  const os = info.osVersion ? `${info.os}/${info.osVersion}` : info.os;
  return `${info.appName}/${info.version}(${info.build}) ${os}`;
}
