import { Button, Form, Space, Spin } from 'antd';
import { useNebulaI18n } from '@/hooks/use-nebula-i18n';
import { TenantSettingsPanel } from './tenant-settings-panel';
import { useTenantProfile } from './tenant-profile-context';

/** 企业资料与品牌设置的统一表单容器，两者合并为同一页面。 */
export function TenantSettingsTabs() {
  const { t } = useNebulaI18n();
  const { form, loading, saving, canUpdate, reload, save } = useTenantProfile();

  return (
    <Spin spinning={loading}>
      <Space orientation="vertical" size={16} style={{ width: '100%' }}>
        <Space>
          <Button type="primary" loading={saving} disabled={!canUpdate} onClick={() => void save()}>
            {saving ? t('tenantSettings.actions.saving') : t('tenantSettings.actions.save')}
          </Button>
          <Button onClick={() => void reload()} loading={loading}>
            {t('tenantSettings.actions.refresh')}
          </Button>
        </Space>
        <Form form={form} layout="vertical">
          <TenantSettingsPanel />
        </Form>
      </Space>
    </Spin>
  );
}
