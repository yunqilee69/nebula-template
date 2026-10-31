import { describe, expect, it } from 'vitest';
import {
  SYSTEM_TEMPLATE_VARIABLE_GROUPS,
  SYSTEM_TEMPLATE_VARIABLES,
  buildNotifyTemplatePageReq,
  createDefaultVariants,
  extractCustomTemplateVariables,
  extractCustomTemplateVariablesFromVariants,
  htmlTemplateVariableUsage,
  isValidTemplateFieldCode,
  mergeVariantsWithDefaults,
  textTemplateVariableUsage,
  toCreateNotifyTemplateReq,
  toNotifyTemplateFormValues,
  toUpdateNotifyTemplateReq,
} from './template-page-helpers';
import type { NotifyTemplateFormValues } from './template-page-helpers';

describe('extractCustomTemplateVariables', () => {
  it('deduplicates custom variables in first-appearance order and excludes notify variables', () => {
    const subject = '[(${recipientName})] [(${notify.currentDateTime})] [(${recipientName})]';
    const content = '<p th:text="${orderNo}">订单</p> [(${notify.receiverUserId})] [(${retryCount})] [(${orderNo})]';

    const variables = extractCustomTemplateVariables(subject, content);

    expect(variables.map((variable) => variable.name)).toEqual([
      'recipientName',
      'orderNo',
      'retryCount',
    ]);
    expect(variables.every((variable) => variable.kind === 'CUSTOM' && !variable.builtin)).toBe(true);
  });

  it('returns an empty list when templates contain only built-in or malformed variables', () => {
    const variables = extractCustomTemplateVariables(
      '[(${notify.timestamp})]',
      '[(${invalid variable})] [(${notify.receiverEmail})]',
    );

    expect(variables).toEqual([]);
  });

  it('scans the HTML content template as well', () => {
    const variables = extractCustomTemplateVariablesFromVariants([
      { contentTemplate: '[(${nickname})]', htmlContentTemplate: '<p th:text="${orderNo}">订单</p>' },
    ]);

    expect(variables.map((variable) => variable.name)).toEqual(['nickname', 'orderNo']);
  });
});

describe('isValidTemplateFieldCode', () => {
  it('accepts simple identifiers only', () => {
    expect(isValidTemplateFieldCode('orderNo')).toBe(true);
    expect(isValidTemplateFieldCode('_retry_count')).toBe(true);
    expect(isValidTemplateFieldCode('1order')).toBe(false);
    expect(isValidTemplateFieldCode('order.code')).toBe(false);
    expect(isValidTemplateFieldCode('order-no')).toBe(false);
    expect(isValidTemplateFieldCode('notify')).toBe(false);
    expect(isValidTemplateFieldCode('  ')).toBe(false);
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

  it('groups time and send-context variables without losing any entry', () => {
    expect(SYSTEM_TEMPLATE_VARIABLE_GROUPS.map((group) => group.title)).toEqual(['时间相关', '发送上下文']);
    expect(SYSTEM_TEMPLATE_VARIABLE_GROUPS.flatMap((group) => group.variables.map((variable) => variable.name)))
      .toEqual(SYSTEM_TEMPLATE_VARIABLES.map((variable) => variable.name));
  });

  it('renders copyable usage examples for text and HTML templates', () => {
    expect(textTemplateVariableUsage('notify.currentDate')).toBe('[(${notify.currentDate})]');
    expect(htmlTemplateVariableUsage('orderNo')).toBe('th:text="${orderNo}"');
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

  it('submits the HTML template for EMAIL and drops it for other channels', () => {
    const request = toCreateNotifyTemplateReq({
      templateCode: 'ORDER_PAID',
      templateName: '订单支付成功',
      variants: [
        { channelType: 'EMAIL', contentTemplate: '订单已支付', htmlContentTemplate: ' <p>订单已支付</p> ', enabled: true },
        { channelType: 'SITE', contentTemplate: '订单已支付', htmlContentTemplate: '<p>不应提交</p>', enabled: true },
      ],
    });

    expect(request.variants?.[0]).toMatchObject({ htmlContentTemplate: '<p>订单已支付</p>' });
    expect(request.variants?.[1]).not.toHaveProperty('htmlContentTemplate');
  });
});
