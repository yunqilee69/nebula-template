/**
 * 安全 token 存储抽象。
 *
 * <p>存储实现必须各自不同：iOS Keychain / Android Keystore / 鸿蒙对应能力。
 * <b>禁止使用明文 AsyncStorage 存 token</b>（功能说明书 §8.3 第 2 条）。</p>
 *
 * <p>本文件只定义接口与「内存实现」（测试/开发用），真实安全存储由 App 壳注入原生实现。</p>
 */

/** 安全存储 key。 */
export const TOKEN_SESSION_STORAGE_KEY = 'nebula.mobile.token-session';

/** 异步键值存储（安全存储）接口。 */
export interface SecureTokenStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

/** 内存实现：仅用于测试与本地联调，<b>不得</b>用于生产 token 存储。 */
export function createInMemoryTokenStorage(seed?: Record<string, string>): SecureTokenStorage {
  const store = new Map<string, string>(Object.entries(seed ?? {}));
  return {
    async getItem(key) {
      return store.get(key) ?? null;
    },
    async setItem(key, value) {
      store.set(key, value);
    },
    async removeItem(key) {
      store.delete(key);
    },
  };
}
