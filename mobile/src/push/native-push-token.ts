import { NativeModules } from 'react-native';
import type { PushRegistrationSnapshot, PushTokenProvider } from './tenant-push-coordinator.ts';

interface NativePushModule {
  getRegistration?: () => Promise<Partial<PushRegistrationSnapshot> | null>;
}

/**
 * 原生推送模块适配。
 *
 * <p>宿主 App 通过原生模块 `NebulaPush.getRegistration()` 返回厂商 token；
 * 基础工程未集成推送 SDK 时模块不存在，协调器会跳过注册。</p>
 */
export function createNativePushTokenProvider(): PushTokenProvider {
  const module = (NativeModules as Record<string, NativePushModule | undefined>).NebulaPush;
  return {
    async getRegistration() {
      if (!module?.getRegistration) return null;
      const value = await module.getRegistration();
      if (!value
          || typeof value.deviceId !== 'string' || !value.deviceId.trim()
          || typeof value.platform !== 'string' || !value.platform.trim()
          || typeof value.vendor !== 'string' || !value.vendor.trim()
          || typeof value.pushToken !== 'string' || !value.pushToken.trim()) {
        return null;
      }
      return {
        deviceId: value.deviceId,
        platform: value.platform,
        vendor: value.vendor,
        pushToken: value.pushToken,
        notificationEnabled: value.notificationEnabled === true,
        appVersion: value.appVersion,
        appBuild: value.appBuild,
        osVersion: value.osVersion,
        deviceModel: value.deviceModel,
      };
    },
  };
}
