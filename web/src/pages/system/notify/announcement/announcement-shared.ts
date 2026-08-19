import type {
  AnnouncementDetailResp,
  AnnouncementPageReq,
  AnnouncementStatus,
  AnnouncementTargetType,
  CreateAnnouncementReq,
} from '@/types/notify';
import type { NebulaPageReq } from '@/components/nebula-pro-table';

export const ANNOUNCEMENT_STATUS_OPTIONS = [
  { label: '草稿', value: 0 },
  { label: '已发布', value: 1 },
  { label: '已撤回', value: 2 },
];

export const ANNOUNCEMENT_STATUS_TEXT: Record<AnnouncementStatus, string> = {
  0: '草稿',
  1: '已发布',
  2: '已撤回',
};

export const ANNOUNCEMENT_TARGET_OPTIONS = [
  { label: '全部用户', value: 'ALL' },
  { label: '指定用户', value: 'USER' },
  { label: '指定角色', value: 'ROLE' },
  { label: '指定组织', value: 'ORG' },
];

export const ANNOUNCEMENT_TARGET_TEXT: Record<AnnouncementTargetType, string> = {
  ALL: '全部用户',
  USER: '指定用户',
  ROLE: '指定角色',
  ORG: '指定组织',
};

export interface AnnouncementFormValues {
  readonly title: string;
  readonly content: string;
  readonly targetType: AnnouncementTargetType;
  readonly targetValues?: readonly string[];
  readonly publishTime?: string;
  readonly expireTime?: string;
  readonly pinned: boolean;
  readonly popup: boolean;
  readonly sort: number;
}

export interface AnnouncementPageQuery {
  readonly title?: string;
  readonly status?: string | number;
  readonly targetType?: AnnouncementTargetType;
  readonly pinned?: string | boolean;
  readonly popup?: string | boolean;
}

export const DEFAULT_ANNOUNCEMENT_VALUES: AnnouncementFormValues = {
  title: '',
  content: '',
  targetType: 'ALL',
  targetValues: [],
  pinned: false,
  popup: false,
  sort: 0,
};

function normalizeDateTime(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const normalized = value.replace('T', ' ');
  return normalized.length === 16 ? `${normalized}:00` : normalized;
}

function toDateTimeInput(value: string | undefined): string | undefined {
  return value ? value.replace(' ', 'T') : undefined;
}

function parseStatus(value: AnnouncementPageQuery['status']): AnnouncementStatus | undefined {
  const status = typeof value === 'number' ? value : Number(value);
  return status === 0 || status === 1 || status === 2 ? status : undefined;
}

function parseBoolean(value: string | boolean | undefined): boolean | undefined {
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  return undefined;
}

export function toAnnouncementRequest(
  values: AnnouncementFormValues,
  status: AnnouncementStatus,
): CreateAnnouncementReq {
  return {
    title: values.title.trim(),
    content: values.content.trim(),
    status,
    targetType: values.targetType,
    pinnedFlag: values.pinned,
    popupFlag: values.popup,
    sortNum: values.sort,
    ...(values.targetType === 'ALL' ? {} : { targetValues: values.targetValues }),
    ...(values.publishTime ? { publishTime: normalizeDateTime(values.publishTime) } : {}),
    ...(values.expireTime ? { expireTime: normalizeDateTime(values.expireTime) } : {}),
  };
}

export function toAnnouncementFormValues(detail: AnnouncementDetailResp): AnnouncementFormValues {
  return {
    title: detail.title,
    content: detail.content,
    targetType: detail.targetType,
    targetValues: detail.targetValues ?? [],
    publishTime: toDateTimeInput(detail.publishTime),
    expireTime: toDateTimeInput(detail.expireTime),
    pinned: detail.pinnedFlag,
    popup: detail.popupFlag,
    sort: detail.sortNum,
  };
}

export function toAnnouncementPageRequest(params: AnnouncementPageQuery & NebulaPageReq): AnnouncementPageReq {
  const status = parseStatus(params.status);
  const pinnedFlag = parseBoolean(params.pinned);
  const popupFlag = parseBoolean(params.popup);
  return {
    pageNum: params.pageNum,
    pageSize: params.pageSize,
    ...(params.orderName ? { orderName: params.orderName } : {}),
    ...(params.orderType ? { orderType: params.orderType } : {}),
    ...(params.title ? { title: params.title.trim() } : {}),
    ...(status === undefined ? {} : { status }),
    ...(params.targetType ? { targetType: params.targetType } : {}),
    ...(pinnedFlag === undefined ? {} : { pinnedFlag }),
    ...(popupFlag === undefined ? {} : { popupFlag }),
  };
}
