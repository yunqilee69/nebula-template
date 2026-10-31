import { Alert, Button, Card, Form, Input, Modal, Select, Space, Switch, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useCallback, useEffect, useState } from 'react';
import { tenantOAuthService, type TenantOAuth2Provider } from '@/api/tenant-oauth';

export function TenantOAuthProvidersPage() {
  const [rows, setRows] = useState<TenantOAuth2Provider[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TenantOAuth2Provider | null>(null);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await tenantOAuthService.list());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const showForm = (row?: TenantOAuth2Provider) => {
    setEditing(row ?? null);
    // Secret 永不回显；重置表单避免上一次输入残留在编辑框里。
    form.resetFields();
    form.setFieldsValue({ ...(row ?? { providerId: 'github', channel: 'web', enabled: true }), clientSecret: '' });
    setOpen(true);
  };

  const columns: ColumnsType<TenantOAuth2Provider> = [
    { title: 'Provider', dataIndex: 'providerId' },
    { title: '渠道', dataIndex: 'channel' },
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
          <Button type="link" onClick={() => showForm(row)}>编辑</Button>
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
      extra={<Button type="primary" onClick={() => showForm()}>新增配置</Button>}
    >
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        title="配置按租户隔离"
        description="Client Secret 加密存储且永不回显；编辑时留空表示保留原值。"
      />
      <Table rowKey="id" loading={loading} columns={columns} dataSource={rows} pagination={false} />
      <Modal
        title={editing ? '编辑 OAuth2 配置' : '新增 OAuth2 配置'}
        open={open}
        width={720}
        onCancel={() => setOpen(false)}
        onOk={async () => {
          const values = await form.validateFields();
          await tenantOAuthService.upsert(values);
          setOpen(false);
          await load();
        }}
        okText="保存"
      >
        <Form form={form} layout="vertical">
          <Space.Compact block>
            <Form.Item name="providerId" label="Provider" rules={[{ required: true }]} style={{ flex: 1 }}>
              <Select options={[{ label: 'GitHub', value: 'github' }, { label: '微信', value: 'wechat' }]} />
            </Form.Item>
            <Form.Item name="channel" label="渠道" rules={[{ required: true }]} style={{ flex: 1 }}>
              <Select options={[{ label: 'Web', value: 'web' }, { label: '小程序', value: 'mini' }]} />
            </Form.Item>
          </Space.Compact>
          <Form.Item name="enabled" label="启用" valuePropName="checked"><Switch /></Form.Item>
          <Form.Item name="clientId" label="Client ID / AppID"><Input /></Form.Item>
          <Form.Item name="clientSecret" label={editing?.hasClientSecret ? 'Client Secret（留空保留原值）' : 'Client Secret'}>
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <Form.Item name="redirectUri" label="OAuth 回调地址"><Input /></Form.Item>
          <Form.Item name="scope" label="Scope"><Input /></Form.Item>
          <Form.Item name="authorizeUrl" label="授权地址"><Input /></Form.Item>
          <Form.Item name="tokenUrl" label="Token 地址"><Input /></Form.Item>
          <Form.Item name="userinfoUrl" label="用户信息地址"><Input /></Form.Item>
          <Form.Item name="frontendCallbackUri" label="前端承接页"><Input /></Form.Item>
          <Form.Item name="frontendCallbackAllowlist" label="前端回调白名单"><Input /></Form.Item>
          <Typography.Text type="secondary">小程序渠道可把 jscode2session 等额外地址放在 configJson。</Typography.Text>
          <Form.Item name="configJson" label="扩展配置 JSON"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
