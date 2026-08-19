import { describe, expect, it } from 'vitest';
import type { NotifyRecordResp } from '@/types/notify';
import {
  getRecordChannelTargetDisplay,
  getRecordRecipientDisplay,
  getRecordTemplateVariantDisplay,
} from './record-presentation';

const EMAIL_RECORD = {
  id: 'record-email',
  channelType: 'EMAIL',
  templateCode: 'ORDER_PAID',
  templateVariantId: 'variant-email',
  templateVariantName: '支付成功邮件模板',
  targetId: 'target-email',
  targetName: '默认邮件通道',
  receiver: 'buyer@example.com',
  receiverUserId: 'user-buyer',
  receiverUserName: '采购员王小明',
  sendStatus: 'SUCCESS',
} as const satisfies NotifyRecordResp;

const WECOM_RECORD = {
  id: 'record-wecom',
  channelType: 'WECOM_GROUP_WEBHOOK',
  templateCode: 'ORDER_FAILED',
  templateVariantId: 'variant-wecom',
  templateVariantName: '企业微信失败告警',
  targetId: 'target-ops',
  targetName: '运维告警群',
  receiver: 'target-ops',
  sendStatus: 'FAILED',
} as const satisfies NotifyRecordResp;

describe('notification record presentation', () => {
  it('uses the receiving user name for email and site-like records', () => {
    expect(getRecordRecipientDisplay(EMAIL_RECORD)).toBe('采购员王小明');
  });

  it('uses the channel target group name for robot webhook records', () => {
    expect(getRecordRecipientDisplay(WECOM_RECORD)).toBe('运维告警群');
  });

  it('uses display names for template variants and channel targets without exposing raw IDs', () => {
    expect(getRecordTemplateVariantDisplay(EMAIL_RECORD)).toBe('支付成功邮件模板');
    expect(getRecordChannelTargetDisplay(WECOM_RECORD)).toBe('运维告警群');
  });
});
