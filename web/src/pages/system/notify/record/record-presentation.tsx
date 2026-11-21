import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { Tag, Typography } from 'antd';
import type { ReactElement } from 'react';
import type { ChannelType, NotifyRecordResp, NotifySendStatus } from '@/types/notify';

const GROUP_WEBHOOK_CHANNEL_TYPES: readonly ChannelType[] = [
  'WECOM_GROUP_WEBHOOK',
  'FEISHU_GROUP_WEBHOOK',
  'DINGTALK_GROUP_WEBHOOK',
];

type NotifyRecordDisplayFields = Pick<
  NotifyRecordResp,
  'channelType' | 'receiverUserName' | 'receiverUserId' | 'targetName'
>;

const SEND_STATUS_PRESENTATION = {
  SUCCESS: { label: '成功', color: 'success', icon: <CheckCircleOutlined /> },
  FAILED: { label: '失败', color: 'error', icon: <CloseCircleOutlined /> },
} as const satisfies Record<NotifySendStatus, {
  readonly label: string;
  readonly color: string;
  readonly icon: ReactElement;
}>;

export function formatOptionalText(value: string | undefined): string {
  return value?.trim() || '-';
}

export function formatRecordDateTime(value: string | undefined): string {
  return value ? value.replace('T', ' ') : '-';
}

function firstPresentText(values: readonly (string | undefined)[]): string | undefined {
  for (const value of values) {
    const normalized = value?.trim();
    if (normalized) return normalized;
  }
  return undefined;
}

function isGroupWebhookChannel(channelType: ChannelType): boolean {
  return GROUP_WEBHOOK_CHANNEL_TYPES.includes(channelType);
}

/**
 * 接收人展示文本。
 *
 * `receiver` 是落库用的接收标识：群机器人渠道写入的是渠道地址（历史上是带 access_token 的
 * webhook URL），用户型渠道也可能是内部标识，因此它一律不参与展示，缺失时由调用方显示 `-`。
 * 群机器人渠道只认渠道目标名称，用户型渠道只认用户名，缺失时降级到用户 ID。
 */
export function getRecordRecipientDisplay(record: NotifyRecordDisplayFields): string | undefined {
  if (isGroupWebhookChannel(record.channelType)) {
    return firstPresentText([record.targetName]);
  }
  return firstPresentText([record.receiverUserName, record.receiverUserId]);
}

export function getRecordTemplateVariantDisplay(
  record: Pick<NotifyRecordResp, 'templateVariantName'>,
): string | undefined {
  return firstPresentText([record.templateVariantName]);
}

export function getRecordChannelTargetDisplay(
  record: Pick<NotifyRecordResp, 'targetName'>,
): string | undefined {
  return firstPresentText([record.targetName]);
}

export function NotifySendStatusTag({ status }: { readonly status: NotifySendStatus }) {
  const presentation = SEND_STATUS_PRESENTATION[status];
  return (
    <Tag color={presentation.color} icon={presentation.icon}>
      {presentation.label}
    </Tag>
  );
}

export function CopyableRecordText({ value }: { readonly value: string | undefined }) {
  const text = formatOptionalText(value);
  return (
    <Typography.Text copyable={value ? { text: value } : false} ellipsis={value ? { tooltip: value } : false}>
      {text}
    </Typography.Text>
  );
}

export const SEND_STATUS_VALUE_ENUM = {
  SUCCESS: { text: SEND_STATUS_PRESENTATION.SUCCESS.label },
  FAILED: { text: SEND_STATUS_PRESENTATION.FAILED.label },
} as const;
