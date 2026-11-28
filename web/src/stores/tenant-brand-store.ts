import { create } from 'zustand';
import { authService } from '@/api/auth';
import type { FrontendTenantResp } from '@/types/auth';

interface TenantBrandState {
  tenant: FrontendTenantResp | null;
  loaded: boolean;
  loading: boolean;
  load: (options?: { force?: boolean }) => Promise<boolean>;
  setTenant: (tenant: FrontendTenantResp | null) => void;
}

type InFlightLoad = {
  force: boolean;
  promise: Promise<boolean>;
};

let requestSequence = 0;
let inFlightLoad: InFlightLoad | null = null;

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
  load: (options = {}) => {
    const force = options.force === true;
    if (inFlightLoad && (force ? inFlightLoad.force : true)) {
      return inFlightLoad.promise;
    }

    const sequence = ++requestSequence;
    set({ loading: true });

    let promise!: Promise<boolean>;
    promise = (async () => {
      try {
        const init = await authService.getInit();
        if (sequence !== requestSequence) return false;

        set({ tenant: init.tenant ?? null, loaded: true, loading: false });
        return true;
      } catch {
        if (sequence !== requestSequence) return false;

        set({
          // An initial anonymous-init failure must fall back to the built-in brand. A forced
          // refresh must leave the currently rendered tenant brand intact.
          tenant: force ? get().tenant : null,
          loaded: true,
          loading: false,
        });
        return false;
      } finally {
        if (promise && inFlightLoad?.promise === promise) {
          inFlightLoad = null;
        }
      }
    })();

    inFlightLoad = { force, promise };
    return promise;
  },
  setTenant: (tenant) => {
    requestSequence += 1;
    inFlightLoad = null;
    set({ tenant, loaded: true, loading: false });
  },
}));
