import {
  ApartmentOutlined,
  DashboardOutlined,
  LogoutOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { App, Avatar, Dropdown, Layout, Menu, Space, Tag, Typography } from 'antd';
import type { MenuProps } from 'antd';
import { useMemo } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/auth-context';

const { Header, Sider, Content } = Layout;

const pageTitles: Record<string, string> = {
  '/': '控制台概览',
  '/tenants': '企业管理',
  '/persons': '全局用户',
};

export function ControlLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { message } = App.useApp();

  const selectedKey = useMemo(() => {
    if (location.pathname.startsWith('/tenants')) return '/tenants';
    if (location.pathname.startsWith('/persons')) return '/persons';
    return '/';
  }, [location.pathname]);

  const menuItems: MenuProps['items'] = [
    { key: '/', icon: <DashboardOutlined />, label: '控制台概览' },
    { key: '/tenants', icon: <ApartmentOutlined />, label: '企业管理' },
    { key: '/persons', icon: <TeamOutlined />, label: '全局用户' },
  ];

  const userMenu: MenuProps['items'] = [
    {
      key: 'identity',
      icon: <SafetyCertificateOutlined />,
      label: '超级管理员',
      disabled: true,
    },
    { type: 'divider' },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
    },
  ];

  const handleUserMenuClick: MenuProps['onClick'] = async ({ key }) => {
    if (key !== 'logout') return;
    await logout();
    message.success('已退出控制台');
    navigate('/login', { replace: true });
  };

  return (
    <Layout className="control-shell">
      <Sider width={236} className="control-shell__sider" breakpoint="lg" collapsedWidth={0}>
        <div className="control-shell__brand">
          <span className="control-shell__logo">N</span>
          <div>
            <div className="control-shell__brand-name">NEBULA</div>
            <div className="control-shell__brand-sub">多租户控制平台</div>
          </div>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          className="control-shell__menu"
        />
        <div className="control-shell__sider-footer">
          <Tag color="blue" bordered={false}>CONTROL PLANE</Tag>
          <Typography.Text type="secondary" className="control-shell__sider-note">
            与租户数据平面分离部署
          </Typography.Text>
        </div>
      </Sider>

      <Layout>
        <Header className="control-shell__header">
          <div>
            <Typography.Title level={4} className="control-shell__page-title">
              {pageTitles[selectedKey] ?? '控制台'}
            </Typography.Title>
            <Typography.Text type="secondary" className="control-shell__tenant-note">
              当前控制租户：{user?.tenantName || user?.tenantCode || 'default'}
            </Typography.Text>
          </div>

          <Dropdown menu={{ items: userMenu, onClick: handleUserMenuClick }} placement="bottomRight" trigger={['click']}>
            <button type="button" className="control-shell__user">
              <Avatar size={34} icon={<UserOutlined />} src={user?.avatar || undefined} />
              <Space direction="vertical" size={0} className="control-shell__user-meta">
                <span className="control-shell__user-name">{user?.nickname || user?.username || '超级管理员'}</span>
                <span className="control-shell__user-role">superadmin</span>
              </Space>
            </button>
          </Dropdown>
        </Header>

        <Content className="control-shell__content">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
