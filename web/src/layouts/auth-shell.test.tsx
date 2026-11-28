import { act, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NebulaBrandProvider } from '@/providers/brand-context';
import { AuthShell } from './auth-shell';

class FakeImage {
  static instances: FakeImage[] = [];
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  private _src = '';

  constructor() {
    FakeImage.instances.push(this);
  }

  get src() {
    return this._src;
  }

  set src(value: string) {
    this._src = value;
  }
}

afterEach(() => {
  FakeImage.instances = [];
  vi.unstubAllGlobals();
});

describe('AuthShell styling', () => {
  it('uses a borderless centered panel with the brand content inside', () => {
    const { container } = render(
      <NebulaBrandProvider brand={{ name: 'Nebula Test' }}>
        <AuthShell>
          <button type="button">Login</button>
        </AuthShell>
      </NebulaBrandProvider>,
    );

    const shell = container.firstElementChild;

    expect(shell).toHaveClass('flex', 'min-h-dvh', 'flex-col');
    const panel = screen.getByTestId('auth-shell-panel');
    expect(panel).toContainElement(screen.getByRole('heading', { name: 'Nebula Test' }));
    expect(panel).toContainElement(screen.getByRole('button', { name: 'Login' }));
  });

  it('renders the default copyright footer without configured footer content', () => {
    render(
      <NebulaBrandProvider brand={{ name: 'Nebula Test' }}>
        <AuthShell>
          <button type="button">Login</button>
        </AuthShell>
      </NebulaBrandProvider>,
    );

    const footer = screen.getByTestId('auth-shell-footer');
    expect(footer).toHaveTextContent(`© ${new Date().getFullYear()} Nebula Test`);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('renders clickable footer items for configured tenant footer content', () => {
    render(
      <NebulaBrandProvider
        brand={{
          name: 'Acme',
          footer: {
            copyright: '© 2026 Acme Inc.',
            icp: '京ICP备12345678号',
            contactEmail: 'support@acme.com',
            contactPhone: '+86 138 0000 0000',
            website: 'https://www.acme.com/',
          },
        }}
      >
        <AuthShell>
          <button type="button">Login</button>
        </AuthShell>
      </NebulaBrandProvider>,
    );

    expect(screen.getByText('© 2026 Acme Inc.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '京ICP备12345678号' })).toHaveAttribute(
      'href',
      'https://beian.miit.gov.cn/',
    );
    expect(screen.getByRole('link', { name: 'support@acme.com' })).toHaveAttribute(
      'href',
      'mailto:support@acme.com',
    );
    expect(screen.getByRole('link', { name: '+86 138 0000 0000' })).toHaveAttribute(
      'href',
      'tel:+8613800000000',
    );
    expect(screen.getByRole('link', { name: 'www.acme.com' })).toHaveAttribute(
      'href',
      'https://www.acme.com/',
    );
  });

  it('falls back to the default shell background when the branded image fails', async () => {
    vi.stubGlobal('Image', FakeImage);
    const { container } = render(
      <NebulaBrandProvider brand={{ name: 'Nebula Test', loginBackground: '/brand-login.jpg' }}>
        <AuthShell>
          <button type="button">Login</button>
        </AuthShell>
      </NebulaBrandProvider>,
    );

    const shell = container.firstElementChild as HTMLElement;
    await waitFor(() => expect(FakeImage.instances[0]?.src).toBe('/brand-login.jpg'));
    expect(shell.style.backgroundImage).toBe('');

    act(() => FakeImage.instances[0]?.onerror?.());

    await waitFor(() => expect(shell.style.backgroundImage).toBe(''));
  });

  it('hides the decorative grid once a branded background image is active', async () => {
    vi.stubGlobal('Image', FakeImage);
    render(
      <NebulaBrandProvider brand={{ name: 'Nebula Test', loginBackground: '/brand-login.jpg' }}>
        <AuthShell>
          <button type="button">Login</button>
        </AuthShell>
      </NebulaBrandProvider>,
    );

    // 默认渐变背景用网格做装饰；换成用户图片后网格必须撤掉，否则会在照片上叠加出格子。
    expect(screen.getByTestId('auth-shell-grid')).toBeInTheDocument();
    await waitFor(() => expect(FakeImage.instances[0]?.src).toBe('/brand-login.jpg'));

    act(() => FakeImage.instances[0]?.onload?.());

    await waitFor(() => expect(screen.queryByTestId('auth-shell-grid')).not.toBeInTheDocument());
  });

  it('retries loading when the branded background URL changes', async () => {
    vi.stubGlobal('Image', FakeImage);
    const { container, rerender } = render(
      <NebulaBrandProvider brand={{ name: 'Nebula Test', loginBackground: '/first-login.jpg' }}>
        <AuthShell>
          <button type="button">Login</button>
        </AuthShell>
      </NebulaBrandProvider>,
    );

    const shell = container.firstElementChild as HTMLElement;
    await waitFor(() => expect(FakeImage.instances[0]?.src).toBe('/first-login.jpg'));
    act(() => FakeImage.instances[0]?.onerror?.());
    await waitFor(() => expect(shell.style.backgroundImage).toBe(''));

    rerender(
      <NebulaBrandProvider brand={{ name: 'Nebula Test', loginBackground: '/second-login.jpg' }}>
        <AuthShell>
          <button type="button">Login</button>
        </AuthShell>
      </NebulaBrandProvider>,
    );

    await waitFor(() => expect(FakeImage.instances[1]?.src).toBe('/second-login.jpg'));
    expect(shell.style.backgroundImage).toBe('');
    act(() => FakeImage.instances[1]?.onload?.());
    await waitFor(() => expect(shell.style.backgroundImage).toContain('/second-login.jpg'));
  });
});
