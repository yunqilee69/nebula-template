import type { NebulaPageReq } from '@/components/nebula-pro-table';
import { NEBULA_TABLE_DEFAULT_PAGE_SIZE } from '@/components/nebula-pro-table/params';
import type { NotifyService } from '@/services/notify';
import type {
  CreateNotifyCategoryReq,
  NotifyCategoryPageReq,
  NotifyCategoryResp,
  UpdateNotifyCategoryReq,
} from '@/types/notify';

/** 类别可用的用户维度渠道；群机器人不参与用户偏好判定，因此不在名单内。 */
export const NOTIFY_USER_CHANNEL_OPTIONS: readonly { readonly label: string; readonly value: string }[] = [
  { label: '站内信', value: 'SITE' },
  { label: '邮件', value: 'EMAIL' },
  { label: 'App通知', value: 'PUSH' },
];

/** 未填排序号时的默认值，与后端 `NotifyServiceImpl.DEFAULT_CATEGORY_SORT` 保持一致。 */
export const DEFAULT_CATEGORY_SORT = 100;

export type NotifyCategoryService = Pick<
  NotifyService,
  | 'pageNotifyCategories'
  | 'getNotifyCategory'
  | 'createNotifyCategory'
  | 'updateNotifyCategory'
  | 'deleteNotifyCategory'
>;

export interface CategoryTableQuery {
  readonly code?: string;
  readonly name?: string;
  readonly enabled?: boolean;
}

export interface CategoryFormValues {
  readonly code: string;
  readonly name: string;
  readonly description?: string;
  readonly mandatory?: boolean;
  readonly defaultEnabled?: boolean;
  readonly sort?: number;
  readonly allowedChannels: readonly string[];
  readonly enabled?: boolean;
  readonly remark?: string;
}

export type CategoryFormState =
  | Readonly<{ mode: 'create' }>
  | Readonly<{ mode: 'update'; categoryId: string; builtin: boolean }>;

export function buildNotifyCategoryPageReq(
  params: CategoryTableQuery & Partial<NebulaPageReq>,
): NotifyCategoryPageReq {
  const code = normalizeOptionalText(params.code);
  const name = normalizeOptionalText(params.name);

  return {
    pageNum: params.pageNum ?? 1,
    pageSize: params.pageSize ?? NEBULA_TABLE_DEFAULT_PAGE_SIZE,
    ...(code ? { code } : {}),
    ...(name ? { name } : {}),
    ...(params.enabled === undefined ? {} : { enabled: params.enabled }),
    ...(params.orderName ? { orderName: params.orderName } : {}),
    ...(params.orderType ? { orderType: params.orderType } : {}),
  };
}

export function toCreateNotifyCategoryReq(values: CategoryFormValues): CreateNotifyCategoryReq {
  return {
    code: values.code.trim(),
    ...commonCategoryReq(values),
  };
}

export function toUpdateNotifyCategoryReq(values: CategoryFormValues): UpdateNotifyCategoryReq {
  return commonCategoryReq(values);
}

export function toNotifyCategoryFormValues(
  detail: NotifyCategoryResp,
): Partial<CategoryFormValues> {
  return {
    code: detail.code,
    name: detail.name,
    mandatory: detail.mandatory === true,
    defaultEnabled: detail.defaultEnabled !== false,
    sort: detail.sort ?? DEFAULT_CATEGORY_SORT,
    allowedChannels: detail.allowedChannels ?? [],
    enabled: detail.enabled !== false,
    ...(detail.description ? { description: detail.description } : {}),
    ...(detail.remark ? { remark: detail.remark } : {}),
  };
}

function commonCategoryReq(
  values: CategoryFormValues,
): Omit<CreateNotifyCategoryReq, 'code'> {
  const description = normalizeOptionalText(values.description);
  const remark = normalizeOptionalText(values.remark);

  return {
    name: values.name.trim(),
    mandatory: values.mandatory === true,
    defaultEnabled: values.defaultEnabled !== false,
    sort: values.sort ?? DEFAULT_CATEGORY_SORT,
    allowedChannels: [...values.allowedChannels],
    enabled: values.enabled !== false,
    ...(description ? { description } : {}),
    ...(remark ? { remark } : {}),
  };
}

function normalizeOptionalText(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized || undefined;
}
