/**
 * 移动推送设备契约，对应后端 `nebula-notify` 推送设备接口（`移动推送与设备注册` 功能说明书 §4.4）。
 *
 * <p>`pushToken` 属于可定位到设备的个人数据：<b>禁止在日志中打印完整 token</b>。</p>
 */
import type { PushPlatform, PushVendor } from './enums.ts';

/** 注册/更新推送设备请求。Upsert 语义，同 deviceId 重复注册视为更新。 */
export interface RegisterPushDeviceReq {
  /** 客户端生成的稳定设备标识。卸载重装视为新设备。 */
  deviceId: string;
  platform: PushPlatform;
  vendor: PushVendor;
  pushToken: string;
  /** 用户是否授予通知权限。拒绝授权也要注册，置 false。 */
  notificationEnabled: boolean;
  appVersion?: string;
  appBuild?: number;
  osVersion?: string;
  deviceModel?: string;
}

/** 设备心跳请求，更新 lastActiveTime / appVersion。 */
export interface PushDeviceHeartbeatReq {
  deviceId: string;
  appVersion?: string;
  appBuild?: number;
}

/** 推送设备响应。 */
export interface PushDeviceResp {
  id: string;
  platform?: PushPlatform | string;
  vendor?: PushVendor | string;
  notificationEnabled?: boolean;
  lastActiveTime?: string;
}

/** 推送消息载荷（模板 PUSH 变体渲染结果），用于深链路由。 */
export interface PushMessagePayload {
  title?: string;
  body?: string;
  /** 业务深链，如 `wms://delivery/assigned?orderNo=...`。 */
  deeplink?: string;
  collapseKey?: string;
}
