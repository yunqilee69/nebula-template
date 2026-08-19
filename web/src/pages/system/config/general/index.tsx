import {
  Empty,
  Form,
  Spin,
  Tabs,
} from 'antd';
import type { TabsProps } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNotice } from '@/hooks/use-notice';
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

  const tabItems = useMemo<TabsProps['items']>(
    () =>
      visibleTabs.map((tab) => ({
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
      })),
    [visibleTabs, dirtyMap, hasChanges, batchSaving, handleValueChange, batchSave, openTestEmail],
  );

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
        <Tabs
          defaultActiveKey={visibleTabs[0]?.tabName}
          items={tabItems}
          size="large"
        />
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
