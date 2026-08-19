import { describe, expect, it } from 'vitest';
import {
  SYSTEM_TEMPLATE_VARIABLES,
  buildNotifyTemplatePageReq,
  extractCustomTemplateVariables,
} from './template-page-helpers';

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
