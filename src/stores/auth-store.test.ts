import { afterEach, describe, expect, it } from 'vitest';
import type { CurrentUser } from '@/types/auth';
import { useAuthStore } from './auth-store';

function resetAuthStore(): void {
  useAuthStore.setState({
    user: null,
    loading: true,
    permissions: [],
    roles: [],
    organizations: [],
    currentOrganizationId: null,
    currentOrganization: null,
  });
}

function createUser(id: string): CurrentUser {
  return {
    id,
    name: id,
    roles: ['USER'],
    permissions: ['DASHBOARD:READ'],
    menuList: [{ id: 'dashboard', code: 'dashboard', path: '/dashboard', name: 'Dashboard' }],
  };
}

interface Deferred<T> {
  readonly promise: Promise<T>;
  readonly resolve: (value: T) => void;
}

function createDeferred<T>(): Deferred<T> {
  let resolveValue: ((value: T) => void) | undefined;
  const promise = new Promise<T>((resolve) => {
    resolveValue = resolve;
  });
  if (!resolveValue) throw new Error('Deferred promise resolver was not initialized.');
  return { promise, resolve: resolveValue };
}

describe('auth store', () => {
  afterEach(resetAuthStore);

  it('keeps a user set during an in-flight refresh when that refresh resolves as unauthenticated', async () => {
    const staleRefresh = createDeferred<CurrentUser | null>();
    const refreshPromise = useAuthStore.getState().refreshUser({
      getCurrentUser: () => staleRefresh.promise,
    });
    const oauthUser = createUser('oauth-user');

    useAuthStore.getState().setUser(oauthUser);
    staleRefresh.resolve(null);
    await refreshPromise;

    expect(useAuthStore.getState().user).toEqual(oauthUser);
    expect(useAuthStore.getState().loading).toBe(false);
  });
});
