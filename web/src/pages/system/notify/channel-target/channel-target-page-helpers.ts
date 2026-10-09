import type { NebulaPageReq } from '@/components/nebula-pro-table';
import { NEBULA_TABLE_DEFAULT_PAGE_SIZE } from '@/components/nebula-pro-table/params';
import type { NotifyService } from '@/services/notify';
import type {
  ChannelType,
  CreateNotifyChannelTargetReq,
  NotifyChannelTargetPageReq,
  NotifyChannelTargetResp,
  UpdateNotifyChannelTargetReq,
} from '@/types/notify';

export const NOTIFY_CHANNEL_TYPE = 'NOTIFY_CHANNEL_TYPE';
export const DEFAULT_CHANNEL_TARGET_TYPE: ChannelType = 'WECOM_GROUP_WEBHOOK';

/**
 * 渠道目标只适用于"非用户维度"渠道：群机器人 Webhook 把消息投递到固定 URL。
 *
 * <p>站内信 / 邮件 / 推送都按用户扇出，投递目标不是渠道目标，服务端会以
 * CHANNEL_TARGET_CHANNEL_UNSUPPORTED 拒绝，因此这里也不给选。</p>
 */
export const CHANNEL_TARGET_CHANNEL_TYPES: readonly ChannelType[] = [
  'WECOM_GROUP_WEBHOOK',
  'FEISHU_GROUP_WEBHOOK',
  'DINGTALK_GROUP_WEBHOOK',
];

export type NotifyChannelTargetService = Pick<
  NotifyService,
  | 'pageNotifyChannelTargets'
  | 'getNotifyChannelTarget'
  | 'createNotifyChannelTarget'
  | 'updateNotifyChannelTarget'
  | 'deleteNotifyChannelTarget'
>;

export interface ChannelTargetTableQuery {
  readonly targetName?: string;
  readonly channelType?: ChannelType;
}

export interface ChannelTargetFormValues {
  readonly targetName: string;
  readonly channelType: ChannelType;
  readonly endpointUrl: string;
  readonly configJson?: string;
  readonly remark?: string;
}

export type ChannelTargetFormState =
  | Readonly<{ mode: 'create' }>
  | Readonly<{ mode: 'update'; targetId: string }>;

export function buildNotifyChannelTargetPageReq(
  params: ChannelTargetTableQuery & Partial<NebulaPageReq>,
): NotifyChannelTargetPageReq {
  const targetName = normalizeOptionalText(params.targetName);

  return {
    pageNum: params.pageNum ?? 1,
    pageSize: params.pageSize ?? NEBULA_TABLE_DEFAULT_PAGE_SIZE,
    ...(targetName ? { targetName } : {}),
    ...(params.channelType ? { channelType: params.channelType } : {}),
    ...(params.orderName ? { orderName: params.orderName } : {}),
    ...(params.orderType ? { orderType: params.orderType } : {}),
  };
}

export function toCreateNotifyChannelTargetReq(
  values: ChannelTargetFormValues,
): CreateNotifyChannelTargetReq {
  return normalizeChannelTargetReq(values);
}

export function toUpdateNotifyChannelTargetReq(
  values: ChannelTargetFormValues,
): UpdateNotifyChannelTargetReq {
  return normalizeChannelTargetReq(values);
}

export function toChannelTargetFormValues(
  detail: NotifyChannelTargetResp,
): Partial<ChannelTargetFormValues> {
  return {
    targetName: detail.targetName,
    channelType: detail.channelType,
    endpointUrl: detail.endpointUrl,
    ...(detail.configJson ? { configJson: detail.configJson } : {}),
    ...(detail.remark ? { remark: detail.remark } : {}),
  };
}

function normalizeChannelTargetReq(
  values: ChannelTargetFormValues,
): CreateNotifyChannelTargetReq {
  const configJson = normalizeOptionalText(values.configJson);
  const remark = normalizeOptionalText(values.remark);

  return {
    targetName: values.targetName.trim(),
    channelType: values.channelType,
    endpointUrl: values.endpointUrl.trim(),
    ...(configJson ? { configJson } : {}),
    ...(remark ? { remark } : {}),
  };
}

function normalizeOptionalText(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized || undefined;
}
