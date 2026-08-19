import { render, screen, waitFor } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ProfileService } from '@/api/profile';
import { NebulaProvider } from '@/providers/nebula-provider';
import { ProfileBindCallbackPage } from './index';

const redirectToAuthorizeUrl = vi.fn();

vi.mock('@/pages/login/wechat-redirect-navigation', () => ({
  redirectToAuthorizeUrl: (url: string) => redirectToAuthorizeUrl(url),
}));

function createService(overrides: Partial<ProfileService> = {}): ProfileService {
  return {
    getProfile: vi.fn(),
    updateProfile: vi.fn(),
    changePassword: vi.fn(),
    listOAuth2Bindings: vi.fn(),
    prepareOAuth2Bind: vi.fn(),
    bindOAuth2: vi.fn().mockResolvedValue({ bindingId: 'binding-1', status: 'BOUND' }),
    unbindOAuth2: vi.fn(),
    pageLoginRecords: vi.fn(),
    ...overrides,
  };
}

function renderCallbackPageView(initialEntry: string, service = createService()): { readonly service: ProfileService; readonly view: RenderResult } {
  const view = render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <NebulaProvider>
        <Routes>
          <Route path="/profile/bind-callback" element={<ProfileBindCallbackPage service={service} />} />
          <Route path="/profile/info" element={<div>Profile Home</div>} />
        </Routes>
      </NebulaProvider>
    </MemoryRouter>,
  );
  return { service, view };
}

function renderCallbackPage(initialEntry: string, service = createService()) {
  const { service: renderedService } = renderCallbackPageView(initialEntry, service);
  return renderedService;
}

describe('ProfileBindCallbackPage', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('binds the provider from callback parameters and navigates back to profile', async () => {
    const service = renderCallbackPage('/profile/bind-callback?provider=github&code=auth-code&state=state-token');

    await waitFor(() => {
      expect(service.bindOAuth2).toHaveBeenCalledWith({ providerId: 'github', code: 'auth-code', state: 'state-token' });
    });
    expect(await screen.findByText('Profile Home')).toBeInTheDocument();
  });

  it('reuses the same bind request when the callback route remounts with the same code and state', async () => {
    let resolveBind: (value: { readonly bindingId: string; readonly status: 'BOUND' }) => void = () => undefined;
    const service = createService({
      bindOAuth2: vi.fn().mockImplementation(() => new Promise((resolve) => {
        resolveBind = resolve;
      })),
    });

    const firstRender = renderCallbackPageView('/profile/bind-callback?provider=github&code=auth-code&state=state-token', service);

    await waitFor(() => {
      expect(service.bindOAuth2).toHaveBeenCalledTimes(1);
    });

    firstRender.view.unmount();
    renderCallbackPageView('/profile/bind-callback?provider=github&code=auth-code&state=state-token', service);

    await waitFor(() => {
      expect(service.bindOAuth2).toHaveBeenCalledTimes(1);
    });

    resolveBind({ bindingId: 'binding-1', status: 'BOUND' });

    expect(await screen.findByText('Profile Home')).toBeInTheDocument();
  });

  it('asks for confirmation before moving a binding from another account', async () => {
    const user = userEvent.setup();
    const service = createService({
      bindOAuth2: vi
        .fn()
        .mockResolvedValueOnce({ bindingId: null, status: 'TAKEOVER_CONFIRMATION_REQUIRED' })
        .mockResolvedValueOnce({ bindingId: 'binding-1', status: 'BOUND' }),
    });
    renderCallbackPage('/profile/bind-callback?provider=github&code=auth-code&state=state-token', service);

    expect((await screen.findAllByText('确认转移第三方账号绑定？')).length).toBeGreaterThan(0);
    expect(service.bindOAuth2).toHaveBeenCalledWith({ providerId: 'github', code: 'auth-code', state: 'state-token' });

    await user.click(screen.getByRole('button', { name: /确\s*认/ }));

    await waitFor(() => {
      expect(service.bindOAuth2).toHaveBeenCalledWith({ providerId: 'github', code: 'auth-code', state: 'state-token', takeover: true });
    });
    expect(await screen.findByText('Profile Home')).toBeInTheDocument();
  });

  it('shows an error when callback parameters are missing', async () => {
    renderCallbackPage('/profile/bind-callback?provider=github');

    expect(await screen.findByTestId('profile-bind-callback-error')).toHaveTextContent('第三方授权回调参数缺失，请重新发起绑定。');
    expect(screen.getAllByText('返回个人信息')).toHaveLength(1);
  });

  it('starts a fresh authorization when binding fails with an expired provider code', async () => {
    const user = userEvent.setup();
    const service = createService({
      bindOAuth2: vi.fn().mockRejectedValue(new Error('The code passed is incorrect or expired.')),
      prepareOAuth2Bind: vi.fn().mockResolvedValue({ providerId: 'github', state: 'next-state', authorizeUrl: 'https://github.com/login/oauth/authorize?state=next-state' }),
    });
    renderCallbackPage('/profile/bind-callback?provider=github&code=expired-code&state=state-token', service);

    expect(await screen.findByTestId('profile-bind-callback-error')).toHaveTextContent('第三方账号绑定失败，请重新发起绑定。');
    expect(screen.getAllByText('返回个人信息')).toHaveLength(1);

    await user.click(screen.getByRole('button', { name: '重新绑定' }));

    await waitFor(() => {
      expect(service.prepareOAuth2Bind).toHaveBeenCalledWith({ providerId: 'github' });
    });
    expect(redirectToAuthorizeUrl).toHaveBeenCalledWith('https://github.com/login/oauth/authorize?state=next-state');
  });
});
