import { act } from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import dayjs from 'dayjs';
import { NebulaProvider } from './nebula-provider';
import { useLocaleStore } from '@/stores/locale-store';

function getFavicons(): HTMLLinkElement[] {
  return [...document.head.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]')];
}

function getThemeColors(): HTMLMetaElement[] {
  return [...document.head.querySelectorAll<HTMLMetaElement>('meta')].filter(
    (meta) => meta.getAttribute('name')?.toLowerCase() === 'theme-color',
  );
}

function appendDefaultFavicons() {
  const first = document.createElement('link');
  first.rel = 'shortcut icon';
  first.href = '/favicon.svg';
  first.type = 'image/svg+xml';
  const second = document.createElement('link');
  second.rel = 'icon';
  second.href = '/favicon-32.png';
  second.setAttribute('sizes', '32x32');
  const third = document.createElement('link');
  third.rel = 'icon';
  third.href = '/favicon-16.png';
  third.setAttribute('sizes', '16x16');
  const apple = document.createElement('link');
  apple.rel = 'apple-touch-icon';
  apple.href = '/apple-touch-icon.png';
  document.head.append(first, second, third, apple);
  return { first, second, third, apple };
}

describe('NebulaProvider brand metadata', () => {
  afterEach(() => {
    document.title = '';
    getFavicons().forEach((link) => link.remove());
    document.head.querySelector('link[rel="apple-touch-icon"]')?.remove();
    getThemeColors().forEach((meta) => meta.remove());
    document.head.querySelector('[data-nebula-viewport-style]')?.remove();
  });

  it('syncs document title from brand title', async () => {
    render(<NebulaProvider brand={{ name: 'Acme', title: 'Acme Console' }}>content</NebulaProvider>);

    await waitFor(() => {
      expect(document.title).toBe('Acme Console');
    });
  });

  it('syncs favicon href from brand faviconHref', async () => {
    render(<NebulaProvider brand={{ faviconHref: '/acme.svg' }}>content</NebulaProvider>);

    await waitFor(() => {
      expect(getFavicons()).toHaveLength(1);
      expect(getFavicons()[0]).toHaveAttribute('href', '/acme.svg');
    });
  });

  it('syncs every favicon link while leaving apple-touch-icon unchanged', async () => {
    const { apple } = appendDefaultFavicons();

    render(<NebulaProvider brand={{ faviconHref: '/acme.svg' }}>content</NebulaProvider>);

    await waitFor(() => {
      expect(getFavicons()).toHaveLength(3);
      expect(getFavicons().every((link) => link.getAttribute('href') === '/acme.svg')).toBe(true);
    });
    expect(getFavicons()[0]).toHaveAttribute('rel', 'shortcut icon');
    expect(getFavicons()[0]).toHaveAttribute('type', 'image/svg+xml');
    expect(getFavicons()[1]).toHaveAttribute('sizes', '32x32');
    expect(apple).toHaveAttribute('href', '/apple-touch-icon.png');
  });

  it('restores the original favicon links when branding is removed', async () => {
    const defaults = appendDefaultFavicons();
    const { rerender } = render(<NebulaProvider brand={{ faviconHref: '/acme.svg' }}>content</NebulaProvider>);

    await waitFor(() => expect(getFavicons().every((link) => link.getAttribute('href') === '/acme.svg')).toBe(true));
    rerender(<NebulaProvider>content</NebulaProvider>);

    await waitFor(() => {
      expect(getFavicons().map((link) => link.getAttribute('href'))).toEqual([
        '/favicon.svg',
        '/favicon-32.png',
        '/favicon-16.png',
      ]);
    });
    expect(getFavicons()[0]).toHaveAttribute('type', 'image/svg+xml');
    expect(getFavicons()[1]).toHaveAttribute('sizes', '32x32');
    expect(getFavicons()[2]).toHaveAttribute('sizes', '16x16');
    expect(defaults.apple).toHaveAttribute('href', '/apple-touch-icon.png');
  });

  it('restores every default favicon when the tenant favicon is empty', async () => {
    appendDefaultFavicons();
    const { rerender } = render(<NebulaProvider brand={{ faviconHref: '/acme.svg' }}>content</NebulaProvider>);

    await waitFor(() => expect(getFavicons().every((link) => link.getAttribute('href') === '/acme.svg')).toBe(true));
    rerender(<NebulaProvider brand={{ faviconHref: '' }}>content</NebulaProvider>);

    await waitFor(() => {
      expect(getFavicons().map((link) => link.getAttribute('href'))).toEqual([
        '/favicon.svg',
        '/favicon-32.png',
        '/favicon-16.png',
      ]);
    });
  });

  it('restores defaults when the current favicon errors and ignores stale detached errors', async () => {
    appendDefaultFavicons();
    const { rerender } = render(<NebulaProvider brand={{ faviconHref: '/first.svg' }}>content</NebulaProvider>);

    await waitFor(() => expect(getFavicons()[0]).toHaveAttribute('href', '/first.svg'));
    const staleLink = getFavicons()[0];
    rerender(<NebulaProvider brand={{ faviconHref: '/second.svg' }}>content</NebulaProvider>);
    await waitFor(() => expect(getFavicons()[0]).toHaveAttribute('href', '/second.svg'));

    fireEvent.error(staleLink);
    expect(getFavicons()[0]).toHaveAttribute('href', '/second.svg');
    fireEvent.error(getFavicons()[0]);

    await waitFor(() => expect(getFavicons().map((link) => link.getAttribute('href'))).toEqual([
      '/favicon.svg',
      '/favicon-32.png',
      '/favicon-16.png',
    ]));
  });

  it('syncs the branded theme color and restores the original meta node', async () => {
    const original = document.createElement('meta');
    original.name = 'theme-color';
    original.content = '#1677ff';
    original.setAttribute('data-source', 'index');
    document.head.append(original);

    const { rerender } = render(<NebulaProvider brand={{ themeColor: '#123456' }}>content</NebulaProvider>);

    await waitFor(() => {
      expect(getThemeColors()).toHaveLength(1);
      expect(getThemeColors()[0]).toHaveAttribute('content', '#123456');
    });
    expect(getThemeColors()[0]).toHaveAttribute('data-source', 'index');

    rerender(<NebulaProvider>content</NebulaProvider>);

    await waitFor(() => {
      expect(getThemeColors()).toHaveLength(1);
      expect(getThemeColors()[0]).toBe(original);
      expect(getThemeColors()[0]).toHaveAttribute('content', '#1677ff');
    });
  });

  it('removes a managed theme color when no original meta exists', async () => {
    const { rerender } = render(<NebulaProvider brand={{ themeColor: '#123456' }}>content</NebulaProvider>);

    await waitFor(() => expect(getThemeColors()[0]).toHaveAttribute('content', '#123456'));
    rerender(<NebulaProvider>content</NebulaProvider>);

    await waitFor(() => expect(getThemeColors()).toHaveLength(0));
  });

  it('does not inject duplicate viewport reset styles into the document head', () => {
    render(<NebulaProvider>content</NebulaProvider>);

    expect(document.head.querySelector('[data-nebula-viewport-style]')).not.toBeInTheDocument();
  });
});

describe('NebulaProvider theme styling', () => {
  afterEach(() => {
    document.documentElement.removeAttribute('data-nebula-theme');
    document.documentElement.style.colorScheme = '';
  });

  it('exposes the current theme mode and token aliases for Tailwind and CSS Modules', async () => {
    render(
      <NebulaProvider
        defaultThemeMode="dark"
        darkTheme={{ token: { colorBgLayout: '#101820', colorText: '#e5eef7' } }}
      >
        content
      </NebulaProvider>,
    );

    await waitFor(() => {
      expect(document.documentElement).toHaveAttribute('data-nebula-theme', 'dark');
    });
    expect(document.documentElement.style.colorScheme).toBe('dark');
    expect(document.documentElement.style.getPropertyValue('--nebula-color-bg-layout')).toBe('#101820');
    expect(document.documentElement.style.getPropertyValue('--nebula-color-text')).toBe('#e5eef7');
  });
});

describe('NebulaProvider locale', () => {
  afterEach(() => {
    useLocaleStore.getState().setLocale('zh-CN');
    dayjs.locale('en');
  });

  it('applies the dayjs locale matching the app locale so date panels render localized months', async () => {
    dayjs.locale('en');
    render(
      <NebulaProvider>
        <div>content</div>
      </NebulaProvider>,
    );

    // 默认 locale 为 zh-CN：dayjs 全局语言包应同步为 zh-cn（DatePicker 面板月份/星期文案来源）
    await waitFor(() => {
      expect(dayjs.locale()).toBe('zh-cn');
    });

    act(() => {
      useLocaleStore.getState().setLocale('en-US');
    });
    await waitFor(() => {
      expect(dayjs.locale()).toBe('en');
    });
  });
});
