import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { request } from '@/request/request';
import { useStoragePreviewUrl } from './use-storage-preview-url';

vi.mock('@/request/request', () => ({
  request: vi.fn(),
}));

const originalCreateObjectURL = URL.createObjectURL;
const originalRevokeObjectURL = URL.revokeObjectURL;

function mockObjectUrls(...urls: readonly string[]) {
  const objectUrls = [...urls];
  const createObjectURL = vi.fn(() => {
    const objectUrl = objectUrls.shift();
    if (!objectUrl) throw new Error('Missing object URL mock');
    return objectUrl;
  });
  const revokeObjectURL = vi.fn();
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL });
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL });
  return { createObjectURL, revokeObjectURL };
}

const oldStorageAvatarUrl = '/api/storage/download?fileId=old-avatar&filename=old-avatar.png';
const newStorageAvatarUrl = '/api/storage/download?fileId=new-avatar&filename=new-avatar.png';

interface StoragePreviewHookProps {
  readonly url: string | undefined;
}

function renderStoragePreviewHook(initialUrl: string | undefined) {
  const initialProps: StoragePreviewHookProps = { url: initialUrl };
  return renderHook(({ url }: StoragePreviewHookProps) => useStoragePreviewUrl(url), { initialProps });
}

describe('useStoragePreviewUrl', () => {
  afterEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: originalCreateObjectURL });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: originalRevokeObjectURL });
  });

  it('keeps the previous protected blob preview while the next protected preview is loading', async () => {
    let resolveNewPreview: (value: Blob) => void = () => {};
    vi.mocked(request)
      .mockResolvedValueOnce(new Blob(['old-avatar'], { type: 'image/png' }))
      .mockImplementationOnce(() => new Promise<Blob>((resolve) => {
        resolveNewPreview = resolve;
      }));
    const { revokeObjectURL } = mockObjectUrls('blob:old-avatar', 'blob:new-avatar');

    const { result, rerender } = renderStoragePreviewHook(oldStorageAvatarUrl);

    await waitFor(() => expect(result.current).toBe('blob:old-avatar'));
    rerender({ url: newStorageAvatarUrl });

    await waitFor(() => expect(request).toHaveBeenCalledWith({
      url: newStorageAvatarUrl,
      method: 'GET',
      responseType: 'blob',
    }));
    expect(result.current).toBe('blob:old-avatar');
    expect(revokeObjectURL).not.toHaveBeenCalledWith('blob:old-avatar');

    resolveNewPreview(new Blob(['new-avatar'], { type: 'image/png' }));

    await waitFor(() => expect(result.current).toBe('blob:new-avatar'));
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:old-avatar');
  });

  it('keeps the previous protected blob preview when the next protected preview fails', async () => {
    vi.mocked(request)
      .mockResolvedValueOnce(new Blob(['old-avatar'], { type: 'image/png' }))
      .mockRejectedValueOnce(new Error('download failed'));
    const { revokeObjectURL } = mockObjectUrls('blob:old-avatar');

    const { result, rerender } = renderStoragePreviewHook(oldStorageAvatarUrl);

    await waitFor(() => expect(result.current).toBe('blob:old-avatar'));
    rerender({ url: newStorageAvatarUrl });

    await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
    expect(result.current).toBe('blob:old-avatar');
    expect(revokeObjectURL).not.toHaveBeenCalledWith('blob:old-avatar');
  });

  it('clears and revokes the protected blob preview when the source URL is cleared', async () => {
    vi.mocked(request).mockResolvedValueOnce(new Blob(['old-avatar'], { type: 'image/png' }));
    const { revokeObjectURL } = mockObjectUrls('blob:old-avatar');

    const { result, rerender } = renderStoragePreviewHook(oldStorageAvatarUrl);

    await waitFor(() => expect(result.current).toBe('blob:old-avatar'));
    rerender({ url: undefined });

    await waitFor(() => expect(result.current).toBeUndefined());
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:old-avatar');
  });

  it('replaces a protected blob preview with a regular image URL', async () => {
    vi.mocked(request).mockResolvedValueOnce(new Blob(['old-avatar'], { type: 'image/png' }));
    const { revokeObjectURL } = mockObjectUrls('blob:old-avatar');

    const { result, rerender } = renderStoragePreviewHook(oldStorageAvatarUrl);

    await waitFor(() => expect(result.current).toBe('blob:old-avatar'));
    rerender({ url: 'https://example.com/avatar.png' });

    await waitFor(() => expect(result.current).toBe('https://example.com/avatar.png'));
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:old-avatar');
  });
});
