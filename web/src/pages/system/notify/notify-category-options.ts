import type { NotifyCategoryResp } from '@/types/notify';

/** 下拉选项形态，与 antd `Select` 的 options 对齐。 */
export interface NotifyCategoryOption {
  readonly label: string;
  readonly value: string;
}

/** 未分类的兜底类别：模板 category_code 为空时后端按 DEFAULT 判定。 */
export const NOTIFY_CATEGORY_FALLBACK = 'DEFAULT';

/** DEFAULT 类别缺失时的兜底文案，正常应命中后端下发的中文名。 */
const NOTIFY_CATEGORY_FALLBACK_LABEL = '其他通知';

/**
 * 把后端下发的类别列表转成下拉选项。
 *
 * <p>类别已改为可管理数据（`sys_notify_category`），前端不再维护固定枚举；
 * 只有启用中的类别会由 `listNotifyCategories` 下发，这里保持服务端顺序。</p>
 */
export function toNotifyCategoryOptions(
  categories: readonly NotifyCategoryResp[],
): NotifyCategoryOption[] {
  return categories.map((category) => ({
    label: category.name?.trim() || category.code,
    value: category.code,
  }));
}

/**
 * 类别展示名；空值按 DEFAULT 呈现，未知 code 原样返回而不是吞掉。
 *
 * <p>停用类别不会出现在选项里，但存量模板仍可能挂着它，此时按原样展示 code，
 * 避免把「已停用」误显示成「其他通知」。</p>
 */
export function resolveNotifyCategoryLabel(
  categoryCode: string | undefined,
  options: readonly NotifyCategoryOption[],
): string {
  if (!categoryCode) {
    return options.find((option) => option.value === NOTIFY_CATEGORY_FALLBACK)?.label
      ?? NOTIFY_CATEGORY_FALLBACK_LABEL;
  }
  return options.find((option) => option.value === categoryCode)?.label ?? categoryCode;
}
