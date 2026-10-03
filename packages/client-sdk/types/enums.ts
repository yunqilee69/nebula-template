/**
 * 通知类别 / 渠道 / 推送平台 / 推送厂商枚举。
 *
 * <p>这里的取值都是客户端契约，客户端<b>不得发明新值</b>：
 * <ul>
 *   <li>{@link NOTIFY_CATEGORIES} 是<b>内置类别</b>（与操作系统通知渠道一一对应，OS 渠道一旦创建不可改）；
 *       类别本身已改为服务端可管理数据，自定义类别由服务端下发，客户端不为它新建 OS 渠道，推送时回退 DEFAULT；</li>
 *   <li>推送平台/厂商标识与后端 `NotifyPushPlatforms` / `NotifyPushVendors` 保持一致。</li>
 * </ul>
 * 后端来源：`NotifyCategoryTypes`、`NotifyChannelTypes`、`NotifyPushPlatforms`、`NotifyPushVendors`。</p>
 */

/** 内置通知类别（≤7 个，与 OS 通知渠道一一对应；自定义类别由服务端下发并回退 DEFAULT）。 */
export const NOTIFY_CATEGORIES = ['SECURITY', 'TODO', 'BUSINESS', 'ANNOUNCEMENT', 'DEFAULT'] as const;
export type NotifyCategory = (typeof NOTIFY_CATEGORIES)[number];

/** 通知渠道。`SITE` 只表示会产生站内信，不表示可关闭；`PUSH` 为用户维度通道。 */
export const NOTIFY_CHANNELS = ['SITE', 'EMAIL', 'PUSH'] as const;
export type NotifyChannel = (typeof NOTIFY_CHANNELS)[number];

/** 推送设备平台。 */
export const PUSH_PLATFORMS = ['IOS', 'ANDROID', 'OHOS'] as const;
export type PushPlatform = (typeof PUSH_PLATFORMS)[number];

/** 推送厂商通道标识。 */
export const PUSH_VENDORS = ['APNS', 'HMS', 'XIAOMI', 'OPPO', 'VIVO', 'HONOR', 'AGGREGATOR'] as const;
export type PushVendor = (typeof PUSH_VENDORS)[number];

/** 是否内置通知类别（自定义类别不在此列）。 */
export function isNotifyCategory(value: string): value is NotifyCategory {
  return (NOTIFY_CATEGORIES as readonly string[]).includes(value);
}

/** 是否合法推送平台。 */
export function isPushPlatform(value: string): value is PushPlatform {
  return (PUSH_PLATFORMS as readonly string[]).includes(value);
}

/** 是否合法推送厂商。 */
export function isPushVendor(value: string): value is PushVendor {
  return (PUSH_VENDORS as readonly string[]).includes(value);
}
