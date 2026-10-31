import { create } from 'zustand';
import { authService } from '@/api/auth';
import type { TenantBranding } from '@/types/tenant-profile';

interface TenantBrandState {
  tenant: TenantBranding | null;
  loaded: boolean;
  loading: boolean;
  load: () => Promise<void>;
  setTenant: (tenant: TenantBranding | null) => void;
}

/**
 * 当前租户品牌。
 *
 * <p>租户子域启动时从 `/api/frontend/init` 读取一次，登录页与布局共用；企业设置保存后
 * 由页面写回，避免整页刷新。</p>
 */
export const useTenantBrandStore = create<TenantBrandState>((set, get) => ({
  tenant: null,
  loaded: false,
  loading: false,
  load: async () => {
    if (get().loading) return;
    set({ loading: true });
    try {
      const init = await authService.getInit();
      set({ tenant: init.tenant ?? null, loaded: true });
    } catch {
      set({ tenant: null, loaded: true });
    } finally {
      set({ loading: false });
    }
  },
  setTenant: (tenant) => set({ tenant, loaded: true }),
}));
