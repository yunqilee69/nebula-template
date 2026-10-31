import { Alert, App, Button, Checkbox, Descriptions, Divider, Drawer, Flex, Form, Input, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useCallback, useEffect, useState } from 'react';
import { personService } from '@/api/person';
import type { TenantDomainSummary, TenantInvitation, TenantSummary } from '@/types/auth';
import { buildTenantUrl, getBaseDomain } from '@/utils/tenant/tenant-host';
import { domainStatusMeta, invitationStatusMeta, tenantStatusMeta } from './tenant-status';

interface TenantDetailDrawerProps {
  tenant: TenantSummary | null;
  open: boolean;
  onClose: () => void;
  onChanged: () => void;
}

export function TenantDetailDrawer({ tenant, open, onClose, onChanged }: TenantDetailDrawerProps) {
  const { message } = App.useApp();
  const [domains, setDomains] = useState<TenantDomainSummary[]>([]);
  const [invitations, setInvitations] = useState<TenantInvitation[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [form] = Form.useForm();

  const load = useCallback(async (tenantId: string) => {
    setLoading(true);
    try {
      const [nextDomains, nextInvitations] = await Promise.all([
        personService.listTenantDomains(tenantId),
        personService.listTenantInvitations(tenantId),
      ]);
      setDomains(nextDomains);
      setInvitations(nextInvitations);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open || !tenant) {
      return;
    }
    form.resetFields();
    const baseDomain = getBaseDomain();
    form.setFieldValue('domain', baseDomain ? `${tenant.code}.${baseDomain}` : '');
    void load(tenant.id);
  }, [form, load, open, tenant]);

  if (!tenant) {
    return null;
  }

  const statusMeta = tenantStatusMeta(tenant.status);
  const tenantUrl = buildTenantUrl(tenant);

  const addDomain = async (values: { domain: string; primary?: boolean }) => {
    setAdding(true);
    try {
      await personService.addTenantDomain(tenant.id, values);
      message.success('域名已添加');
      form.resetFields();
      await load(tenant.id);
      onChanged();
    } finally {
      setAdding(false);
    }
  };

  const domainColumns: ColumnsType<TenantDomainSummary> = [
    { title: '域名', dataIndex: 'domain' },
    {
      title: '主域名',
      dataIndex: 'primaryDomain',
      width: 90,
      render: (value?: number) => (value === 1 ? <Tag color="blue">主域名</Tag> : '-'),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (value: string) => {
        const meta = domainStatusMeta(value);
        return <Tag color={meta.color}>{meta.label}</Tag>;
      },
    },
    {
      title: '验证时间',
      dataIndex: 'verifiedAt',
      width: 160,
      render: (value?: string) => (value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '-'),
    },
  ];

  const invitationColumns: ColumnsType<TenantInvitation> = [
    {
      title: '受邀人',
      render: (_, invitation) => invitation.email || invitation.phone || '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (value: string) => {
        const meta = invitationStatusMeta(value);
        return <Tag color={meta.color}>{meta.label}</Tag>;
      },
    },
    {
      title: '过期时间',
      dataIndex: 'expiresAt',
      width: 160,
      render: (value?: string) => (value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '-'),
    },
  ];

  return (
    <Drawer
      width={720}
      open={open}
      onClose={onClose}
      title={`租户详情 · ${tenant.name}`}
      destroyOnHidden
    >
      <Flex vertical gap={16}>
        <Descriptions bordered column={2} size="small">
          <Descriptions.Item label="企业名称">{tenant.name}</Descriptions.Item>
          <Descriptions.Item label="企业代码">{tenant.code}</Descriptions.Item>
          <Descriptions.Item label="状态">
            <Tag color={statusMeta.color}>{statusMeta.label}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="联系邮箱">{tenant.contactEmail || '-'}</Descriptions.Item>
          <Descriptions.Item label="访问地址">
            {tenantUrl ? (
              <Typography.Link href={tenantUrl} target="_blank" rel="noreferrer">{tenantUrl}</Typography.Link>
            ) : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="创建时间">
            {tenant.createTime ? dayjs(tenant.createTime).format('YYYY-MM-DD HH:mm') : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="租户 ID" span={2}>
            <Typography.Text copyable code>{tenant.id}</Typography.Text>
          </Descriptions.Item>
        </Descriptions>

        <Divider titlePlacement="start" style={{ margin: '4px 0' }}>域名</Divider>
        <Alert
          type="info"
          showIcon
          message="域名由平台管理员在默认租户中统一配置"
          description="添加后请确认 DNS 已解析到本服务；租户成员无法自行修改域名。"
        />
        <Table
          rowKey="id"
          size="small"
          loading={loading}
          columns={domainColumns}
          dataSource={domains}
          pagination={false}
          locale={{ emptyText: '暂无域名记录' }}
        />
        {tenant.status !== 'DELETED' ? (
          <Form form={form} layout="inline" onFinish={addDomain}>
            <Form.Item name="domain" rules={[{ required: true, message: '请输入域名' }]} style={{ flex: 1 }}>
              <Input placeholder="例如 beta.example.com" />
            </Form.Item>
            <Form.Item name="primary" valuePropName="checked">
              <Checkbox>设为主域名</Checkbox>
            </Form.Item>
            <Button type="primary" htmlType="submit" loading={adding}>添加域名</Button>
          </Form>
        ) : null}

        <Divider titlePlacement="start" style={{ margin: '4px 0' }}>邀请记录</Divider>
        <Table
          rowKey="id"
          size="small"
          loading={loading}
          columns={invitationColumns}
          dataSource={invitations}
          pagination={false}
          locale={{ emptyText: '暂无邀请记录' }}
        />
      </Flex>
    </Drawer>
  );
}
