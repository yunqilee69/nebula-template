import type { ClientType } from '../../../packages/client-sdk/index.ts';
import { CLIENT_TYPE_APP } from '../../../packages/client-sdk/index.ts';

/**
 * 运行时配置：把「本机联调地址、端平台、版本构建号」收敛成可测试的纯函数。
 *
 * <p>禁止把凭据写死入库；baseURL 只是联调地址，构建时可用 `APP_CONFIG_OVERRIDE` 覆盖。
 * 平台取值必须落在服务端认识的集合内（`ANDROID` / `IOS` / `OHOS`），
 * 否则 `init` 不会下发版本字段。</p>
 */

/** 服务端认识的平台标识（与 `POST /api/frontend/app-release/check` 一致）。 */
export type AppBackendPlatform = 'IOS' | 'ANDROID' | 'OHOS';

/** RN `Platform.OS` 可能出现的取值（含 RNOH 的鸿蒙取值）。 */
export type RuntimeOS = 'ios' | 'android' | 'harmony' | 'ohos' | 'web' | 'macos' | 'windows' | string;

/** 本地后端默认端口（backend/ 模板默认 8080，本机 8080 被占用时用 18080 联调）。 */
export const DEFAULT_DEV_BACKEND_PORT = 18080;

/** Android 模拟器访问宿主机 localhost 的固定别名。 */
export const ANDROID_EMULATOR_HOST = '10.0.2.2';

/**
 * RN 运行时 OS → 服务端平台标识。
 * 未知平台归一到 `ANDROID` 之外的中立值：这里选择 `IOS` 之外的显式失败更危险，
 * 因此未知值回落到 `ANDROID`（移动端默认形态），并由调用方自行覆盖。
 */
export function resolveBackendPlatform(os: RuntimeOS): AppBackendPlatform {
  switch (os) {
    case 'ios':
      return 'IOS';
    case 'harmony':
    case 'ohos':
      return 'OHOS';
    default:
      return 'ANDROID';
  }
}

/**
 * 联调主机名：Android 模拟器必须走 `10.0.2.2`，其余端（iOS 模拟器 / 鸿蒙模拟器）走 `localhost`。
 * 真机联调需由构建时注入局域网 IP，不能依赖此默认值。
 */
export function resolveDevHost(os: RuntimeOS): string {
  return os === 'android' ? ANDROID_EMULATOR_HOST : 'localhost';
}

/** 默认联调 baseURL（带协议与端口）。 */
export function resolveDefaultBaseURL(os: RuntimeOS, port: number = DEFAULT_DEV_BACKEND_PORT): string {
  return `http://${resolveDevHost(os)}:${port}`;
}

/** 应用运行时配置。 */
export interface AppRuntimeConfig {
  baseURL: string;
  platform: AppBackendPlatform;
  /** 分发渠道，可选；未配置时 `init` 不带 channel 参数。 */
  channel?: string;
  appVersion: string;
  /** 整数构建号，升级判定只比较该值。 */
  appBuild: number;
  clientType: ClientType;
}

export interface CreateAppRuntimeConfigInput {
  os: RuntimeOS;
  baseURL?: string;
  port?: number;
  channel?: string;
  appVersion?: string;
  appBuild?: number;
  clientType?: ClientType;
}

export const DEFAULT_APP_VERSION = '0.0.0';
export const DEFAULT_APP_BUILD = 1;

/** 组装运行时配置；未显式给出的字段按平台推导。 */
export function createAppRuntimeConfig(input: CreateAppRuntimeConfigInput): AppRuntimeConfig {
  const config: AppRuntimeConfig = {
    baseURL: input.baseURL ?? resolveDefaultBaseURL(input.os, input.port),
    platform: resolveBackendPlatform(input.os),
    appVersion: input.appVersion ?? DEFAULT_APP_VERSION,
    appBuild: input.appBuild ?? DEFAULT_APP_BUILD,
    clientType: input.clientType ?? CLIENT_TYPE_APP,
  };
  if (input.channel !== undefined) config.channel = input.channel;
  return config;
}
