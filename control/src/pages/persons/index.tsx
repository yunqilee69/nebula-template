import { Alert, App, Button, Card, Descriptions, Drawer, Flex, Input, Select, Space, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useCallback, useEffect, useState } from 'react';
import { personApi } from '@/api/persons';
import { tenantStatusMeta } from '@/pages/tenants/status';
import type { PersonTenant, PlatformPerson } from '@/types';
import { PERSON_STATUS_OPTIONS, linkStatusMeta, personStatusMeta } from './status';

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

export function PersonsPage() {
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
      const page = await personApi.page({
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
      message.error(error instanceof Error ? error.message : '加载全局用户失败');
    } finally {
      setLoading(false);
    }
  }, [keyword, message, pageNum, pageSize, status]);

  useEffect(() => {
    void load();
  }, [load]);

  const columns: ColumnsType<PlatformPerson> = [
    {
      title: '平台账号',
      width: 220,
      render: (_, person) => (
        <div>
          <Space size={6}>
            <Typography.Text strong>{person.displayName || person.username}</Typography.Text>
            {person.platformAdmin ? <Tag color="blue">超级管理员</Tag> : null}
          </Space>
          <div><Typography.Text type="secondary">{person.username}</Typography.Text></div>
        </div>
      ),
    },
    {
      title: '关联企业',
      width: 110,
      render: (_, person) => `${person.tenantCount ?? 0} 家`,
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
      width: 90,
      fixed: 'right',
      render: (_, person) => (
        <Button type="link" size="small" onClick={() => setDetail(person)}>详情</Button>
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
    <div className="control-page">
      <Alert
        type="info"
        showIcon
        title="全局用户由租户登录、平台账号绑定和成员邀请流程自动产生"
        description="控制平面负责查询平台账号及其关联企业。邮箱和手机号仅作为信息字段展示，不用于控制平面登录；控制平面只支持账号 + 密码。"
      />

      <Card>
        <div className="control-table-toolbar">
          <Space wrap>
            <Input.Search
              allowClear
              placeholder="搜索用户名或展示名"
              style={{ width: 330 }}
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
              placeholder="账号状态"
              style={{ width: 150 }}
              value={status}
              options={PERSON_STATUS_OPTIONS}
              onChange={(value) => {
                setStatus(value);
                setPageNum(1);
              }}
            />
          </Space>
          <Button onClick={() => void load()} loading={loading}>刷新</Button>
        </div>

        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={rows}
          scroll={{ x: 1120 }}
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

      <Flex justify="space-between" wrap gap={12}>
        <Typography.Text type="secondary">
          全局用户是跨企业的平台身份，只用于识别“你是谁”，不携带任何租户权限。
        </Typography.Text>
      </Flex>

      <Drawer
        title="全局用户详情"
        width={960}
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
                { key: 'platformAdmin', label: '超级管理员', children: detail.platformAdmin ? '是' : '否' },
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
                scroll={{ x: 950 }}
                locale={{ emptyText: '该平台账号尚未关联任何企业' }}
              />
            </div>
          </Flex>
        ) : null}
      </Drawer>
    </div>
  );
}
