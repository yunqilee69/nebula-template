import { Alert, Space } from 'antd';
import { useNebulaI18n } from '@/hooks/use-nebula-i18n';
import { TenantOAuthProvidersPage } from './oauth-providers';

/**
 * 高级配置 → 登录与安全：第三方登录（OAuth2）配置。
 *
 * <p>走自己的接口（`/api/auth/tenant/oauth2-providers`），保存动作由列表内的弹窗完成，
 * 不需要页面级保存按钮。</p>
 */
export function TenantSecurityTab() {
  const { t } = useNebulaI18n();

  return (
    <Space orientation="vertical" size={16} style={{ width: '100%' }}>
      <Alert type="info" showIcon title={t('tenantSettings.security.description')} />
      <TenantOAuthProvidersPage />
    </Space>
  );
}
