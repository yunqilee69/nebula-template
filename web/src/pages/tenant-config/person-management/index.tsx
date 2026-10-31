import { App, Button, Card, Descriptions, Drawer, Flex, Input, Select, Space, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useCallback, useEffect, useState } from 'react';
import { personService } from '@/api/person';
import type { PlatformPerson, PersonTenant } from '@/types/auth';
import { tenantStatusMeta } from '../tenant-management/tenant-status';
import { linkStatusMeta, personStatusMeta } from './person-status';

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

export function PlatformPersonManagementPage() {
  const { message } = App.useApp();
  const [rows, setRows] = useState<PlatformPerson[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [pageNum, setPageNum] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [detail, setDetail] = useState<PlatformPerson | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const page = await personService.platformPersonsPage({
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
      console.error('Load platform persons failed', error);
      message.error('加载用户列表失败');
    } finally {
      setLoading(false);
    }
  }, [keyword, message, pageNum, pageSize, status]);

  useEffect(() => { void load(); }, [load]);

  const columns: ColumnsType<PlatformPerson> = [
    {
      title: '平台账号',
      width: 200,
      render: (_, person) => (
        <div>
          <Space size={6}>
            <Typography.Text strong>{person.displayName || person.username}</Typography.Text>
            {person.platformAdmin ? <Tag color="blue">管理员</Tag> : null}
          </Space>
          <div><Typography.Text type="secondary">{person.username}</Typography.Text></div>
        </div>
      ),
    },
    {
      title: '关联企业',
      width: 110,
      render: (_, person) => (
        <Typography.Text>{person.tenantCount ?? 0} 家</Typography.Text>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (value: string) => {
        const meta = personStatusMeta(value);
        return <Tag color={meta.color}>{meta.label}</Tag>;
      },
    },
    {
      title: '最近登录',
      dataIndex: 'lastLoginTime',
      width: 160,
      render: (value?: string) => (value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '-'),
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      width: 160,
      render: (value?: string) => (value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '-'),
    },
    {
      title: '操作',
      width: 100,
      fixed: 'right',
      render: (_, person) => (
        <Button type="link" size="small" onClick={() => setDetail(person)} autoInsertSpace={false}>详情</Button>
      ),
    },
  ];

  const tenantColumns: ColumnsType<PersonTenant> = [
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
      title: '企业状态',
      dataIndex: 'status',
      width: 100,
      render: (value: string) => {
        const meta = tenantStatusMeta(value);
        return <Tag color={meta.color}>{meta.label}</Tag>;
      },
    },
    {
      title: '企业内账号',
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
      width: 160,
      render: (_, tenant) => <TagList values={tenant.roleNames} />,
    },
    {
      title: '组织',
      width: 160,
      render: (_, tenant) => <TagList values={tenant.orgNames} />,
    },
    {
      title: '关联状态',
      width: 100,
      render: (_, tenant) => {
        const meta = linkStatusMeta(tenant.linkStatus);
        return <Tag color={meta.color}>{meta.label}</Tag>;
      },
    },
    {
      title: '关联时间',
      dataIndex: 'linkedAt',
      width: 160,
      render: (value?: string) => (value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '-'),
    },
  ];

  return (
    <Flex vertical gap={16}>
      <Card title="用户管理">
        <Flex gap={12} wrap style={{ marginBottom: 16 }}>
          <Input.Search
            allowClear
            placeholder="搜索用户名或展示名"
            style={{ width: 320 }}
            onSearch={(value) => {
              setPageNum(1);
              setKeyword(value.trim());
            }}
          />
          <Select
            allowClear
            placeholder="账号状态"
            style={{ width: 140 }}
            value={status}
            onChange={(value) => {
              setPageNum(1);
              setStatus(value);
            }}
            options={[
              { label: '正常', value: 'ACTIVE' },
              { label: '已停用', value: 'DISABLED' },
              { label: '已锁定', value: 'LOCKED' },
            ]}
          />
          <Button onClick={() => void load()} loading={loading} autoInsertSpace={false}>刷新</Button>
        </Flex>
        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={rows}
          scroll={{ x: 820 }}
          pagination={{
            current: pageNum,
            pageSize,
            total,
            showSizeChanger: true,
            showTotal: (value) => `共 ${value} 个平台账号`,
            onChange: (nextPage, nextPageSize) => {
              setPageNum(nextPageSize !== pageSize ? 1 : nextPage);
              setPageSize(nextPageSize);
            },
          }}
          locale={{ emptyText: '暂无平台账号' }}
        />
      </Card>

      <Drawer
        title="账号详情"
        width={920}
        open={detail !== null}
        onClose={() => setDetail(null)}
        destroyOnHidden
      >
        {detail ? (
          <Flex vertical gap={24}>
            <Descriptions
              title="平台账号"
              bordered
              size="small"
              column={2}
              items={[
                { key: 'username', label: '用户名', children: detail.username },
                { key: 'displayName', label: '展示名', children: detail.displayName || '-' },
                { key: 'status', label: '状态', children: personStatusMeta(detail.status).label },
                { key: 'platformAdmin', label: '平台管理员', children: detail.platformAdmin ? '是' : '否' },
                { key: 'tenantCount', label: '关联企业', children: `${detail.tenantCount ?? 0} 家` },
                {
                  key: 'lastLoginTime',
                  label: '最近登录',
                  children: detail.lastLoginTime ? dayjs(detail.lastLoginTime).format('YYYY-MM-DD HH:mm') : '-',
                },
                {
                  key: 'createTime',
                  label: '创建时间',
                  children: detail.createTime ? dayjs(detail.createTime).format('YYYY-MM-DD HH:mm') : '-',
                },
              ]}
            />
            <div>
              <Typography.Title level={5} style={{ marginTop: 0 }}>关联企业</Typography.Title>
              <Table
                rowKey="tenantId"
                size="small"
                columns={tenantColumns}
                dataSource={detail.tenants ?? []}
                pagination={false}
                scroll={{ x: 940 }}
                locale={{ emptyText: '该平台账号尚未关联任何企业' }}
              />
            </div>
          </Flex>
        ) : null}
      </Drawer>
    </Flex>
  );
}
