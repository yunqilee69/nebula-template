import type { Logger } from '../diagnostics/logger.ts';
import type { PushService, RegisterPushDeviceInput } from './push-service.ts';

/**
 * 厂商推送 SDK 提供的注册信息。
 *
 * <p>设备标识与推送 token 由原生推送模块提供；Web/未集成推送的构建返回 {@code null}，
 * 此时租户推送生命周期整体跳过，不向服务端写空 token。</p>
 */
export interface PushRegistrationSnapshot extends RegisterPushDeviceInput {}

export interface PushTokenProvider {
  getRegistration(): Promise<PushRegistrationSnapshot | null>;
}

export interface TenantPushCoordinatorDeps {
  pushService: PushService;
  tokenProvider: PushTokenProvider;
  logger?: Logger;
}

export interface TenantPushCoordinator {
  /**
   * 为当前租户注册本机推送设备。
   *
   * <p>必须在租户会话建立后调用；请求使用当前租户令牌，服务端据此写入 tenant_id。</p>
   */
  registerForCurrentTenant(tenantCode?: string): Promise<boolean>;
  /**
   * 注销当前租户在本机的推送注册。
   *
   * <p>必须在清理租户会话<b>之前</b>调用：注销接口按令牌所属租户校验设备归属，
   * 会话清掉后就无法再注销旧租户。</p>
   */
  unregisterCurrentTenant(): Promise<void>;
}

/**
 * 租户级推送注册协调器。
 *
 * <p>移动端同一时刻只保持一个租户会话，因此本机只保留一个“当前注册”；
 * 切换企业/退出登录先注销旧租户，再为新租户注册。服务端另有同 token 跨租户清理兜底。</p>
 */
export function createTenantPushCoordinator(deps: TenantPushCoordinatorDeps): TenantPushCoordinator {
  let active: { tenantCode?: string; deviceId: string } | null = null;

  return {
    async registerForCurrentTenant(tenantCode) {
      let snapshot: PushRegistrationSnapshot | null;
      try {
        snapshot = await deps.tokenProvider.getRegistration();
      } catch (error) {
        deps.logger?.warn('push token unavailable', { reason: (error as Error).message });
        return false;
      }
      if (!snapshot) return false;

      // 同一租户内设备标识变化（重装/恢复）时先注销旧设备，避免一条租户下留两个活跃设备。
      if (active && active.deviceId !== snapshot.deviceId) {
        await this.unregisterCurrentTenant();
      }
      try {
        await deps.pushService.register(snapshot);
        active = { tenantCode, deviceId: snapshot.deviceId };
        deps.logger?.info('push registered for tenant', {
          tenantCode: tenantCode ?? '(default)',
          deviceId: snapshot.deviceId,
        });
        return true;
      } catch (error) {
        // 推送不可用不能阻断登录；设备会在下次启动或权限变更时重新注册。
        deps.logger?.warn('push register failed', {
          tenantCode: tenantCode ?? '(default)',
          reason: (error as Error).message,
        });
        return false;
      }
    },

    async unregisterCurrentTenant() {
      if (!active) return;
      const current = active;
      active = null;
      try {
        await deps.pushService.unregister(current.deviceId);
        deps.logger?.info('push unregistered for tenant', {
          tenantCode: current.tenantCode ?? '(default)',
          deviceId: current.deviceId,
        });
      } catch (error) {
        // 登出/切换不能被推送注销失败阻塞；服务端注册会随 token 失效自然停止扇出。
        deps.logger?.warn('push unregister failed', {
          tenantCode: current.tenantCode ?? '(default)',
          reason: (error as Error).message,
        });
      }
    },
  };
}
