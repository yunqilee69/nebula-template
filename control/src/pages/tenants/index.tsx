import { App, Button, Card, Flex, Input, Popconfirm, Select, Space, Table, Tag, Tooltip, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useCallback, useEffect, useState } from 'react';
import { tenantApi } from '@/api/tenants';
import { useAuth } from '@/auth/auth-context';
import { buildTenantEntryUrl, tenantHost } from '@/lib/tenant-entry';
import type { Tenant } from '@/types';
import { InviteMemberModal } from './invite-member-modal';
import { TENANT_STATUS_OPTIONS, tenantStatusMeta } from './status';
import { TenantDetailDrawer } from './tenant-detail-drawer';
import { TenantFormModal } from './tenant-form-modal';

export function TenantsPage() {
  const { message } = App.useApp();
  const { user } = useAuth();
  const protectedTenantCode = user?.tenantCode;
  const [rows, setRows] = useState<Tenant[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [pageNum, setPageNum] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<string | undefined>(undefined);

  const [formOpen, setFormOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [detailTenant, setDetailTenant] = useState<Tenant | null>(null);
  const [inviteTarget, setInviteTarget] = useState<Tenant | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const page = await tenantApi.page({
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
    } catch (error) {
      message.error(error instanceof Error ? error.message : '加载企业列表失败');
    } finally {
      setLoading(false);
    }
  }, [keyword, message, pageNum, pageSize, status]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleStatus = async (tenant: Tenant) => {
    const next = tenant.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      await tenantApi.updateStatus(tenant.id, next);
      message.success(next === 'ACTIVE' ? '企业已启用' : '企业已停用');
      await load();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '更新企业状态失败');
    }
  };

  const removeTenant = async (tenant: Tenant) => {
    try {
      await tenantApi.remove(tenant.id);
      message.success('企业已删除');
      await load();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '删除企业失败');
    }
  };

  const openCreate = () => {
    setEditingTenant(null);
    setFormOpen(true);
  };

  const columns: ColumnsType<Tenant> = [
    {
      title: '企业',
      width: 200,
      render: (_, tenant) => (
        <div>
          <Space size={6}>
            <Typography.Text strong>{tenant.name}</Typography.Text>
            {tenant.code === protectedTenantCode ? <Tag color="blue">默认租户</Tag> : null}
          </Space>
          <div><Typography.Text type="secondary">{tenant.code}</Typography.Text></div>
        </div>
      ),
    },
    {
      title: '企业入口',
      width: 220,
      render: (_, tenant) => {
        const url = buildTenantEntryUrl(tenant.code);
        if (!url) {
          return <Typography.Text type="secondary">{tenant.code}</Typography.Text>;
        }
        if (tenant.status === 'DELETED') {
          return <Typography.Text type="secondary" delete>{tenantHost(url)}</Typography.Text>;
        }
        return (
          <Typography.Link href={url} target="_blank" rel="noreferrer">
            {tenantHost(url)}
          </Typography.Link>
        );
      },
    },
    {
      title: '联系邮箱',
      dataIndex: 'contactEmail',
      width: 200,
      render: (value?: string) => value || '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
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
      width: 320,
      fixed: 'right',
      render: (_, tenant) => {
        const protectedTenant = tenant.code === protectedTenantCode;
        const deleted = tenant.status === 'DELETED';
        const entryUrl = buildTenantEntryUrl(tenant.code);

        return (
          <Space size={2} wrap>
            <Button type="link" size="small" onClick={() => setDetailTenant(tenant)}>详情</Button>
            <Button
              type="link"
              size="small"
              disabled={!entryUrl || deleted}
              onClick={() => {
                if (entryUrl) window.open(entryUrl, '_blank', 'noopener,noreferrer');
              }}
            >
              打开
            </Button>
            <Button
              type="link"
              size="small"
              onClick={() => {
                setEditingTenant(tenant);
                setFormOpen(true);
              }}
            >
              编辑
            </Button>
            <Button type="link" size="small" disabled={deleted} onClick={() => setInviteTarget(tenant)}>
              邀请成员
            </Button>
            {deleted ? null : (
              <>
                <Tooltip title={protectedTenant ? '默认租户不能停用' : undefined}>
                  <Popconfirm
                    title={tenant.status === 'ACTIVE' ? `停用企业 ${tenant.name}？` : `启用企业 ${tenant.name}？`}
                    description={tenant.status === 'ACTIVE' ? '停用后该企业域名将无法登录。' : undefined}
                    disabled={protectedTenant}
                    onConfirm={() => void toggleStatus(tenant)}
                  >
                    <Button type="link" size="small" disabled={protectedTenant}>
                      {tenant.status === 'ACTIVE' ? '停用' : '启用'}
                    </Button>
                  </Popconfirm>
                </Tooltip>
                <Tooltip title={protectedTenant ? '默认租户不能删除' : undefined}>
                  <Popconfirm
                    title={`删除企业 ${tenant.name}？`}
                    description="删除后该企业域名立即失效，关联的平台账号会被解除，且不可恢复。"
                    okText="删除"
                    okButtonProps={{ danger: true }}
                    disabled={protectedTenant}
                    onConfirm={() => void removeTenant(tenant)}
                  >
                    <Button type="link" size="small" danger disabled={protectedTenant}>删除</Button>
                  </Popconfirm>
                </Tooltip>
              </>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <div className="control-page">
      <Card>
        <div className="control-table-toolbar">
          <Space wrap>
            <Input.Search
              allowClear
              placeholder="搜索企业名称、代码或子域名"
              style={{ width: 300 }}
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
              allowClear
              placeholder="全部状态"
              style={{ width: 150 }}
              value={status}
              options={TENANT_STATUS_OPTIONS}
              onChange={(value) => {
                setStatus(value);
                setPageNum(1);
              }}
            />
          </Space>
          <Space>
            <Button onClick={() => void load()} loading={loading}>刷新</Button>
            <Button type="primary" onClick={openCreate}>创建企业</Button>
          </Space>
        </div>

        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={rows}
          scroll={{ x: 1180 }}
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
          locale={{ emptyText: '暂无企业' }}
        />
      </Card>

      <Flex justify="space-between" wrap gap={12}>
        <Typography.Text type="secondary">
          企业停用后保留数据与关联关系，但企业域名不可登录；删除会撤销关联并停用域名。
        </Typography.Text>
      </Flex>

      <TenantFormModal
        open={formOpen}
        tenant={editingTenant}
        onCancel={() => setFormOpen(false)}
        onSuccess={() => {
          setFormOpen(false);
          setEditingTenant(null);
          void load();
        }}
      />

      <TenantDetailDrawer
        tenant={detailTenant}
        open={detailTenant !== null}
        onClose={() => setDetailTenant(null)}
        onChanged={() => void load()}
      />

      <InviteMemberModal
        tenant={inviteTarget}
        open={inviteTarget !== null}
        onClose={() => setInviteTarget(null)}
      />
    </div>
  );
}
