import {
  App,
  Button,
  Card,
  Descriptions,
  Drawer,
  Flex,
  Popconfirm,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useCallback, useEffect, useState } from 'react';
import { personService } from '@/api/person';
import { useNebulaLoginBadge } from '@/providers/login-badge-provider';
import { useAuthStore } from '@/stores/auth-store';
import type { PersonLink, PersonTenant } from '@/types/auth';
import { clearAuthTokens } from '@/utils/auth/token-session';
import { buildTenantUrl, getTenantCode } from '@/utils/tenant/tenant-host';
import { tenantStatusMeta } from '@/pages/tenant-config/tenant-management/tenant-status';
import { linkStatusMeta } from '@/pages/tenant-config/person-management/person-status';

function userStatusLabel(status?: number) {
  if (status === 1) return { label: '启用', color: 'green' };
  if (status === 0) return { label: '禁用', color: 'red' };
  return { label: '-', color: 'default' };
}

function TagList({ values }: { values?: string[] }) {
  if (!values?.length) {
    return <Typography.Text type="secondary">-</Typography.Text>;
  }
  return (
    <Space size={[4, 4]} wrap>
      {values.map((value) => <Tag key={value}>{value}</Tag>)}
    </Space>
  );
}

export function TenantsPanel() {
  const { message } = App.useApp();
  const loginBadge = useNebulaLoginBadge();
  const clearUser = useAuthStore((state) => state.clearUser);
  const [tenants, setTenants] = useState<PersonTenant[]>([]);
  const [links, setLinks] = useState<PersonLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<PersonTenant | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [nextTenants, nextLinks] = await Promise.all([personService.tenants(), personService.links()]);
      setTenants(nextTenants);
      setLinks(nextLinks);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const columns: ColumnsType<PersonTenant> = [
    {
      title: '企业',
      width: 160,
      render: (_, tenant) => (
        <div>
          <Typography.Text strong>{tenant.name}</Typography.Text>
          <div><Typography.Text type="secondary">{tenant.code}</Typography.Text></div>
        </div>
      ),
    },
    {
      title: '我的账号',
      width: 190,
      render: (_, tenant) => {
        if (!tenant.username && !tenant.nickname) {
          return <Typography.Text type="secondary">未绑定</Typography.Text>;
        }
        return (
          <div>
            <Typography.Text>{tenant.nickname || tenant.username}</Typography.Text>
            {tenant.nickname && tenant.username ? (
              <div><Typography.Text type="secondary">{tenant.username}</Typography.Text></div>
            ) : null}
          </div>
        );
      },
    },
    {
      title: '角色',
      width: 150,
      render: (_, tenant) => <TagList values={tenant.roleNames} />,
    },
    {
      title: '组织',
      width: 150,
      render: (_, tenant) => <TagList values={tenant.orgNames} />,
    },
    {
      title: '企业状态',
      dataIndex: 'status',
      width: 90,
      render: (status: string) => {
        const meta = tenantStatusMeta(status);
        return <Tag color={meta.color}>{meta.label}</Tag>;
      },
    },
    {
      title: '关联时间',
      dataIndex: 'linkedAt',
      width: 160,
      render: (value?: string) => (value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '-'),
    },
    {
      title: '操作',
      width: 210,
      fixed: 'right',
      render: (_, tenant) => {
        const url = buildTenantUrl(tenant);
        return (
          <Space size={2} wrap>
            <Button type="link" size="small" onClick={() => setDetail(tenant)} autoInsertSpace={false}>详情</Button>
            <Button
              type="link"
              size="small"
              disabled={!url || tenant.status !== 'ACTIVE'}
              onClick={() => { if (url) window.location.href = url; }}
            >
              进入企业
            </Button>
            <Popconfirm
              title="解除该企业的账号关联？"
              description="解除后需要重新完成该企业的绑定流程。"
              onConfirm={async () => {
                const link = links.find((item) => item.tenantId === tenant.tenantId && item.linkStatus === 'ACTIVE');
                if (link) {
                  await personService.revokeLink(link.id);
                  message.success('已解除关联');
                }
                await load();
              }}
            >
              <Button
                type="link"
                size="small"
                danger
                disabled={
                  tenant.code === getTenantCode()
                  || !links.some((item) => item.tenantId === tenant.tenantId && item.linkStatus === 'ACTIVE')
                }
              >
                解除关联
              </Button>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  const detailUrl = detail ? buildTenantUrl(detail) : null;
  const detailLinkStatus = linkStatusMeta(detail?.linkStatus);
  const detailUserStatus = userStatusLabel(detail?.userStatus);

  return (
    <Flex vertical gap={16}>
      <Card
        title="我的企业"
        extra={(
          <Space size={8}>
            <Button onClick={() => void load()} loading={loading} autoInsertSpace={false}>刷新</Button>
            <Popconfirm
              title="退出该平台账号在所有企业的登录？"
              description="该账号在所有企业中的会话都会失效，需要用账号重新登录。"
              onConfirm={async () => {
                await personService.logoutAll();
                clearAuthTokens();
                clearUser();
                window.location.replace(loginBadge.loginPath);
              }}
            >
              <Button danger autoInsertSpace={false}>退出所有企业</Button>
            </Popconfirm>
          </Space>
        )}
      >
        <Table
          rowKey="tenantId"
          loading={loading}
          columns={columns}
          dataSource={tenants}
          pagination={false}
          scroll={{ x: 1100 }}
          locale={{ emptyText: '暂无已关联企业' }}
        />
        <Typography.Paragraph type="secondary" style={{ marginTop: 16, marginBottom: 0 }}>
          平台账号不共享企业内的权限和登录态：进入目标企业后如该子域名下没有有效会话，需要重新登录；也可以直接访问「企业代码.你的域名」进入对应企业。
        </Typography.Paragraph>
      </Card>

      <Drawer
        title={detail ? `企业详情 · ${detail.name}` : '企业详情'}
        width={560}
        open={detail !== null}
        onClose={() => setDetail(null)}
        destroyOnHidden
      >
        {detail ? (
          <Flex vertical gap={24}>
            <Descriptions
              title="企业信息"
              bordered
              size="small"
              column={1}
              items={[
                { key: 'name', label: '企业名称', children: detail.name },
                { key: 'code', label: '企业代码', children: detail.code },
                {
                  key: 'status',
                  label: '企业状态',
                  children: (() => {
                    const meta = tenantStatusMeta(detail.status);
                    return <Tag color={meta.color}>{meta.label}</Tag>;
                  })(),
                },
                {
                  key: 'url',
                  label: '访问地址',
                  children: detailUrl ? (
                    <Typography.Link href={detailUrl} target="_blank" rel="noreferrer">{new URL(detailUrl).host}</Typography.Link>
                  ) : '-',
                },
                {
                  key: 'linkStatus',
                  label: '关联状态',
                  children: <Tag color={detailLinkStatus.color}>{detailLinkStatus.label}</Tag>,
                },
                {
                  key: 'linkedAt',
                  label: '关联时间',
                  children: detail.linkedAt ? dayjs(detail.linkedAt).format('YYYY-MM-DD HH:mm') : '-',
                },
              ]}
            />

            <Descriptions
              title="我的企业账号"
              bordered
              size="small"
              column={1}
              items={[
                { key: 'username', label: '用户名', children: detail.username || '-' },
                { key: 'nickname', label: '昵称', children: detail.nickname || '-' },
                { key: 'email', label: '邮箱', children: detail.email || '-' },
                { key: 'phone', label: '手机号', children: detail.phone || '-' },
                {
                  key: 'userStatus',
                  label: '账号状态',
                  children: <Tag color={detailUserStatus.color}>{detailUserStatus.label}</Tag>,
                },
                {
                  key: 'roleNames',
                  label: '角色',
                  children: <TagList values={detail.roleNames} />,
                },
                {
                  key: 'orgNames',
                  label: '组织',
                  children: <TagList values={detail.orgNames} />,
                },
              ]}
            />
          </Flex>
        ) : null}
      </Drawer>
    </Flex>
  );
}
