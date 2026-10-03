import type { NotifyPreferenceResp, UpdateNotifyPreferenceReq } from '@/types/notify';

/** 拍平后的（类别 × 渠道）开关，供设置界面渲染。 */
export interface NotifyChannelToggle {
  readonly categoryCode: string;
  readonly categoryName: string;
  readonly mandatory: boolean;
  readonly channel: string;
  readonly enabled: boolean;
  /** 强制类别与站内信为 false，界面据此置灰，不要自行判断 mandatory。 */
  readonly editable: boolean;
}

/** 把偏好响应拍平成（类别 × 渠道）开关列表，保持服务端下发的顺序。 */
export function listChannelToggles(
  preference: NotifyPreferenceResp | null | undefined,
): NotifyChannelToggle[] {
  const categories = preference?.categories ?? [];
  const toggles: NotifyChannelToggle[] = [];
  for (const category of categories) {
    for (const channel of category.channels ?? []) {
      toggles.push({
        categoryCode: category.code,
        categoryName: category.name ?? category.code,
        mandatory: category.mandatory === true,
        channel: channel.channel,
        enabled: channel.enabled === true,
        editable: channel.editable === true,
      });
    }
  }
  return toggles;
}

function findToggle(
  toggles: readonly NotifyChannelToggle[],
  categoryCode: string,
  channel: string,
): NotifyChannelToggle | undefined {
  return toggles.find((toggle) => toggle.categoryCode === categoryCode && toggle.channel === channel);
}

/**
 * 切换一个渠道开关，返回新数组（不可变更新）。
 * 不可编辑项不做任何改动，原样返回。
 */
export function toggleChannel(
  toggles: readonly NotifyChannelToggle[],
  categoryCode: string,
  channel: string,
  enabled: boolean,
): NotifyChannelToggle[] {
  if (findToggle(toggles, categoryCode, channel)?.editable !== true) return [...toggles];
  return toggles.map((toggle) =>
    toggle.categoryCode === categoryCode && toggle.channel === channel ? { ...toggle, enabled } : toggle,
  );
}

/** 组装更新请求：只提交可编辑项（强制类别与站内信不落库）。 */
export function buildUpdatePayload(
  toggles: readonly NotifyChannelToggle[],
): UpdateNotifyPreferenceReq {
  return {
    items: toggles
      .filter((toggle) => toggle.editable)
      .map((toggle) => ({
        categoryCode: toggle.categoryCode,
        channel: toggle.channel,
        enabled: toggle.enabled,
      })),
  };
}
