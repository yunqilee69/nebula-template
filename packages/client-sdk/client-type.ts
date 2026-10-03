/**
 * 端类型常量。
 *
 * <p>取值与后端 `ClientType` 枚举名一一对应；`mobile/` 基座统一注入 `APP`。
 * 该文件是「端类型」这条跨端契约的唯一来源，`web/`（WEB/H5）与移动端共用同一套取值。</p>
 */
export type ClientType = 'WEB' | 'H5' | 'MP_WEIXIN' | 'MP_ALIPAY' | 'APP' | 'API' | 'UNKNOWN';

/** 移动端 App 端类型。基座所有请求都必须显式带 `X-Client-Type: APP`。 */
export const CLIENT_TYPE_APP: ClientType = 'APP';

/** 端类型请求头名称。 */
export const CLIENT_TYPE_HEADER = 'X-Client-Type';

/** 全部合法端类型，供校验使用。 */
export const CLIENT_TYPES: readonly ClientType[] = [
  'WEB',
  'H5',
  'MP_WEIXIN',
  'MP_ALIPAY',
  'APP',
  'API',
  'UNKNOWN',
];
