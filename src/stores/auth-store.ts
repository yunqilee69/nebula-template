import { create } from 'zustand';
import type { AuthAdapter, CurrentUser, Organization } from '@/types/auth';

export interface AuthState {
  user: CurrentUser | null;
  loading: boolean;
  permissions: string[];
  roles: string[];
  organizations: Organization[];
  currentOrganizationId: string | null;
  currentOrganization: Organization | null;
  setUser: (user: CurrentUser | null) => void;
  setCurrentOrganizationId: (organizationId: string | null) => void;
  refreshUser: (adapter?: AuthAdapter) => Promise<void>;
  clearUser: () => void;
}

function deriveOrganization(user: CurrentUser | null, organizationId: string | null) {
  return user?.organizations?.find((organization) => organization.id === organizationId) ?? null;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: true,
  permissions: [],
  roles: [],
  organizations: [],
  currentOrganizationId: null,
  currentOrganization: null,
  setUser: (user) => {
    const currentOrganizationId = user?.currentOrganizationId ?? user?.organizations?.[0]?.id ?? null;
    set({
      user,
      permissions: user?.permissions ?? [],
      roles: user?.roles ?? [],
      organizations: user?.organizations ?? [],
      currentOrganizationId,
      currentOrganization: deriveOrganization(user, currentOrganizationId),
    });
  },
  setCurrentOrganizationId: (organizationId) => {
    const user = get().user;
    set({
      currentOrganizationId: organizationId,
      currentOrganization: deriveOrganization(user, organizationId),
    });
  },
  refreshUser: async (adapter) => {
    if (!adapter) {
      get().setUser(null);
      set({ loading: false });
      return;
    }

    const userBeforeRefresh = get().user;
    set({ loading: true });
    try {
      const refreshedUser = await adapter.getCurrentUser();
      if (get().user === userBeforeRefresh) {
        get().setUser(refreshedUser);
      }
    } finally {
      set({ loading: false });
    }
  },
  clearUser: () => {
    set({
      user: null,
      loading: false,
      permissions: [],
      roles: [],
      organizations: [],
      currentOrganizationId: null,
      currentOrganization: null,
    });
  },
}));
