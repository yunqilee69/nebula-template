/**
 * 原生安全存储适配（iOS Keychain / Android Keystore）。
 *
 * <p><b>不进入 Node 类型检查</b>：依赖 `react-native-keychain` 原生模块，无 RN 工具链无法编译/运行。
 * 该文件是 `SecureTokenStorage` 的真实实现，App 壳注入；测试用内存实现见 `secure-storage.ts`。</p>
 *
 * <p>安全约束：token 只允许写入平台安全存储，禁止明文 AsyncStorage。
 * 鸿蒙端 `react-native-keychain` 暂无 RNOH 适配（RNKeychainManager turbo module 缺失），
 * 降级为进程内内存实现：token 仅存活于本会话，杀进程即失效，不落任何明文存储。</p>
 */
import { Platform } from 'react-native';
import * as Keychain from 'react-native-keychain';
import type { SecureTokenStorage } from './secure-storage.ts';

const SERVICE = 'cn.cloudomni.nebula.mobile.tokens';

// 鸿蒙降级用：key → value 的进程内会话存储。
const harmonyMemoryStore = new Map<string, string>();

function isHarmony(): boolean {
  return (Platform as unknown as { OS: string }).OS === 'harmony';
}

export function createNativeSecureTokenStorage(): SecureTokenStorage {
  if (isHarmony()) {
    return {
      async getItem(key) {
        return harmonyMemoryStore.get(key) ?? null;
      },
      async setItem(key, value) {
        harmonyMemoryStore.set(key, value);
      },
      async removeItem() {
        harmonyMemoryStore.clear();
      },
    };
  }
  return {
    async getItem(key) {
      const credentials = await Keychain.getInternetCredentials(SERVICE);
      if (!credentials) return null;
      // 以 key 作为 username、value 作为 password 存储单条会话。
      return credentials.username === key ? credentials.password : null;
    },
    async setItem(key, value) {
      await Keychain.setInternetCredentials(SERVICE, key, value);
    },
    async removeItem() {
      await Keychain.resetInternetCredentials(SERVICE);
    },
  };
}
