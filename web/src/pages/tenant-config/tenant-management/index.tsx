import {
  Alert,
  App,
  Button,
  Card,
  Col,
  Flex,
  Form,
  Input,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useCallback, useEffect, useState } from 'react';
import { personService } from '@/api/person';
import type { TenantSummary } from '@/types/auth';
import { buildTenantUrl, getBaseDomain } from '@/utils/tenant/tenant-host';
import { TenantDetailDrawer } from './tenant-detail-drawer';
import { TENANT_STATUS_FILTER_OPTIONS, tenantStatusMeta } from './tenant-status';

export function TenantManagementPage() {
  const { message } = App.useApp();
  const [rows, setRows] = useState<TenantSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [pageNum, setPageNum] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<string | undefined>(undefined);

  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [detailTenant, setDetailTenant] = useState<TenantSummary | null>(null);
  const [inviteTarget, setInviteTarget] = useState<TenantSummary | null>(null);
  const [invitationToken, setInvitationToken] = useState('');
  const [inviting, setInviting] = useState(false);

  const [form] = Form.useForm();
  const [inviteForm] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const page = await personService.tenantsPage({
        pageNum,
        pageSize,
        keyword: keyword || undefined,
        status,
      });
      if (page.data.length === 0 && pageNum > 1) {
        setPageNum(pageNum - 1);
        return;
      }
      setRows(page.data);
      setTotal(page.total);
    } finally {
      setLoading(false);
    }
  }, [keyword, pageNum, pageSize, status]);

  useEffect(() => { void load(); }, [load]);

  const toggleStatus = async (tenant: TenantSummary) => {
    const next = tenant.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    await personService.updateTenantStatus(tenant.id, next);
    message.success(next === 'ACTIVE' ? '企业已启用' : '企业已停用');
    await load();
  };

  const openCreate = () => {
    form.resetFields();
    setCreateOpen(true);
  };

  const createTenant = async () => {
    const values = await form.validateFields();
    setCreating(true);
    try {
      await personService.createTenant(values);
      setCreateOpen(false);
      form.resetFields();
      message.success('企业已创建');
      await load();
    } finally {
      setCreating(false);
    }
  };

  const openInvite = (tenant: TenantSummary) => {
    setInviteTarget(tenant);
    setInvitationToken('');
    inviteForm.resetFields();
  };

  const submitInvitation = async () => {
    if (!inviteTarget) {
      return;
    }
    const values = await inviteForm.validateFields();
    if (!values.email && !values.phone) {
      message.warning('请至少填写邀请邮箱或手机号');
      return;
    }
    setInviting(true);
    try {
      const created = await personService.createTenantInvitation(inviteTarget.id, values);
      setInvitationToken(created.token ?? '');
    } finally {
      setInviting(false);
    }
  };

  const columns: ColumnsType<TenantSummary> = [
    {
      title: '企业',
      width: 180,
      render: (_, tenant) => (
        <div>
          <Typography.Text strong>{tenant.name}</Typography.Text>
          <div><Typography.Text type="secondary">{tenant.code}</Typography.Text></div>
        </div>
      ),
    },
    {
      title: '访问地址',
      width: 200,
      render: (_, tenant) => {
        const url = buildTenantUrl(tenant);
        if (!url) {
          return <Typography.Text type="secondary">{tenant.code}</Typography.Text>;
        }
        const host = new URL(url).host;
        if (tenant.status === 'DELETED') {
          return <Typography.Text type="secondary" delete>{host}</Typography.Text>;
        }
        return (
          <Typography.Link href={url} target="_blank" rel="noreferrer">
            {host}
          </Typography.Link>
        );
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      render: (value: string) => {
        const meta = tenantStatusMeta(value);
        return <Tag color={meta.color}>{meta.label}</Tag>;
      },
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      width: 160,
      render: (value?: string) => (value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '-'),
    },
    {
      title: '操作',
      width: 300,
      fixed: 'right',
      render: (_, tenant) => (
        <Space size={2} wrap>
          <Button type="link" size="small" onClick={() => setDetailTenant(tenant)} autoInsertSpace={false}>详情</Button>
          {tenant.status === 'DELETED' ? null : (
            <>
              <Button
                type="link"
                size="small"
                autoInsertSpace={false}
                onClick={() => {
                  const url = buildTenantUrl(tenant);
                  if (url) {
                    window.open(url, '_blank', 'noopener,noreferrer');
                  }
                }}
              >
                打开
              </Button>
              <Button type="link" size="small" onClick={() => openInvite(tenant)}>邀请成员</Button>
              <Popconfirm
                title={tenant.status === 'ACTIVE' ? `停用企业 ${tenant.name}？` : `启用企业 ${tenant.name}？`}
                description={tenant.status === 'ACTIVE' ? '停用后该企业域名将无法登录。' : undefined}
                onConfirm={() => void toggleStatus(tenant)}
              >
                <Button type="link" size="small" autoInsertSpace={false}>{tenant.status === 'ACTIVE' ? '停用' : '启用'}</Button>
              </Popconfirm>
              <Popconfirm
                title={`删除企业 ${tenant.name}？`}
                description="删除后该企业域名立即失效，关联的平台账号会被解除，且不可恢复。"
                okText="删除"
                okButtonProps={{ danger: true }}
                onConfirm={async () => {
                  await personService.deleteTenant(tenant.id);
                  message.success('企业已删除');
                  await load();
                }}
              >
                <Button type="link" size="small" danger autoInsertSpace={false}>删除</Button>
              </Popconfirm>
            </>
          )}
        </Space>
      ),
    },
  ];

  const baseDomain = getBaseDomain();
  const inviteUrl = inviteTarget && invitationToken
    ? `${buildTenantUrl(inviteTarget) ?? ''}/invitations/accept?token=${encodeURIComponent(invitationToken)}`
    : '';

  return (
    <Flex vertical gap={16}>
      <Card size="small">
        <Flex justify="space-between" align="center" gap={12} wrap>
          <Space wrap>
            <Input.Search
              allowClear
              placeholder="搜索企业名称、代码或子域名"
              style={{ width: 280 }}
              onSearch={(value) => {
                setKeyword(value.trim());
                setPageNum(1);
              }}
              onChange={(event) => {
                if (!event.target.value) {
                  setKeyword('');
                  setPageNum(1);
                }
              }}
            />
            <Select
              value={status ?? ''}
              style={{ width: 140 }}
              options={TENANT_STATUS_FILTER_OPTIONS}
              onChange={(value) => {
                setStatus(value || undefined);
                setPageNum(1);
              }}
            />
          </Space>
          <Space>
            <Button onClick={() => void load()} loading={loading} autoInsertSpace={false}>刷新</Button>
            <Button type="primary" onClick={openCreate}>创建企业</Button>
          </Space>
        </Flex>
      </Card>

      <Card title="企业列表">
        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={rows}
          scroll={{ x: 920 }}
          locale={{ emptyText: '暂无企业' }}
          pagination={{
            current: pageNum,
            pageSize,
            total,
            showSizeChanger: true,
            showTotal: (value) => `共 ${value} 家企业`,
            onChange: (nextPage, nextPageSize) => {
              setPageNum(nextPageSize !== pageSize ? 1 : nextPage);
              setPageSize(nextPageSize);
            },
          }}
        />
      </Card>

      <TenantDetailDrawer
        tenant={detailTenant}
        open={detailTenant !== null}
        onClose={() => setDetailTenant(null)}
        onChanged={() => void load()}
      />

      <Modal
        title="创建企业"
        open={createOpen}
        confirmLoading={creating}
        onCancel={() => setCreateOpen(false)}
        onOk={() => void createTenant()}
        okText="创建企业"
        width={640}
      >
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          title="新企业会复制系统模板的组织、角色、菜单和权限"
          description="默认管理员账号为 admin / 123456，首次登录后会要求绑定平台账号。请在交付前修改默认密码。"
        />
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="code"
                label="企业代码"
                tooltip="企业代码公开可见，同时作为默认子域名"
                rules={[
                  { required: true, message: '请输入企业代码' },
                  { pattern: /^[a-z][a-z0-9-]*$/, message: '以小写字母开头，仅含小写字母、数字和连字符' },
                ]}
              >
                <Input placeholder="acme" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="name" label="企业名称" rules={[{ required: true, message: '请输入企业名称' }]}>
                <Input placeholder="Acme Inc." />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="subdomain"
                label="子域名"
                rules={[
                  { required: true, message: '请输入子域名' },
                  { pattern: /^[a-z][a-z0-9-]*$/, message: '以小写字母开头，仅含小写字母、数字和连字符' },
                ]}
              >
                <Input addonAfter={baseDomain ? `.${baseDomain}` : undefined} placeholder="acme" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="contactEmail" label="联系邮箱" rules={[{ type: 'email', message: '邮箱格式不正确' }]}>
                <Input placeholder="admin@acme.com" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="adminUsername"
                label="租户管理员用户名"
                tooltip="留空使用默认账号 admin；修改用户名时必须同时设置密码"
              >
                <Input placeholder="admin" autoComplete="off" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="adminPassword" label="租户管理员密码" tooltip="留空使用默认密码 123456">
                <Input.Password placeholder="123456" autoComplete="new-password" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="adminEmail" label="管理员邮箱" rules={[{ type: 'email', message: '邮箱格式不正确' }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="adminPhone" label="管理员手机号">
                <Input />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      <Modal
        title={`邀请成员${inviteTarget ? ` · ${inviteTarget.name}` : ''}`}
        open={inviteTarget !== null}
        confirmLoading={inviting}
        onCancel={() => { setInviteTarget(null); setInvitationToken(''); }}
        onOk={() => {
          if (invitationToken) {
            setInviteTarget(null);
            setInvitationToken('');
            return;
          }
          void submitInvitation();
        }}
        okText={invitationToken ? '关闭' : '生成邀请'}
      >
        {invitationToken ? (
          <Alert
            type="success"
            showIcon
            title="邀请已生成"
            description={(
              <Space direction="vertical" style={{ width: '100%' }} size={8}>
                <Typography.Text>令牌 7 天内有效，仅在本次展示，请通过可信渠道交付给受邀人：</Typography.Text>
                <Typography.Paragraph copyable={{ text: invitationToken }} style={{ wordBreak: 'break-all', marginBottom: 0 }}>
                  {invitationToken}
                </Typography.Paragraph>
                {inviteUrl ? (
                  <>
                    <Typography.Text>邀请链接：</Typography.Text>
                    <Typography.Paragraph copyable={{ text: inviteUrl }} style={{ wordBreak: 'break-all', marginBottom: 0 }}>
                      {inviteUrl}
                    </Typography.Paragraph>
                  </>
                ) : null}
              </Space>
            )}
          />
        ) : (
          <Form form={inviteForm} layout="vertical">
            <Form.Item label="受邀人" required>
              <Typography.Text type="secondary">至少填写邮箱或手机号其中一项。</Typography.Text>
            </Form.Item>
            <Form.Item name="email" label="邮箱" rules={[{ type: 'email', message: '邮箱格式不正确' }]}>
              <Input placeholder="member@acme.com" />
            </Form.Item>
            <Form.Item name="phone" label="手机号">
              <Input placeholder="手机号" />
            </Form.Item>
          </Form>
        )}
      </Modal>
    </Flex>
  );
}
