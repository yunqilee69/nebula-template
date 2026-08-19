import { render, screen } from '@testing-library/react';
import { useEffect } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { NebulaProvider } from '@/providers/nebula-provider';
import { useNebulaLoginBadge } from './login-badge-provider';
import type { NebulaExtraLoginBadgeRenderContext, NebulaLoginBadgeContextValue } from '@/types/auth';

function LoginBadgeProbe() {
  const loginBadge = useNebulaLoginBadge();
  return (
    <div>
      <span data-testid="login-path">{loginBadge.loginPath}</span>
      <span data-testid="register-path">{loginBadge.registerPath}</span>
      <span data-testid="extra-badges">{loginBadge.extraLoginBadges.map((m) => m.key).join(',')}</span>
    </div>
  );
}

describe('Nebula login badge context', () => {
  it('provides defaults when NebulaProvider has no loginBadge prop', () => {
    render(
      <NebulaProvider>
        <LoginBadgeProbe />
      </NebulaProvider>,
    );

    expect(screen.getByTestId('login-path').textContent).toBe('/login');
    expect(screen.getByTestId('register-path').textContent).toBe('/register');
    expect(screen.getByTestId('extra-badges').textContent).toBe('');
  });

  it('exposes project-provided extra login badges from NebulaProvider', () => {
    render(
      <NebulaProvider
        loginBadge={{
          extraLoginBadges: [
            {
              key: 'sso',
              label: '企业 SSO',
              render: (_ctx: NebulaExtraLoginBadgeRenderContext) => (
                <button type="button">企业 SSO 登录</button>
              ),
            },
          ],
        }}
      >
        <LoginBadgeProbe />
      </NebulaProvider>,
    );

    expect(screen.getByTestId('extra-badges').textContent).toBe('sso');
  });

  it('supports custom login and register paths', () => {
    render(
      <NebulaProvider loginBadge={{ loginPath: '/auth/sign-in', registerPath: '/auth/sign-up' }}>
        <LoginBadgeProbe />
      </NebulaProvider>,
    );

    expect(screen.getByTestId('login-path').textContent).toBe('/auth/sign-in');
    expect(screen.getByTestId('register-path').textContent).toBe('/auth/sign-up');
  });

  it('passes loginBadge and onSuccess to extra badge render context', () => {
    function RenderProbe() {
      const loginBadge = useNebulaLoginBadge();
      const badge = loginBadge.extraLoginBadges[0];
      return <>{badge?.render({ onSuccess: () => {}, loginBadge })}</>;
    }

    render(
      <NebulaProvider
        loginBadge={{
          extraLoginBadges: [
            {
              key: 'sso',
              label: 'SSO',
              render: (ctx: NebulaExtraLoginBadgeRenderContext) => (
                <span data-testid="has-login-badge">{ctx.loginBadge ? 'yes' : 'no'}</span>
              ),
            },
          ],
        }}
      >
        <RenderProbe />
      </NebulaProvider>,
    );

    expect(screen.getByTestId('has-login-badge').textContent).toBe('yes');
  });

  it('keeps the resolved loginBadge context stable when an equivalent inline options object is rerendered', () => {
    const onContextChange = vi.fn<(value: NebulaLoginBadgeContextValue) => void>();

    function IdentityProbe() {
      const loginBadge = useNebulaLoginBadge();
      useEffect(() => {
        onContextChange(loginBadge);
      }, [loginBadge]);

      return null;
    }

    const { rerender } = render(
      <NebulaProvider loginBadge={{ loginPath: '/login' }}>
        <IdentityProbe />
      </NebulaProvider>,
    );

    expect(onContextChange).toHaveBeenCalledTimes(1);

    rerender(
      <NebulaProvider loginBadge={{ loginPath: '/login' }}>
        <IdentityProbe />
      </NebulaProvider>,
    );

    expect(onContextChange).toHaveBeenCalledTimes(1);
  });
});
