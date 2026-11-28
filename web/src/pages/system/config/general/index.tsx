import {
  Empty,
  Form,
  Spin,
  Tabs,
} from 'antd';
import type { TabsProps } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNotice } from '@/hooks/use-notice';
import { useAuthStore } from '@/stores/auth-store';
import { hasPermission } from '@/utils/permissions';
import { notifyService } from '@/services/notify';
import { paramService } from '@/services/param';
import {
  buildGeneralConfigPatch,
  buildTabs,
  getVisibleTabs,
  updateTabParamValues,
} from './advance-config-data';
import type { AdvanceTab } from './advance-config-data';
import { TabPanel } from './components/config-panels';
import { TestEmailModal, type TestEmailFormValues } from './components/test-email-modal';
import { TenantAuthTab } from './auth-tab';
import { StorageSettingsPanel } from './storage';
import { TenantProfileProvider, TenantSettingsTabs } from './tenant-settings';

/* ------------------------------------------------------------------ */
/*  Main page                                                         */
/* ------------------------------------------------------------------ */

export function GeneralConfigPage() {
  const [tabs, setTabs] = useState<AdvanceTab[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [dirtyMap, setDirtyMap] = useState<Record<string, string>>({});
  const [batchSaving, setBatchSaving] = useState(false);
  const [testEmailOpen, setTestEmailOpen] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [testEmailForm] = Form.useForm<TestEmailFormValues>();
  const notice = useNotice();
  const permissions = useAuthStore((state) => state.permissions);
  const roles = useAuthStore((state) => state.roles);
  // 企业资料与存储各有自己的读取接口：没有对应权限就不展示 tab，也不发请求
  const canReadTenantProfile = hasPermission(permissions, 'BUTTON:TENANT_PROFILE_QUERY:Allow', { roles });
  const canReadStorageSettings = hasPermission(permissions, 'API:STORAGE_SETTINGS_QUERY:Allow', { roles });

  useEffect(() => {
    setLoading(true);
    setError(false);

    void paramService.getGeneralConfig()
      .then((dto) => {
        setTabs(buildTabs(dto));
      })
      .catch(() => {
        setError(true);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleValueChange = useCallback((paramKey: string, value: string) => {
    setDirtyMap((prev) => ({ ...prev, [paramKey]: value }));
  }, []);

  const batchSave = useCallback(async () => {
    const dirtyEntries = Object.entries(dirtyMap);
    if (dirtyEntries.length === 0) return;
    const dto = buildGeneralConfigPatch(dirtyMap);

    setBatchSaving(true);
    try {
      await paramService.updateGeneralConfig(dto);
      setTabs((prev) => updateTabParamValues(prev, dirtyMap));
      setDirtyMap({});
      notice.success(`全部 ${dirtyEntries.length} 项已保存`);
    } catch {
      notice.error('批量保存失败，请重试');
    } finally {
      setBatchSaving(false);
    }
  }, [dirtyMap, notice]);

  const openTestEmail = useCallback(() => {
    testEmailForm.setFieldsValue({
      subject: 'Nebula SMTP配置测试',
      content: '这是一封用于验证 Nebula 邮件通知配置是否有效的测试邮件。',
    });
    setTestEmailOpen(true);
  }, [testEmailForm]);

  const sendTestEmail = useCallback(async () => {
    const values = await testEmailForm.validateFields();
    setTestingEmail(true);
    try {
      await notifyService.testEmailNotify(values);
      notice.success('测试邮件发送成功');
      setTestEmailOpen(false);
      testEmailForm.resetFields();
    } catch (error) {
      if (error instanceof Error) {
        notice.error(error.message || '测试邮件发送失败');
      } else {
        notice.error('测试邮件发送失败');
      }
    } finally {
      setTestingEmail(false);
    }
  }, [notice, testEmailForm]);

  const hasChanges = Object.keys(dirtyMap).length > 0;
  const visibleTabs = useMemo(() => getVisibleTabs(tabs), [tabs]);

  const tabItems = useMemo<TabsProps['items']>(() => {
    // 「登录与注册」参数并入「认证」tab，与企业的第三方登录配置同屏
    const authConfigTab = visibleTabs.find((tab) => tab.tabName === '登录与注册');
    const otherConfigTabs = visibleTabs
      .filter((tab) => tab.tabName !== '登录与注册')
      .map((tab) => ({
        key: tab.tabName,
        label: tab.tabName,
        children: (
          <TabPanel
            tab={tab}
            dirtyMap={dirtyMap}
            hasChanges={hasChanges}
            batchSaving={batchSaving}
            onDirtyUpdate={handleValueChange}
            onBatchSave={batchSave}
            onTestEmail={openTestEmail}
          />
        ),
      }));

    // 企业资料与品牌资源共享一份表单和 `PUT /api/auth/tenant/profile`，合并为「品牌与站点」一页
    const tenantTabs = canReadTenantProfile
      ? [{ key: 'tenant-info', label: '品牌与站点', children: <TenantSettingsTabs /> }]
      : [];
    // 认证：OAuth2 走自己的接口，登录/注册参数沿用本页批量保存
    const authTabs = [{
      key: 'auth',
      label: '认证',
      children: (
        <TenantAuthTab
          configTab={authConfigTab}
          dirtyMap={dirtyMap}
          hasChanges={hasChanges}
          batchSaving={batchSaving}
          onDirtyUpdate={handleValueChange}
          onBatchSave={batchSave}
          onTestEmail={openTestEmail}
        />
      ),
    }];
    const storageTabs = canReadStorageSettings
      ? [{ key: 'storage', label: '存储', children: <StorageSettingsPanel /> }]
      : [];
    return [...tenantTabs, ...authTabs, ...otherConfigTabs, ...storageTabs];
  }, [
    visibleTabs, dirtyMap, hasChanges, batchSaving, handleValueChange, batchSave, openTestEmail,
    canReadTenantProfile, canReadStorageSettings,
  ]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <Empty description="加载配置失败，请稍后重试" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-auto p-6">
        <TenantProfileProvider enabled={canReadTenantProfile}>
          <Tabs
            defaultActiveKey={tabItems?.[0]?.key}
            items={tabItems}
            size="large"
          />
        </TenantProfileProvider>
      </div>
      <TestEmailModal
        open={testEmailOpen}
        loading={testingEmail}
        form={testEmailForm}
        onSubmit={() => void sendTestEmail()}
        onCancel={() => setTestEmailOpen(false)}
      />
    </div>
  );
}

export default GeneralConfigPage;
