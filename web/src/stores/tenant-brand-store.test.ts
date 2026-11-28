import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authService } from '@/api/auth';
import { useTenantBrandStore } from './tenant-brand-store';

vi.mock('@/api/auth', () => ({
  authService: {
    getInit: vi.fn(),
  },
}));

const mockedGetInit = vi.mocked(authService.getInit);

function deferred<T>() {
  let resolve: (value: T) => void = () => {};
  let reject: (reason?: unknown) => void = () => {};
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, resolve, reject };
}

const firstTenant = { name: 'First tenant', branding: { loginTitle: 'First login' } };
const secondTenant = { name: 'Second tenant', branding: { loginTitle: 'Second login' } };

describe('useTenantBrandStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useTenantBrandStore.setState({ tenant: null, loaded: false, loading: false });
  });

  it('shares an ordinary in-flight load and reports success', async () => {
    const pending = deferred<{ tenant: typeof firstTenant }>();
    mockedGetInit.mockReturnValueOnce(pending.promise);

    const firstLoad = useTenantBrandStore.getState().load();
    const secondLoad = useTenantBrandStore.getState().load();

    expect(secondLoad).toBe(firstLoad);
    expect(mockedGetInit).toHaveBeenCalledTimes(1);

    pending.resolve({ tenant: firstTenant });

    await expect(firstLoad).resolves.toBe(true);
    expect(useTenantBrandStore.getState()).toMatchObject({
      tenant: firstTenant,
      loaded: true,
      loading: false,
    });
  });

  it('lets a forced load supersede an ordinary request without stale overwrite', async () => {
    const ordinary = deferred<{ tenant: typeof firstTenant }>();
    const forced = deferred<{ tenant: typeof secondTenant }>();
    mockedGetInit.mockReturnValueOnce(ordinary.promise).mockReturnValueOnce(forced.promise);

    const ordinaryLoad = useTenantBrandStore.getState().load();
    const forcedLoad = useTenantBrandStore.getState().load({ force: true });

    expect(mockedGetInit).toHaveBeenCalledTimes(2);
    forced.resolve({ tenant: secondTenant });
    await expect(forcedLoad).resolves.toBe(true);
    ordinary.resolve({ tenant: firstTenant });

    await expect(ordinaryLoad).resolves.toBe(false);
    expect(useTenantBrandStore.getState().tenant).toBe(secondTenant);
    expect(useTenantBrandStore.getState().loading).toBe(false);
  });

  it('shares one forced request with other forced and ordinary callers', async () => {
    const pending = deferred<{ tenant: typeof firstTenant }>();
    mockedGetInit.mockReturnValueOnce(pending.promise);

    const firstForcedLoad = useTenantBrandStore.getState().load({ force: true });
    const secondForcedLoad = useTenantBrandStore.getState().load({ force: true });
    const ordinaryLoad = useTenantBrandStore.getState().load();

    expect(secondForcedLoad).toBe(firstForcedLoad);
    expect(ordinaryLoad).toBe(firstForcedLoad);
    expect(mockedGetInit).toHaveBeenCalledTimes(1);

    pending.resolve({ tenant: firstTenant });

    await expect(firstForcedLoad).resolves.toBe(true);
    await expect(secondForcedLoad).resolves.toBe(true);
    await expect(ordinaryLoad).resolves.toBe(true);
  });

  it('prevents a superseded forced result from overwriting a manually set tenant', async () => {
    const pending = deferred<{ tenant: typeof firstTenant }>();
    mockedGetInit.mockReturnValueOnce(pending.promise);

    const forcedLoad = useTenantBrandStore.getState().load({ force: true });
    const manualTenant = { name: 'Manually selected tenant' };
    useTenantBrandStore.getState().setTenant(manualTenant);
    pending.resolve({ tenant: firstTenant });

    await expect(forcedLoad).resolves.toBe(false);
    expect(useTenantBrandStore.getState()).toMatchObject({
      tenant: manualTenant,
      loaded: true,
      loading: false,
    });
  });

  it('clears the tenant and marks the initial load complete after failure', async () => {
    mockedGetInit.mockRejectedValueOnce(new Error('init unavailable'));

    await expect(useTenantBrandStore.getState().load()).resolves.toBe(false);

    expect(useTenantBrandStore.getState()).toMatchObject({
      tenant: null,
      loaded: true,
      loading: false,
    });
  });

  it('retains the current tenant when a forced reload fails', async () => {
    useTenantBrandStore.setState({ tenant: firstTenant, loaded: true });
    mockedGetInit.mockRejectedValueOnce(new Error('reload unavailable'));

    await expect(useTenantBrandStore.getState().load({ force: true })).resolves.toBe(false);

    expect(useTenantBrandStore.getState()).toMatchObject({
      tenant: firstTenant,
      loaded: true,
      loading: false,
    });
  });
});
