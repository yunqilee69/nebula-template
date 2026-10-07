import { ReloadOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Empty, Space, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useCallback, useEffect, useState } from 'react';
import { DictLabel } from '@/components/dict-select';
import { useNebulaI18n } from '@/hooks/use-nebula-i18n';
import { useNotice } from '@/hooks/use-notice';
import type { ApiPermissionService } from '@/api/api-permission';
import type {
  ApiReconciliationEndpoint,
  ApiRegistryReconciliationResp,
  UnregisteredPermission,
  UnusedApiPermission,
} from '@/types/api-permission';
import { PARAM_MODULE_DICT_CODE } from './api-form-modal';

interface ApiReconciliationPanelProps {
  service: ApiPermissionService;
  /** 登记数据变更后由父级递增，用于刷新对账结果。 */
  version: number;
}

export function ApiReconciliationPanel({ service, version }: ApiReconciliationPanelProps) {
  const { t } = useNebulaI18n();
  const notice = useNotice();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<ApiRegistryReconciliationResp>({
    unregisteredPermissions: [],
    unusedApiPermissions: [],
  });

  const load = useCallback(() => {
    setLoading(true);
    return service.getReconciliation()
      .then((data) => setResult(data))
      .catch((error: unknown) => {
        notice.error(t('auth.apiManagement.feedback.reconciliationLoadFailed'));
        console.error('Failed to load api registry reconciliation', error);
      })
      .finally(() => setLoading(false));
  }, [service, notice, t]);

  useEffect(() => {
    void load();
  }, [load, version]);

  const unregisteredColumns: ColumnsType<UnregisteredPermission> = [
    { title: t('auth.apiManagement.reconciliation.columns.code'), dataIndex: 'code', width: 240 },
    {
      title: t('auth.apiManagement.reconciliation.columns.resourceType'),
      dataIndex: 'resourceType',
      width: 120,
      render: (value: string) => <Tag color={value === 'API' ? 'blue' : 'default'}>{value}</Tag>,
    },
    {
      title: t('auth.apiManagement.reconciliation.columns.handler'),
      dataIndex: 'endpoints',
      render: (endpoints: ApiReconciliationEndpoint[]) => (
        <Space direction="vertical" size={2}>
          {endpoints.map((endpoint) => (
            <Typography.Text key={`${endpoint.handler}-${endpoint.pathPattern}`} code>
              {endpoint.httpMethod ? `${endpoint.httpMethod} ` : ''}{endpoint.pathPattern} → {endpoint.handler}
            </Typography.Text>
          ))}
        </Space>
      ),
    },
  ];

  const unusedColumns: ColumnsType<UnusedApiPermission> = [
    { title: t('auth.apiManagement.reconciliation.columns.code'), dataIndex: 'code', width: 240 },
    { title: t('auth.apiManagement.reconciliation.columns.module'), dataIndex: 'module', width: 160,
      render: (module: string | undefined) => (module
        ? <DictLabel dictCode={PARAM_MODULE_DICT_CODE} value={module} />
        : '-') },
    { title: t('auth.apiManagement.columns.name'), dataIndex: 'name' },
  ];

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Alert
        type="info"
        showIcon
        message={t('auth.apiManagement.reconciliation.hint')}
        action={(
          <Button icon={<ReloadOutlined />} loading={loading} onClick={() => void load()}>
            {t('auth.apiManagement.actions.reload')}
          </Button>
        )}
      />
      <Card title={t('auth.apiManagement.reconciliation.unregisteredTitle')}>
        {result.unregisteredPermissions.length === 0 && !loading ? (
          <Empty description={t('auth.apiManagement.reconciliation.unregisteredEmpty')} />
        ) : (
          <Table<UnregisteredPermission>
            rowKey="code"
            size="small"
            loading={loading}
            pagination={false}
            dataSource={result.unregisteredPermissions}
            columns={unregisteredColumns}
          />
        )}
      </Card>
      <Card title={t('auth.apiManagement.reconciliation.unusedTitle')}>
        {result.unusedApiPermissions.length === 0 && !loading ? (
          <Empty description={t('auth.apiManagement.reconciliation.unusedEmpty')} />
        ) : (
          <Table<UnusedApiPermission>
            rowKey="id"
            size="small"
            loading={loading}
            pagination={false}
            dataSource={result.unusedApiPermissions}
            columns={unusedColumns}
          />
        )}
      </Card>
    </Space>
  );
}
