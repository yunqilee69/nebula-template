import { fireEvent, render, screen } from '@testing-library/react';
import { App as AntdApp, ConfigProvider } from 'antd';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authApi } from '@/api/auth';
import { AuthProvider } from '@/auth/auth-context';
import { LoginPage } from './index';

vi.mock('@/api/auth', () => ({
  authApi: {
    login: vi.fn(),
    currentUser: vi.fn(),
    logout: vi.fn(),
  },
}));

const mockedAuthApi = vi.mocked(authApi);

function renderLogin() {
  return render(
    <ConfigProvider>
      <AntdApp>
        <AuthProvider>
          <MemoryRouter initialEntries={['/login']}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/" element={<div>control home</div>} />
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      </AntdApp>
    </ConfigProvider>,
  );
}

async function submitCredentials(username: string, password: string) {
  fireEvent.change(await screen.findByPlaceholderText('superadmin'), { target: { value: username } });
  fireEvent.change(screen.getByPlaceholderText('请输入密码'), { target: { value: password } });
  fireEvent.click(screen.getByRole('button', { name: '进入控制台' }));
}

describe('LoginPage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    mockedAuthApi.logout.mockResolvedValue(undefined);
  });

  it('logs in a super admin with username and password', async () => {
    mockedAuthApi.login.mockResolvedValue({ accessToken: 'access', refreshToken: 'refresh' });
    mockedAuthApi.currentUser.mockResolvedValue({
      personId: 'person-1',
      sessionType: 'PLATFORM',
      username: 'superadmin',
      platformAdmin: true,
    });

    renderLogin();
    await submitCredentials('superadmin', '123456');

    expect(await screen.findByText('control home')).toBeInTheDocument();
    expect(mockedAuthApi.login).toHaveBeenCalledWith({ username: 'superadmin', password: '123456' });
    expect(localStorage.getItem('nebula-control.access-token')).toBe('access');
  });

  it('rejects a non super admin and clears the local session', async () => {
    mockedAuthApi.login.mockResolvedValue({ accessToken: 'access', refreshToken: 'refresh' });
    mockedAuthApi.currentUser.mockResolvedValue({
      personId: 'person-1',
      sessionType: 'PLATFORM',
      username: 'tenant-user',
      platformAdmin: false,
    });

    renderLogin();
    await submitCredentials('tenant-user', '123456');

    expect(await screen.findByText('该账号不是超级管理员，无权登录控制台。')).toBeInTheDocument();
    expect(mockedAuthApi.logout).toHaveBeenCalled();
    expect(localStorage.getItem('nebula-control.access-token')).toBeNull();
  });
});
