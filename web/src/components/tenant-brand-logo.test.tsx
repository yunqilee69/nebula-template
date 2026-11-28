import { fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useStoragePreviewUrl } from '@/hooks/use-storage-preview-url';
import { request } from '@/request/request';
import { TenantBrandLogo } from './tenant-brand-logo';

vi.mock('@/hooks/use-storage-preview-url', async () => {
  const actual = await vi.importActual<typeof import('@/hooks/use-storage-preview-url')>('@/hooks/use-storage-preview-url');
  return {
    ...actual,
    useStoragePreviewUrl: vi.fn(actual.useStoragePreviewUrl),
  };
});

vi.mock('@/request/request', () => ({
  request: vi.fn(),
}));

const mockedRequest = vi.mocked(request);
const mockedPreviewUrl = vi.mocked(useStoragePreviewUrl);

describe('TenantBrandLogo', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders public brand assets directly without requesting an authenticated preview', () => {
    const { getByRole } = render(
      <TenantBrandLogo src="/api/frontend/brand-assets/logo?v=2" alt="Acme" />,
    );

    expect(getByRole('img')).toHaveAttribute('src', '/api/frontend/brand-assets/logo?v=2');
    expect(mockedPreviewUrl).toHaveBeenCalledWith(undefined);
    expect(mockedRequest).not.toHaveBeenCalled();
  });

  it('bypasses authenticated preview for absolute public brand asset URLs', () => {
    const source = 'https://tenant.example.com/api/frontend/brand-assets/logo?v=3';

    const { getByRole } = render(<TenantBrandLogo src={source} alt="Acme" />);

    expect(getByRole('img')).toHaveAttribute('src', source);
    expect(mockedPreviewUrl).toHaveBeenCalledWith(undefined);
    expect(mockedRequest).not.toHaveBeenCalled();
  });

  it('still resolves generic storage URLs through the authenticated preview hook', async () => {
    mockedRequest.mockResolvedValueOnce([{ mode: 'DIRECT', url: 'https://cdn.example.com/logo.png?sig=1' }]);

    const { getByRole } = render(
      <TenantBrandLogo src="/api/storage/download?fileId=logo-1" alt="Acme" />,
    );

    await waitFor(() => {
      expect(getByRole('img')).toHaveAttribute('src', 'https://cdn.example.com/logo.png?sig=1');
    });
    expect(mockedPreviewUrl).toHaveBeenCalledWith('/api/storage/download?fileId=logo-1');
    expect(mockedRequest).toHaveBeenCalledWith({
      url: '/api/storage/download-location',
      method: 'GET',
      params: { fileId: 'logo-1' },
    });
  });

  it('falls back to the built-in logo when a public image fails without retrying', () => {
    const { getByRole } = render(
      <TenantBrandLogo src="/api/frontend/brand-assets/logo?v=2" alt="Acme" />,
    );
    const image = getByRole('img', { name: 'Acme' });

    fireEvent.error(image);

    const fallback = getByRole('img', { name: 'Acme' });
    expect(fallback.tagName.toLowerCase()).toBe('svg');
    expect(document.querySelector('img')).not.toBeInTheDocument();
    expect(mockedRequest).not.toHaveBeenCalled();
  });
});
