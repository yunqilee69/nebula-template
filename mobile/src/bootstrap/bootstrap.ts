import type {
  CurrentUserResp,
  FrontendInitResp,
  FrontendPushInitResp,
  MenuTreeResp,
} from '../../../packages/client-sdk/index.ts';
import { createFallbackInit, mergeInitWithDefaults } from './init-defaults.ts';

/** 启动引导依赖（由 App 壳注入真实实现，便于测试）。 */
export interface BootstrapDeps {
  /** 拉取 `GET /api/frontend/init`（匿名可调，带 platform/channel）。 */
  fetchInit: () => Promise<FrontendInitResp>;
  /** 拉取 `GET /api/auth/current-user`（含权限码与菜单）。 */
  fetchCurrentUser: () => Promise<CurrentUserResp>;
  /** init 失败时的观测回调（上报诊断），不影响兜底流程。 */
  onInitFallback?: (error: unknown) => void;
}

/** 启动引导结果。 */
export interface BootstrapResult {
  init: FrontendInitResp;
  /** init 是否走了兜底（true 表示拉取失败，UI 应允许重试）。 */
  initFromFallback: boolean;
  currentUser: CurrentUserResp;
  permissionCodes: readonly string[];
  roleCodes: readonly string[];
  menuTree: readonly MenuTreeResp[];
  /**
   * 服务端下发的推送初始化配置（透传自 init，缺省表示不初始化任何推送 SDK）。
   * 供推送 SDK 初始化流程消费。
   */
  push?: FrontendPushInitResp;
}

/**
 * 启动引导：先 init（拿登录开关/上传策略/默认主题），再拉 current-user（拿权限码与菜单）。
 *
 * <p>语义（功能说明书 §7.1 / §7.3）：
 * <ul>
 *   <li>两步都完成才视为引导完成，调用方才渲染主界面；</li>
 *   <li>init 失败<b>不白屏</b>：用兜底默认值继续，标记 `initFromFallback`；</li>
 *   <li>current-user 失败<b>直接抛出</b>（token 未过期时视为网络问题，由调用方重试，而不是登出）。</li>
 * </ul></p>
 */
export async function runBootstrap(deps: BootstrapDeps): Promise<BootstrapResult> {
  let init: FrontendInitResp;
  let initFromFallback = false;

  try {
    init = mergeInitWithDefaults(await deps.fetchInit());
  } catch (error) {
    initFromFallback = true;
    deps.onInitFallback?.(error);
    init = createFallbackInit();
  }

  const currentUser = await deps.fetchCurrentUser();

  return {
    init,
    initFromFallback,
    currentUser,
    permissionCodes: currentUser.permissionCodeList ?? [],
    roleCodes: currentUser.roleCodeList ?? [],
    menuTree: currentUser.menuList ?? [],
    push: init.push,
  };
}
