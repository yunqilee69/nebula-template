import {
  NOTIFY_ENDPOINTS,
  type PushDeviceResp,
  type PushMessagePayload,
} from '../../../packages/client-sdk/index.ts';
import { redactToken, type Logger } from '../diagnostics/logger.ts';
import type { RequestConfig } from '../request/types.ts';

/**
 * 推送设备与深链路由。
 *
 * <p><b>可延后能力</b>（功能说明书 §2 第 15 项）：设备注册/心跳/注销在登录后调用；
 * 推送点击按 payload 的 `deeplink` 路由，未识别深链落到站内信收件箱，<b>不白屏</b>。</p>
 *
 * <p>安全：`pushToken` 属于个人数据，日志中一律脱敏，绝不打印完整值。</p>
 */
export interface RegisterPushDeviceInput {
  deviceId: string;
  platform: string;
  vendor: string;
  pushToken: string;
  notificationEnabled: boolean;
  appVersion?: string;
  appBuild?: number;
  osVersion?: string;
  deviceModel?: string;
}

export interface PushHeartbeatInput {
  deviceId: string;
  appVersion?: string;
  appBuild?: number;
}

export interface PushServiceDeps {
  request: <T>(config: RequestConfig) => Promise<T>;
  logger?: Logger;
}

export interface PushService {
  /** Upsert 注册/更新设备。拒绝通知权限也要注册（notificationEnabled=false）。 */
  register(input: RegisterPushDeviceInput): Promise<PushDeviceResp>;
  /** 注销设备；失败不阻塞登出（调用方负责吞掉异常）。 */
  unregister(deviceId: string): Promise<void>;
  heartbeat(input: PushHeartbeatInput): Promise<void>;
}

export function createPushService(deps: PushServiceDeps): PushService {
  const request = deps.request;
  return {
    async register(input) {
      deps.logger?.info('push device register', {
        deviceId: input.deviceId,
        platform: input.platform,
        vendor: input.vendor,
        notificationEnabled: input.notificationEnabled,
        // 即使 logger 已做脱敏，这里也显式传脱敏值，双保险。
        pushToken: redactToken(input.pushToken),
      });
      return request<PushDeviceResp>({
        method: 'POST',
        url: NOTIFY_ENDPOINTS.pushDevices,
        data: {
          deviceId: input.deviceId,
          platform: input.platform,
          vendor: input.vendor,
          pushToken: input.pushToken,
          notificationEnabled: input.notificationEnabled,
          appVersion: input.appVersion,
          appBuild: input.appBuild,
          osVersion: input.osVersion,
          deviceModel: input.deviceModel,
        },
      });
    },
    async unregister(deviceId) {
      await request<void>({ method: 'DELETE', url: NOTIFY_ENDPOINTS.pushDevice(deviceId) });
    },
    async heartbeat(input) {
      await request<void>({
        method: 'POST',
        url: NOTIFY_ENDPOINTS.pushDevicesHeartbeat,
        data: {
          deviceId: input.deviceId,
          appVersion: input.appVersion,
          appBuild: input.appBuild,
        },
      });
    },
  };
}

/** 解析后的深链。 */
export interface DeeplinkRoute {
  raw: string;
  scheme: string;
  path: string;
  params: Record<string, string>;
}

/** 站内信收件箱兜底深链。 */
export const NOTIFY_INBOX_DEEPLINK = 'nebula://notify/inbox';

/** 解析深链；无法解析返回 null。 */
export function parseDeeplink(deeplink: string | null | undefined): DeeplinkRoute | null {
  if (!deeplink) return null;
  const raw = deeplink.trim();
  if (!raw) return null;

  const separatorIndex = raw.indexOf('://');
  if (separatorIndex <= 0) return null;
  const scheme = raw.slice(0, separatorIndex);
  const rest = raw.slice(separatorIndex + 3);
  const queryIndex = rest.indexOf('?');
  const path = queryIndex >= 0 ? rest.slice(0, queryIndex) : rest;
  const query = queryIndex >= 0 ? rest.slice(queryIndex + 1) : '';

  const params: Record<string, string> = {};
  for (const pair of query.split('&')) {
    if (!pair) continue;
    const eq = pair.indexOf('=');
    const key = eq >= 0 ? pair.slice(0, eq) : pair;
    const value = eq >= 0 ? pair.slice(eq + 1) : '';
    if (!key) continue;
    try {
      params[decodeURIComponent(key)] = decodeURIComponent(value);
    } catch {
      params[key] = value;
    }
  }

  return { raw, scheme, path, params };
}

/**
 * 解析推送点击的落地路由。
 * 未识别深链 → 站内信收件箱，保证不白屏。
 */
export function resolvePushRoute(
  payload: PushMessagePayload | null | undefined,
  isKnown: (route: DeeplinkRoute) => boolean = () => false,
): DeeplinkRoute {
  const route = parseDeeplink(payload?.deeplink);
  if (route && isKnown(route)) return route;
  const fallback = parseDeeplink(NOTIFY_INBOX_DEEPLINK);
  // NOTIFY_INBOX_DEEPLINK 是内置合法深链，parse 必然成功；此处兜底仅为类型完备。
  return fallback ?? { raw: NOTIFY_INBOX_DEEPLINK, scheme: 'nebula', path: 'notify/inbox', params: {} };
}
