import { Alert, App, Button, Checkbox, Descriptions, Divider, Drawer, Flex, Form, Input, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useCallback, useEffect, useState } from 'react';
import { tenantApi } from '@/api/tenants';
import { buildTenantEntryUrl } from '@/lib/tenant-entry';
import type { Tenant, TenantDomain, TenantInvitation } from '@/types';
import { domainStatusMeta, invitationStatusMeta, tenantStatusMeta } from './status';

interface TenantDetailDrawerProps {
  tenant: Tenant | null;
  open: boolean;
  onClose: () => void;
  onChanged: () => void;
}

interface DomainFormValues {
  domain: string;
  primary?: boolean;
}

export function TenantDetailDrawer({ tenant, open, onClose, onChanged }: TenantDetailDrawerProps) {
  const { message } = App.useApp();
  const [domains, setDomains] = useState<TenantDomain[]>([]);
  const [invitations, setInvitations] = useState<TenantInvitation[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [form] = Form.useForm<DomainFormValues>();

  const load = useCallback(async (tenantId: string) => {
    setLoading(true);
    try {
      const [nextDomains, nextInvitations] = await Promise.all([
        tenantApi.listDomains(tenantId),
        tenantApi.listInvitations(tenantId),
      ]);
      setDomains(nextDomains);
      setInvitations(nextInvitations);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '加载企业详情失败');
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    if (!open || !tenant) return;
    form.resetFields();
    form.setFieldValue('domain', tenant.code);
    void load(tenant.id);
  }, [form, load, open, tenant]);

  if (!tenant) return null;

  const statusMeta = tenantStatusMeta(tenant.status);
  const entryUrl = buildTenantEntryUrl(tenant.code);

  const addDomain = async (values: DomainFormValues) => {
    setAdding(true);
    try {
      await tenantApi.addDomain(tenant.id, values);
      message.success('域名已添加');
      form.resetFields();
      form.setFieldValue('domain', tenant.code);
      await load(tenant.id);
      onChanged();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '添加域名失败');
    } finally {
      setAdding(false);
    }
  };

  const domainColumns: ColumnsType<TenantDomain> = [
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
    {
      title: '接受时间',
      dataIndex: 'acceptedAt',
      width: 160,
      render: (value?: string) => (value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '-'),
    },
  ];

  return (
    <Drawer width={760} open={open} onClose={onClose} title={`企业详情 · ${tenant.name}`} destroyOnHidden>
      <Flex vertical gap={16}>
        <Descriptions bordered column={2} size="small">
          <Descriptions.Item label="企业名称">{tenant.name}</Descriptions.Item>
          <Descriptions.Item label="企业代码">{tenant.code}</Descriptions.Item>
          <Descriptions.Item label="状态">
            <Tag color={statusMeta.color}>{statusMeta.label}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="联系邮箱">{tenant.contactEmail || '-'}</Descriptions.Item>
          <Descriptions.Item label="企业简称">{tenant.shortName || '-'}</Descriptions.Item>
          <Descriptions.Item label="联系电话">{tenant.contactPhone || '-'}</Descriptions.Item>
          <Descriptions.Item label="官网地址">
            {tenant.website ? (
              <Typography.Link href={tenant.website} target="_blank" rel="noreferrer">{tenant.website}</Typography.Link>
            ) : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="所属行业">{tenant.industry || '-'}</Descriptions.Item>
          <Descriptions.Item label="默认语言">{tenant.locale || '-'}</Descriptions.Item>
          <Descriptions.Item label="默认时区">{tenant.timezone || '-'}</Descriptions.Item>
          <Descriptions.Item label="联系地址" span={2}>{tenant.address || '-'}</Descriptions.Item>
          <Descriptions.Item label="企业简介" span={2}>{tenant.description || '-'}</Descriptions.Item>
          <Descriptions.Item label="登录页标题">{tenant.branding?.loginTitle || '-'}</Descriptions.Item>
          <Descriptions.Item label="主题色">
            {tenant.branding?.themeColor ? <Tag color={tenant.branding.themeColor}>{tenant.branding.themeColor}</Tag> : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="企业入口" span={2}>
            {entryUrl ? (
              <Typography.Link href={entryUrl} target="_blank" rel="noreferrer">{entryUrl}</Typography.Link>
            ) : (
              <Typography.Text type="secondary">未配置入口地址模板，企业代码：{tenant.code}</Typography.Text>
            )}
          </Descriptions.Item>
          <Descriptions.Item label="创建时间">
            {tenant.createTime ? dayjs(tenant.createTime).format('YYYY-MM-DD HH:mm') : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="更新时间">
            {tenant.updateTime ? dayjs(tenant.updateTime).format('YYYY-MM-DD HH:mm') : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="企业 ID" span={2}>
            <Typography.Text copyable code>{tenant.id}</Typography.Text>
          </Descriptions.Item>
        </Descriptions>

        <Divider titlePlacement="start" style={{ margin: '4px 0' }}>域名</Divider>
        <Alert
          type="info"
          showIcon
          title="域名由控制平面统一配置"
          description="添加后请确认 DNS 已解析到本服务；租户成员无法自行修改域名。只填单个标签时，后端会按已配置的基础域自动补全。"
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
        {tenant.status === 'DELETED' ? null : (
          <Form form={form} layout="inline" onFinish={addDomain}>
            <Form.Item
              name="domain"
              rules={[{ required: true, message: '请输入域名' }]}
              style={{ flex: 1 }}
            >
              <Input placeholder="例如 acme 或 acme.app.example.com" />
            </Form.Item>
            <Form.Item name="primary" valuePropName="checked">
              <Checkbox>设为主域名</Checkbox>
            </Form.Item>
            <Button type="primary" htmlType="submit" loading={adding}>添加域名</Button>
          </Form>
        )}

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
