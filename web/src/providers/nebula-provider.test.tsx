import { render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { NebulaProvider } from './nebula-provider';

function getFavicon(): HTMLLinkElement | null {
  return document.head.querySelector('link[rel="icon"]');
}

describe('NebulaProvider brand metadata', () => {
  afterEach(() => {
    document.title = '';
    getFavicon()?.remove();
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
      expect(getFavicon()).toHaveAttribute('href', '/acme.svg');
    });
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
