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
      'storage.upload.max-file-size': '100',
      'storage.upload.allowed-extensions': 'jpg,png',
    });

    expect(patch).toEqual({
      phoneLoginEnabled: true,
      notifyEmailSmtpPort: 587,
      notifyEmailSecurity: 'STARTTLS',
      storageUploadMaxFileSize: 100,
      storageUploadAllowedExtensions: 'jpg,png',
    });
  });

  it('renders storage business upload policy fields from the general-config DTO', () => {
    const builtTabs = buildTabs({
      storageUploadMaxFileSize: 100,
      storageUploadChunkThreshold: 10,
      storageUploadChunkSize: 5,
      storageUploadAllowedExtensions: 'jpg,png',
      storageUploadTempRetentionDays: 14,
    });

    const storageTab = builtTabs.find((tab) => tab.tabName === '存储');

    expect(storageTab?.groups[0]?.groupName).toBe('上传配置');
    expect(storageTab?.groups[0]?.params.map((param) => param.paramKey)).toEqual([
      'storage.upload.max-file-size',
      'storage.upload.chunk-threshold',
      'storage.upload.chunk-size',
      'storage.upload.allowed-extensions',
      'storage.upload.temp-retention-days',
    ]);
    expect(storageTab?.groups[0]?.params.map((param) => param.paramValue)).toEqual(['100', '10', '5', 'jpg,png', '14']);
  });

  it('updates saved values immutably after unified save', () => {
    const afterBatchSave = updateTabParamValues(tabs, { 'login.phone.enabled': 'true' });

    expect(afterBatchSave).not.toBe(tabs);
    expect(afterBatchSave[0]?.groups[0]?.params[0]?.paramValue).toBe('true');
    expect(tabs[0]?.groups[0]?.params[0]?.paramValue).toBe('false');
  });
});
