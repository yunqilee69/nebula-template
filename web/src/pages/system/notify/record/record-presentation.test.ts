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

/** 渠道目标名称缺失，`receiver` 仍是脱敏后的 webhook 地址（历史数据可能是完整地址）。 */
const DINGTALK_RECORD_WITHOUT_TARGET_NAME = {
  id: 'record-dingtalk',
  channelType: 'DINGTALK_GROUP_WEBHOOK',
  templateCode: 'ORDER_FAILED',
  targetId: 'target-dingtalk',
  receiver: 'https://oapi.dingtalk.com/robot/send?access_token=***',
  sendStatus: 'FAILED',
} as const satisfies NotifyRecordResp;

const WECOM_RECORD_WITH_FULL_WEBHOOK = {
  id: 'record-wecom-legacy',
  channelType: 'WECOM_GROUP_WEBHOOK',
  templateCode: 'ORDER_FAILED',
  receiver: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=abcdef123456',
  sendStatus: 'FAILED',
} as const satisfies NotifyRecordResp;

const SITE_RECORD_WITHOUT_RECEIVER_NAME = {
  id: 'record-site-anonymous',
  channelType: 'SITE',
  templateCode: 'ORDER_PAID',
  receiver: 'user-42',
  receiverUserId: 'user-42',
  sendStatus: 'SUCCESS',
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

  it('never falls back to the webhook receiver for robot records without a target name', () => {
    const display = getRecordRecipientDisplay(DINGTALK_RECORD_WITHOUT_TARGET_NAME) ?? '-';

    expect(display).toBe('-');
    expect(display).not.toContain('http');
  });

  it('never falls back to a full webhook url stored in receiver', () => {
    const display = getRecordRecipientDisplay(WECOM_RECORD_WITH_FULL_WEBHOOK) ?? '-';

    expect(display).not.toContain('http');
    expect(display).not.toContain('abcdef123456');
  });

  it('falls back to the user id and then to the empty placeholder for user channels', () => {
    expect(getRecordRecipientDisplay(SITE_RECORD_WITHOUT_RECEIVER_NAME)).toBe('user-42');
    expect(getRecordRecipientDisplay({
      ...SITE_RECORD_WITHOUT_RECEIVER_NAME,
      receiverUserId: undefined,
    })).toBeUndefined();
  });
});
