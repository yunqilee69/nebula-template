import { Alert, Button, Card, Form, Space, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useCallback, useEffect, useState } from 'react';
import { tenantOAuthService, type TenantOAuth2Provider } from '@/api/tenant-oauth';
import { OAuthProviderFormModal } from './oauth-provider-form';
import { toFormValues, toUpsertRequest, type OAuthProviderFormValues } from './oauth-provider-form-helpers';

const CHANNEL_LABELS: Record<string, string> = { WEB: 'Web', MINI: '小程序' };

/** 企业第三方登录配置：列表与增删改，字段级规则由页面私用弹窗负责。 */
export function TenantOAuthProvidersPage() {
  const [rows, setRows] = useState<TenantOAuth2Provider[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<TenantOAuth2Provider | null>(null);
  const [form] = Form.useForm<OAuthProviderFormValues>();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await tenantOAuthService.list());
    } catch {
      // 失败提示由请求层统一展示，这里保持列表可用。
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openForm = (row?: TenantOAuth2Provider) => {
    setEditing(row ?? null);
    form.resetFields();
    form.setFieldsValue(toFormValues(row));
    setOpen(true);
  };

  const closeForm = () => {
    setOpen(false);
    setEditing(null);
    form.resetFields();
  };

  const submit = async (values: OAuthProviderFormValues) => {
    setSaving(true);
    try {
      await tenantOAuthService.upsert(toUpsertRequest(values));
      closeForm();
      await load();
    } catch {
      // 保存失败保留弹窗与用户输入，便于就地修正；错误提示由请求层统一展示。
    } finally {
      setSaving(false);
    }
  };

  const columns: ColumnsType<TenantOAuth2Provider> = [
    { title: 'Provider', dataIndex: 'providerId' },
    { title: '渠道', dataIndex: 'channel', render: (value: string) => CHANNEL_LABELS[value] ?? value },
    { title: '启用', dataIndex: 'enabled', render: (value: boolean) => <Tag color={value ? 'green' : 'default'}>{value ? '已启用' : '未启用'}</Tag> },
    { title: 'Client ID', dataIndex: 'clientId' },
    {
      title: 'Client Secret',
      dataIndex: 'hasClientSecret',
      render: (value: boolean) => (value ? <Tag color="blue">已配置</Tag> : <Tag>未配置</Tag>),
    },
    { title: '回调地址', dataIndex: 'redirectUri', ellipsis: true },
    {
      title: '操作',
      render: (_, row) => (
        <Space>
          <Button type="link" onClick={() => openForm(row)}>编辑</Button>
          <Button
            type="link"
            danger
            onClick={async () => {
              await tenantOAuthService.remove(row.id);
              await load();
            }}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <Card
      title="OAuth2 登录配置"
      extra={<Button type="primary" onClick={() => openForm()}>新增配置</Button>}
    >
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        title="配置按租户隔离"
        description="企业配置会真正接管该渠道的登录凭据与登录后跳转；未配置的记录仍使用系统默认配置。Client Secret 加密存储且永不回显，编辑时留空表示保留原值。"
      />
      <Table rowKey="id" loading={loading} columns={columns} dataSource={rows} pagination={false} />
      <OAuthProviderFormModal
        form={form}
        open={open}
        editing={editing}
        saving={saving}
        onCancel={closeForm}
        onSubmit={(values) => void submit(values)}
      />
    </Card>
  );
}
