import type {
  NotifyCategoryPreferenceResp,
  NotifyChannelPreferenceResp,
  NotifyPreferenceItemReq,
  NotifyPreferenceResp,
  UpdateNotifyPreferenceReq,
} from '../../../packages/client-sdk/index.ts';

/**
 * 消息设置页偏好模型。
 *
 * <p>客户端<b>必须</b>依据服务端的 `editable` 置灰，不要自行判断 `mandatory`
 * （强制类别的整组不可编辑由服务端下发 `editable=false` 表达）。</p>
 */

export interface ChannelToggle {
  categoryCode: string;
  categoryName: string;
  mandatory: boolean;
  channel: string;
  enabled: boolean;
  editable: boolean;
}

/** 拍平为（类别 × 渠道）开关列表。 */
export function listChannelToggles(preference: NotifyPreferenceResp | null | undefined): ChannelToggle[] {
  const categories = preference?.categories ?? [];
  const toggles: ChannelToggle[] = [];
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

function findChannel(
  preference: NotifyPreferenceResp,
  categoryCode: string,
  channel: string,
): NotifyChannelPreferenceResp | undefined {
  const category = (preference.categories ?? []).find((item) => item.code === categoryCode);
  return category?.channels?.find((item) => item.channel === channel);
}

/** 某个（类别 × 渠道）是否允许客户端修改。 */
export function isToggleEditable(
  preference: NotifyPreferenceResp,
  categoryCode: string,
  channel: string,
): boolean {
  return findChannel(preference, categoryCode, channel)?.editable === true;
}

/**
 * 切换一个渠道开关。返回新对象（不可变更新）。
 * 不可编辑的项直接返回原偏好，不产生任何变更。
 */
export function toggleChannel(
  preference: NotifyPreferenceResp,
  categoryCode: string,
  channel: string,
  enabled: boolean,
): NotifyPreferenceResp {
  if (!isToggleEditable(preference, categoryCode, channel)) return preference;

  const categories: NotifyCategoryPreferenceResp[] = (preference.categories ?? []).map((category) => {
    if (category.code !== categoryCode) return category;
    const channels = (category.channels ?? []).map((item) =>
      item.channel === channel ? { ...item, enabled } : item,
    );
    return { ...category, channels };
  });

  return { ...preference, categories };
}

/** 把当前偏好转成更新请求载荷（只含可编辑项）。 */
export function buildUpdatePayload(preference: NotifyPreferenceResp): UpdateNotifyPreferenceReq {
  const items: NotifyPreferenceItemReq[] = listChannelToggles(preference)
    .filter((toggle) => toggle.editable)
    .map((toggle) => ({
      categoryCode: toggle.categoryCode,
      channel: toggle.channel,
      enabled: toggle.enabled,
    }));

  return { items };
}
