import {
  ApartmentOutlined,
  ArrowRightOutlined,
  CheckCircleOutlined,
  StopOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { Alert, App, Button, Card, Col, Flex, Row, Space, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { personApi } from '@/api/persons';
import { tenantApi } from '@/api/tenants';
import { buildTenantEntryUrl, tenantHost } from '@/lib/tenant-entry';
import type { Tenant } from '@/types';
import { tenantStatusMeta } from '@/pages/tenants/status';

interface Overview {
  tenantTotal: number;
  activeTotal: number;
  suspendedTotal: number;
  personTotal: number;
  recentTenants: Tenant[];
}

const initialOverview: Overview = {
  tenantTotal: 0,
  activeTotal: 0,
  suspendedTotal: 0,
  personTotal: 0,
  recentTenants: [],
};

const statCards = [
  { key: 'tenantTotal', label: '企业总数', icon: <ApartmentOutlined />, color: '#1d4ed8', background: '#dbeafe' },
  { key: 'activeTotal', label: '正常企业', icon: <CheckCircleOutlined />, color: '#047857', background: '#d1fae5' },
  { key: 'suspendedTotal', label: '已停用企业', icon: <StopOutlined />, color: '#b45309', background: '#fef3c7' },
  { key: 'personTotal', label: '全局用户', icon: <TeamOutlined />, color: '#7c3aed', background: '#ede9fe' },
] as const;

export function DashboardPage() {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [overview, setOverview] = useState<Overview>(initialOverview);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tenantPage, activePage, suspendedPage, personPage] = await Promise.all([
        tenantApi.page({ pageNum: 1, pageSize: 5 }),
        tenantApi.page({ pageNum: 1, pageSize: 1, status: 'ACTIVE' }),
        tenantApi.page({ pageNum: 1, pageSize: 1, status: 'SUSPENDED' }),
        personApi.page({ pageNum: 1, pageSize: 1 }),
      ]);

      setOverview({
        tenantTotal: tenantPage.total,
        activeTotal: activePage.total,
        suspendedTotal: suspendedPage.total,
        personTotal: personPage.total,
        recentTenants: tenantPage.data,
      });
    } catch (error) {
      message.error(error instanceof Error ? error.message : '加载控制台概览失败');
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    void load();
  }, [load]);

  const columns: ColumnsType<Tenant> = [
    {
      title: '企业',
      render: (_, tenant) => (
        <div>
          <Typography.Text strong>{tenant.name}</Typography.Text>
          <div><Typography.Text type="secondary">{tenant.code}</Typography.Text></div>
        </div>
      ),
    },
    {
      title: '入口',
      render: (_, tenant) => {
        const url = buildTenantEntryUrl(tenant.code);
        return url
          ? <Typography.Text type="secondary">{tenantHost(url)}</Typography.Text>
          : <Typography.Text type="secondary">{tenant.code}</Typography.Text>;
      },
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
  ];

  return (
    <div className="control-page">
      <div className="control-page__hero">
        <div>
          <Typography.Title level={3} className="control-page__hero-title">平台控制面</Typography.Title>
          <Typography.Paragraph className="control-page__hero-desc">
            控制平面只承载平台级操作：企业生命周期、域名、成员邀请与全局账号查询。
            租户业务数据与租户管理仍在各自的数据平面内完成。
          </Typography.Paragraph>
        </div>
        <Space>
          <Button ghost icon={<ApartmentOutlined />} onClick={() => navigate('/tenants')}>
            企业管理
          </Button>
          <Button ghost icon={<TeamOutlined />} onClick={() => navigate('/persons')}>
            全局用户
          </Button>
        </Space>
      </div>

      <Row gutter={[16, 16]}>
        {statCards.map((card) => (
          <Col key={card.key} xs={24} sm={12} xl={6}>
            <Card className="control-stat" bordered={false}>
              <span
                className="control-stat__icon"
                style={{ color: card.color, background: card.background }}
              >
                {card.icon}
              </span>
              <div>
                <div className="control-stat__value">{overview[card.key]}</div>
                <div className="control-stat__label">{card.label}</div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {!loading && overview.tenantTotal === 0 ? (
        <Alert
          type="info"
          showIcon
          title="还没有企业"
          description="进入「企业管理」创建第一家企业。新企业会复制系统模板的组织、角色、菜单与权限。"
          action={(
            <Button size="small" type="primary" onClick={() => navigate('/tenants')}>
              创建企业
            </Button>
          )}
        />
      ) : null}

      <Card
        title="最近创建的企业"
        extra={(
          <Button type="link" onClick={() => navigate('/tenants')}>
            查看全部 <ArrowRightOutlined />
          </Button>
        )}
      >
        <Table
          rowKey="id"
          size="middle"
          loading={loading}
          columns={columns}
          dataSource={overview.recentTenants}
          pagination={false}
          locale={{ emptyText: '暂无企业' }}
        />
      </Card>

      <Flex justify="space-between" align="center" wrap gap={12}>
        <Typography.Text type="secondary">
          控制平面与企业数据平面使用独立的登录入口和本地令牌存储，不共享租户会话。
        </Typography.Text>
        <Button type="text" onClick={() => void load()} loading={loading}>刷新概览</Button>
      </Flex>
    </div>
  );
}
