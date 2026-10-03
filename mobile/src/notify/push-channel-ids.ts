import {
  NOTIFY_CATEGORIES,
  type NotifyCategory,
} from '../../../packages/client-sdk/index.ts';

/**
 * 内置通知类别 ↔ 操作系统通知渠道的稳定 ID 对齐。
 *
 * <p>Android 8.0+ 与 HarmonyOS 的通知渠道一旦创建，用户即拥有完全控制权、开发者无法再改其行为。
 * 因此渠道 ID 必须<b>稳定且与偏好层内置类别一一对应</b>：改 ID 等于让用户之前的系统级设置全部失效。
 * 这也是内置类别总数控制在 7 个以内的原因。</p>
 *
 * <p>类别已改为服务端可管理数据，但<b>自定义类别不新建 OS 渠道</b>：
 * 服务端下发的自定义 code 不在 {@link NOTIFICATION_CHANNEL_IDS} 内，推送时统一回退 DEFAULT 渠道。
 * 要为自定义类别开独立系统渠道需要客户端发版，本轮不做。</p>
 */

/** 每个类别对应的稳定通知渠道 ID（不可变更的客户端契约）。 */
export const NOTIFICATION_CHANNEL_IDS: Record<NotifyCategory, string> = {
  SECURITY: 'nebula_security',
  TODO: 'nebula_todo',
  BUSINESS: 'nebula_business',
  ANNOUNCEMENT: 'nebula_announcement',
  DEFAULT: 'nebula_default',
};

/** 通知渠道数量上限。 */
export const MAX_NOTIFICATION_CHANNELS = 7;

export interface NotificationChannelDef {
  id: string;
  category: NotifyCategory;
  name: string;
}

const CHANNEL_NAMES: Record<NotifyCategory, string> = {
  SECURITY: '安全与账号',
  TODO: '待办与审批',
  BUSINESS: '业务提醒',
  ANNOUNCEMENT: '公告与运营',
  DEFAULT: '其他通知',
};

/** 待注册的渠道清单（按类别固定顺序）。数量必须 ≤ 上限。 */
export function listNotificationChannels(): NotificationChannelDef[] {
  return NOTIFY_CATEGORIES.map((category) => ({
    id: NOTIFICATION_CHANNEL_IDS[category],
    category,
    name: CHANNEL_NAMES[category],
  }));
}

/** 取类别对应的渠道 ID；未知类别归一化到 DEFAULT 渠道。 */
export function channelIdForCategory(code: string | null | undefined): string {
  if (code && (NOTIFY_CATEGORIES as readonly string[]).includes(code)) {
    return NOTIFICATION_CHANNEL_IDS[code as NotifyCategory];
  }
  return NOTIFICATION_CHANNEL_IDS.DEFAULT;
}

/** 推送 payload 携带的类别 → 通知渠道 ID。 */
export function channelIdForPushPayload(category?: string | null): string {
  return channelIdForCategory(category);
}
