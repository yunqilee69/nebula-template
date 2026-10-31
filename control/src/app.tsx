import { Button, Result, Spin } from 'antd';
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/auth-context';
import { ControlLayout } from '@/layouts/control-layout';
import { DashboardPage } from '@/pages/dashboard';
import { LoginPage } from '@/pages/login';
import { PersonsPage } from '@/pages/persons';
import { TenantsPage } from '@/pages/tenants';

function SessionBoot() {
  return (
    <div className="control-boot">
      <Spin size="large" />
      <span className="control-boot__text">正在校验控制台会话…</span>
    </div>
  );
}

function ForbiddenPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="control-boot">
      <Result
        status="403"
        title="无权访问控制台"
        subTitle="控制平面只允许超级管理员登录。请使用具备超级管理员身份的平台账号。"
        extra={(
          <Button
            type="primary"
            onClick={async () => {
              await logout();
              navigate('/login', { replace: true });
            }}
          >
            返回登录
          </Button>
        )}
      />
    </div>
  );
}

function ProtectedLayout() {
  const { status, user } = useAuth();

  if (status === 'booting') return <SessionBoot />;
  if (status !== 'authenticated' || !user) return <Navigate to="/login" replace />;
  if (!user.platformAdmin) return <ForbiddenPage />;

  return <ControlLayout />;
}

export function ControlApp() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="tenants" element={<TenantsPage />} />
          <Route path="persons" element={<PersonsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
