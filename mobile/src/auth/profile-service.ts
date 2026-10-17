import {
  AUTH_ENDPOINTS,
  type LoginRecordPageReq,
  type LoginRecordResp,
  type OAuth2BindingListResp,
  type PageResp,
  type ProfileResp,
} from '../../../packages/client-sdk/index.ts';
import type { RequestConfig } from '../request/types.ts';

/**
 * 个人资料 / 第三方账号绑定 / 登录记录服务。
 *
 * <p>三个接口都需要登录态，token 由 `createRequestClient` 统一注入。
 * 绑定与解绑依赖浏览器 OAuth 回调，移动端当前只展示绑定状态；
 * 需要管理绑定时使用 Web 端个人中心。</p>
 */

export interface ProfileServiceDeps {
  request: <T>(config: RequestConfig) => Promise<T>;
}

export interface ProfileService {
  /** 当前用户资料。 */
  getProfile(): Promise<ProfileResp>;
  /** 所有可用第三方 Provider 及其绑定状态。 */
  listOAuth2Bindings(): Promise<OAuth2BindingListResp>;
  /** 当前用户登录记录分页。 */
  pageLoginRecords(pageNum: number, pageSize: number): Promise<PageResp<LoginRecordResp>>;
}

export const LOGIN_TYPE_LABELS: Record<string, string> = {
  PASSWORD: '账号密码',
  PHONE: '手机号',
  EMAIL: '邮箱',
  OAUTH2: '第三方',
};

export const LOGIN_RESULT_LABELS: Record<string, string> = {
  SUCCESS: '成功',
  FAILED: '失败',
};

export const CLIENT_TYPE_LABELS: Record<string, string> = {
  WEB: '浏览器',
  H5: 'H5',
  MP_WEIXIN: '微信小程序',
  MP_ALIPAY: '支付宝小程序',
  APP: 'App',
  API: '接口',
  UNKNOWN: '未知',
};

export function formatLoginType(value?: string): string {
  if (!value) return '-';
  return LOGIN_TYPE_LABELS[value] ?? value;
}

export function formatLoginResult(value?: string): string {
  if (!value) return '-';
  return LOGIN_RESULT_LABELS[value] ?? value;
}

export function formatClientType(value?: string): string {
  if (!value) return '-';
  return CLIENT_TYPE_LABELS[value] ?? value;
}

export function formatAccountStatus(status?: number): string {
  if (status === 1) return '正常';
  if (status === 0) return '已禁用';
  return '-';
}

export function formatBindingStatus(bound?: boolean): string {
  return bound ? '已绑定' : '未绑定';
}

/** 后端 `LocalDateTime` 序列化为 `2026-01-01T10:00:00`，展示时换成空格。 */
export function formatDateTime(value?: string): string {
  if (!value) return '-';
  return value.replace('T', ' ');
}

export function createProfileService(deps: ProfileServiceDeps): ProfileService {
  return {
    getProfile() {
      return deps.request<ProfileResp>({
        method: 'GET',
        url: AUTH_ENDPOINTS.profile,
      });
    },

    listOAuth2Bindings() {
      return deps.request<OAuth2BindingListResp>({
        method: 'GET',
        url: AUTH_ENDPOINTS.oauth2Bindings,
      });
    },

    pageLoginRecords(pageNum, pageSize) {
      const body: LoginRecordPageReq = { pageNum, pageSize };
      return deps.request<PageResp<LoginRecordResp>>({
        method: 'POST',
        url: AUTH_ENDPOINTS.loginRecordsPage,
        data: body,
      });
    },
  };
}
