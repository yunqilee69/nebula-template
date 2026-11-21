import { describe, expect, it } from 'vitest';
import { DataType } from '@/types/param';
import {
  buildTabs,
  buildGeneralConfigPatch,
  getVisibleTabs,
  updateTabParamValues,
} from './advance-config-data';
import type { AdvanceTab } from './advance-config-data';

const tabs: readonly AdvanceTab[] = [
  {
    tabName: '登录与注册',
    groups: [
      {
        groupName: '登录配置',
        params: [
          {
            paramKey: 'login.phone.enabled',
            paramName: '手机号登录开关',
            description: '手机号登录开关',
            paramValue: 'false',
            dataType: DataType.BOOLEAN,
          },
        ],
      },
    ],
  },
  {
    tabName: '字典',
    groups: [{ groupName: '字典配置', params: [] }],
  },
];

describe('general config helpers', () => {
  it('hides tabs whose groups have no params', () => {
    const visibleTabs = getVisibleTabs(tabs);

    expect(visibleTabs.map((tab) => tab.tabName)).toEqual(['登录与注册']);
  });

  it('builds a typed general-config patch from dirty param values', () => {
    const patch = buildGeneralConfigPatch({
      'login.phone.enabled': 'true',
      'notify.email.smtp-port': '587',
      'notify.email.security': 'STARTTLS',
    });

    expect(patch).toEqual({
      phoneLoginEnabled: true,
      notifyEmailSmtpPort: 587,
      notifyEmailSecurity: 'STARTTLS',
    });
  });

  it('does not render storage parameters: those are maintained by the storage settings page', () => {
    const builtTabs = buildTabs({});

    expect(builtTabs.map((tab) => tab.tabName)).not.toContain('存储');
    const paramKeys = builtTabs.flatMap((tab) => tab.groups.flatMap((group) => group.params.map((param) => param.paramKey)));
    expect(paramKeys.some((key) => key.startsWith('storage.'))).toBe(false);
  });

  it('updates saved values immutably after unified save', () => {
    const afterBatchSave = updateTabParamValues(tabs, { 'login.phone.enabled': 'true' });

    expect(afterBatchSave).not.toBe(tabs);
    expect(afterBatchSave[0]?.groups[0]?.params[0]?.paramValue).toBe('true');
    expect(tabs[0]?.groups[0]?.params[0]?.paramValue).toBe('false');
  });
});
