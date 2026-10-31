import { isNebulaBusinessError } from '@/request/business-error';

/** 未指定租户：裸域名且没有企业码。 */
export const TENANT_REQUIRED_CODE = '19001';
/** 租户不存在：企业码错误或子域名未绑定。 */
export const TENANT_NOT_FOUND_CODE = '19002';
/** 租户已暂停或过期。 */
export const TENANT_DISABLED_CODE = '19003';

const TENANT_RESOLUTION_ERROR_CODES = new Set([
  TENANT_REQUIRED_CODE,
  TENANT_NOT_FOUND_CODE,
]);

/** 是否属于“当前请求无法确定可用租户”，登录页应引导用户输入企业代码。 */
export function isTenantResolutionError(error: unknown): boolean {
  return isNebulaBusinessError(error) && TENANT_RESOLUTION_ERROR_CODES.has(error.code);
}
