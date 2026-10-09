import { describe, expect, it } from 'vitest';
import {
  SYSTEM_TEMPLATE_VARIABLES,
  buildNotifyTemplatePageReq,
  createDefaultVariants,
  extractCustomTemplateVariables,
  mergeVariantsWithDefaults,
  toCreateNotifyTemplateReq,
  toNotifyTemplateFormValues,
  toUpdateNotifyTemplateReq,
} from './template-page-helpers';
import type { NotifyTemplateFormValues } from './template-page-helpers';

describe('extractCustomTemplateVariables', () => {
  it('deduplicates custom variables in first-appearance order and excludes notify variables', () => {
    const subject = '${recipientName} ${notify.currentDateTime} ${recipientName}';
    const content = '${order.code} ${notify.receiverUserId} ${retry_count} ${order.code}';

    const variables = extractCustomTemplateVariables(subject, content);

    expect(variables.map((variable) => variable.name)).toEqual([
      'recipientName',
      'order.code',
      'retry_count',
    ]);
    expect(variables.every((variable) => variable.kind === 'CUSTOM' && !variable.builtin)).toBe(true);
  });

  it('returns an empty list when templates contain only built-in or malformed variables', () => {
    const variables = extractCustomTemplateVariables(
      '${notify.timestamp}',
      '${invalid variable} ${notify.receiverEmail}',
    );

    expect(variables).toEqual([]);
  });
});

describe('SYSTEM_TEMPLATE_VARIABLES', () => {
  it('contains every read-only backend-provided notification variable', () => {
    expect(SYSTEM_TEMPLATE_VARIABLES.map((variable) => variable.name)).toEqual([
      'notify.currentDateTime',
      'notify.currentDate',
      'notify.currentTime',
      'notify.timestamp',
      'notify.year',
      'notify.month',
      'notify.day',
      'notify.hour',
      'notify.minute',
      'notify.second',
      'notify.dayOfWeek',
      'notify.templateCode',
      'notify.channelType',
      'notify.receiverUserId',
      'notify.receiverEmail',
    ]);
    expect(SYSTEM_TEMPLATE_VARIABLES.every((variable) => variable.kind === 'BUILTIN' && variable.builtin)).toBe(true);
  });
});

describe('buildNotifyTemplatePageReq', () => {
  it('normalizes search text and preserves channel and pagination', () => {
    const request = buildNotifyTemplatePageReq({
      pageNum: 2,
      pageSize: 20,
      templateCode: ' approval ',
      templateName: ' 审批提醒 ',
      channelType: 'SITE',
    });

    expect(request).toEqual({
      pageNum: 2,
      pageSize: 20,
      templateCode: 'approval',
      templateName: '审批提醒',
      channelType: 'SITE',
    });
  });
});

describe('notify template category', () => {
  const values: NotifyTemplateFormValues = {
    templateCode: 'ORDER_APPROVED',
    templateName: '订单审批通过',
    categoryCode: 'BUSINESS',
    variants: [],
  };

  it('submits the selected category when creating a template', () => {
    expect(toCreateNotifyTemplateReq(values)).toMatchObject({ categoryCode: 'BUSINESS' });
  });

  it('submits the category when updating so an existing template can be re-categorised', () => {
    expect(toUpdateNotifyTemplateReq(values)).toMatchObject({ categoryCode: 'BUSINESS' });
  });

  it('omits a blank category so the backend keeps the DEFAULT fallback', () => {
    expect(toCreateNotifyTemplateReq({ ...values, categoryCode: undefined })).not.toHaveProperty('categoryCode');
    expect(toCreateNotifyTemplateReq({ ...values, categoryCode: '   ' })).not.toHaveProperty('categoryCode');
    expect(toUpdateNotifyTemplateReq({ ...values, categoryCode: '   ' })).not.toHaveProperty('categoryCode');
  });

  it('loads the stored category into the edit form', () => {
    const formValues = toNotifyTemplateFormValues({
      id: 'template-1',
      templateCode: 'ORDER_APPROVED',
      templateName: '订单审批通过',
      categoryCode: 'SECURITY',
    });

    expect(formValues).toMatchObject({ categoryCode: 'SECURITY' });
  });

  it('leaves the category empty in the edit form when the template is uncategorised', () => {
    const formValues = toNotifyTemplateFormValues({
      id: 'template-1',
      templateCode: 'PASSWORD_RESET',
      templateName: '用户密码重置通知',
    });

    expect(formValues).not.toHaveProperty('categoryCode');
  });
});

describe('notify template variants', () => {
  it('seeds one editable placeholder per channel, including PUSH', () => {
    const variants = createDefaultVariants();

    expect(variants.map((variant) => variant.channelType)).toEqual([
      'SITE',
      'EMAIL',
      'WECOM_GROUP_WEBHOOK',
      'FEISHU_GROUP_WEBHOOK',
      'DINGTALK_GROUP_WEBHOOK',
      'PUSH',
    ]);
    expect(variants.every((variant) => variant.enabled === false && variant.contentTemplate === '')).toBe(true);
  });

  it('returns a fresh copy so two forms do not share variant objects', () => {
    expect(createDefaultVariants()[0]).not.toBe(createDefaultVariants()[0]);
  });

  it('fills unconfigured channels when a template only has some variants', () => {
    const merged = mergeVariantsWithDefaults([
      { channelType: 'EMAIL', contentTemplate: '订单已支付', enabled: true },
    ]);

    expect(merged.map((variant) => variant.channelType)).toEqual([
      'SITE',
      'EMAIL',
      'WECOM_GROUP_WEBHOOK',
      'FEISHU_GROUP_WEBHOOK',
      'DINGTALK_GROUP_WEBHOOK',
      'PUSH',
    ]);
    expect(merged.find((variant) => variant.channelType === 'EMAIL')).toMatchObject({
      contentTemplate: '订单已支付',
      enabled: true,
    });
    expect(merged.find((variant) => variant.channelType === 'SITE')).toMatchObject({
      contentTemplate: '',
      enabled: false,
    });
  });

  it('submits variants on create so a template can be configured in one pass', () => {
    const request = toCreateNotifyTemplateReq({
      templateCode: 'ORDER_PAID',
      templateName: '订单支付成功',
      variants: [{ channelType: 'EMAIL', contentTemplate: ' 订单已支付 ', enabled: true }],
    });

    expect(request.variants).toEqual([
      { channelType: 'EMAIL', contentTemplate: '订单已支付', enabled: true },
    ]);
  });
});
