import { act } from '@testing-library/react';
import { useAuthStore } from '@/stores/auth-store';
import type { AuthAdapter } from '@/types/auth';

export const echoAuthAdapter: AuthAdapter = {
  getCurrentUser: async () => useAuthStore.getState().user,
};

export function signInAsAdminForTest(): void {
  act(() => {
    useAuthStore.getState().setUser({
      id: 'test-admin',
      name: 'Test Admin',
      roles: ['ADMIN'],
      permissions: [],
    });
    useAuthStore.setState({ loading: false });
  });
}

export function clearAuthForTest(): void {
  act(() => {
    useAuthStore.getState().clearUser();
  });
}
