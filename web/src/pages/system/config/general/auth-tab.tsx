import { Space } from 'antd';
import type { AdvanceTab } from './advance-config-data';
import { TabPanel } from './components/config-panels';
import { TenantSecurityTab } from './tenant-settings';

interface TenantAuthTabProps {
  /** 「登录与注册」参数分组；页面未下发该分组时为 undefined。 */
  readonly configTab?: AdvanceTab;
  readonly dirtyMap: Record<string, string>;
  readonly hasChanges: boolean;
  readonly batchSaving: boolean;
  readonly onDirtyUpdate: (paramKey: string, value: string) => void;
  readonly onBatchSave: () => Promise<void>;
  readonly onTestEmail: () => void;
}

/**
 * 高级配置 → 认证：企业第三方登录（OAuth2）与登录/注册策略放在同一个 tab。
 *
 * <p>两块是不同接口：OAuth2 走 `/api/auth/tenant/oauth2-providers`（列表内弹窗保存），
 * 登录/注册策略是参数中心参数（沿用本页的脏值批量保存）。
 * 放在一起是因为它们回答的是同一个问题——「这个企业怎么登录」，分两个 tab 反而要来回找。</p>
 */
export function TenantAuthTab({
  configTab,
  dirtyMap,
  hasChanges,
  batchSaving,
  onDirtyUpdate,
  onBatchSave,
  onTestEmail,
}: TenantAuthTabProps) {
  return (
    <Space orientation="vertical" size={24} style={{ width: '100%' }}>
      <TenantSecurityTab />
      {configTab ? (
        <div>
          <TabPanel
            tab={configTab}
            dirtyMap={dirtyMap}
            hasChanges={hasChanges}
            batchSaving={batchSaving}
            onDirtyUpdate={onDirtyUpdate}
            onBatchSave={onBatchSave}
            onTestEmail={onTestEmail}
          />
        </div>
      ) : null}
    </Space>
  );
}
