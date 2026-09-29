import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { request } from '@/request/request';
import {
  DEFAULT_UPLOAD_POLICY,
  cacheUploadPolicyFromInit,
  ensureUploadPolicy,
  resolveUploadPolicy,
  useUploadPolicyStore,
} from './upload-policy-store';

vi.mock('@/request/request', () => ({
  request: vi.fn(),
}));

beforeEach(() => {
  useUploadPolicyStore.setState({ policy: DEFAULT_UPLOAD_POLICY, loaded: false });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('resolveUploadPolicy', () => {
  it('fills missing fields with the server-side defaults', () => {
    expect(resolveUploadPolicy({ chunkThreshold: 20 })).toEqual({ ...DEFAULT_UPLOAD_POLICY, chunkThreshold: 20 });
    expect(resolveUploadPolicy(undefined)).toEqual(DEFAULT_UPLOAD_POLICY);
  });
});

describe('cacheUploadPolicyFromInit', () => {
  it('caches the storage.upload subtree carried by the init response', () => {
    cacheUploadPolicyFromInit({ storage: { upload: { maxFileSize: 200, chunkSize: 8 } } });

    expect(useUploadPolicyStore.getState()).toMatchObject({
      loaded: true,
      policy: { ...DEFAULT_UPLOAD_POLICY, maxFileSize: 200, chunkSize: 8 },
    });
  });

  it('keeps the previous policy when the response carries no storage block', () => {
    useUploadPolicyStore.setState({ policy: { ...DEFAULT_UPLOAD_POLICY, chunkSize: 8 }, loaded: true });

    cacheUploadPolicyFromInit({ loginConfig: { phoneEnabled: true } });

    expect(useUploadPolicyStore.getState().policy.chunkSize).toBe(8);
  });
});

describe('ensureUploadPolicy', () => {
  it('reuses the cached policy without hitting the network', async () => {
    useUploadPolicyStore.setState({ policy: { ...DEFAULT_UPLOAD_POLICY, maxFileSize: 200 }, loaded: true });

    await expect(ensureUploadPolicy()).resolves.toMatchObject({ maxFileSize: 200 });
    expect(request).not.toHaveBeenCalled();
  });

  it('falls back to the same init endpoint and shares one request across concurrent callers', async () => {
    vi.mocked(request).mockResolvedValue({ storage: { upload: { maxFileSize: 150 } } });

    const [first, second] = await Promise.all([ensureUploadPolicy(), ensureUploadPolicy()]);

    expect(first?.maxFileSize).toBe(150);
    expect(second?.maxFileSize).toBe(150);
    expect(request).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledWith({ method: 'GET', url: '/api/frontend/init' });
    expect(useUploadPolicyStore.getState()).toMatchObject({ loaded: true, policy: { maxFileSize: 150 } });
  });

  it('returns the defaults without marking the policy loaded when the request fails', async () => {
    vi.mocked(request).mockRejectedValue(new Error('offline'));

    await expect(ensureUploadPolicy()).resolves.toEqual(DEFAULT_UPLOAD_POLICY);
    expect(useUploadPolicyStore.getState().loaded).toBe(false);

    vi.mocked(request).mockResolvedValue({ storage: { upload: { maxFileSize: 150 } } });
    await expect(ensureUploadPolicy()).resolves.toMatchObject({ maxFileSize: 150 });
    expect(request).toHaveBeenCalledTimes(2);
  });
});
