import { create } from 'zustand';

import { request } from '@/request/request';
import type { FrontendInitResp, FrontendUploadConfig } from '@/types/auth';

/**
 * 上传策略缓存。
 *
 * 策略不单独开接口，随 `GET /api/frontend/init` 一起下发：
 * 该端点的既有语义就是「聚合各模块的初始化配置」，且已在匿名放行名单内，
 * 登录页/注册页本来就会调用它。这里把响应中的 `storage.upload` 缓存下来，
 * 上传时直接读缓存，避免为策略多付一次往返。
 */

/** 服务端未下发策略时的兜底默认值，与参数中心 `storage.upload.*` 的默认值保持一致。 */
export const DEFAULT_UPLOAD_POLICY: Required<FrontendUploadConfig> = {
  maxFileSize: 100,
  chunkThreshold: 10,
  chunkSize: 5,
  allowedExtensions: '',
  tempRetentionDays: 14,
};

interface UploadPolicyState {
  policy: Required<FrontendUploadConfig>;
  /** 是否已从 init 响应或一次补拉中确定取值 */
  loaded: boolean;
  applyPolicy: (policy: FrontendUploadConfig | undefined) => void;
  reset: () => void;
}

/** 合并服务端策略与兜底默认值，缺字段按默认值补齐。 */
export function resolveUploadPolicy(raw: FrontendUploadConfig | undefined): Required<FrontendUploadConfig> {
  return { ...DEFAULT_UPLOAD_POLICY, ...(raw ?? {}) };
}

export const useUploadPolicyStore = create<UploadPolicyState>((set) => ({
  policy: DEFAULT_UPLOAD_POLICY,
  loaded: false,
  applyPolicy: (policy) => set({ policy: resolveUploadPolicy(policy), loaded: true }),
  reset: () => set({ policy: DEFAULT_UPLOAD_POLICY, loaded: false }),
}));

let inFlight: Promise<Required<FrontendUploadConfig>> | null = null;

/**
 * 把 init 响应中的存储配置写入缓存；登录页/注册页拿到 init 响应后可先调用它，
 * 后续上传即无需再发请求。响应不含 `storage` 时不覆盖已有缓存。
 */
export function cacheUploadPolicyFromInit(resp: FrontendInitResp | undefined): void {
  if (!resp?.storage) return;
  useUploadPolicyStore.getState().applyPolicy(resp.storage.upload);
}

/**
 * 读取上传策略：命中缓存直接返回；未命中时补一次 init 调用（仍复用同一端点）。
 *
 * 并发调用共享同一次请求；请求失败时返回默认策略而不阻断上传，
 * 但**不**标记为已加载，下次上传会重试拉取。
 */
export async function ensureUploadPolicy(): Promise<Required<FrontendUploadConfig>> {
  const state = useUploadPolicyStore.getState();
  if (state.loaded) return state.policy;
  if (inFlight) return inFlight;

  inFlight = request<FrontendInitResp>({ method: 'GET', url: '/api/frontend/init' })
    .then((resp) => {
      const policy = resolveUploadPolicy(resp?.storage?.upload);
      useUploadPolicyStore.getState().applyPolicy(policy);
      return policy;
    })
    .catch(() => DEFAULT_UPLOAD_POLICY)
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}
