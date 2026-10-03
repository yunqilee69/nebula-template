/**
 * 弱网重试队列。
 *
 * <p>移动端在后台会被系统限制，签收/表单类动作要允许「先落本地队列、联网后重放」。
 * 队列以 `idempotencyKey` 去重，避免重复提交产生重复业务。</p>
 *
 * <p>本模块是无持久化的内存队列：真实持久化（AsyncStorage/SQLite）由 App 壳注入，
 * 队列规则（去重、顺序、重试上限）在此收敛。</p>
 */

export interface EnqueueOptions {
  /** 幂等键：同一业务动作重复入队时只保留一条。 */
  idempotencyKey: string;
  execute: () => Promise<void>;
}

export interface QueuedAction {
  id: string;
  idempotencyKey: string;
  execute: () => Promise<void>;
  attempts: number;
}

export interface FlushResult {
  succeeded: string[];
  failed: string[];
  /** 因超出重试上限被丢弃的幂等键。 */
  dropped: string[];
  remaining: number;
}

export interface OfflineQueueOptions {
  maxAttempts?: number;
  generateId?: () => string;
}

export interface OfflineQueue {
  /** 入队；返回队列项 id。同一 idempotencyKey 已存在时返回已有 id，不重复入队。 */
  enqueue(options: EnqueueOptions): string;
  size(): number;
  has(idempotencyKey: string): boolean;
  /** 按入队顺序重放。失败即停止（保证顺序），超出重试上限的项被丢弃。 */
  flush(): Promise<FlushResult>;
  clear(): void;
}

export const DEFAULT_MAX_ATTEMPTS = 5;

export function createOfflineQueue(options: OfflineQueueOptions = {}): OfflineQueue {
  const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  let seq = 0;
  const generateId = options.generateId ?? (() => `offline-${++seq}`);
  const queue: QueuedAction[] = [];

  return {
    enqueue({ idempotencyKey, execute }) {
      const existing = queue.find((item) => item.idempotencyKey === idempotencyKey);
      if (existing) return existing.id;
      const action: QueuedAction = { id: generateId(), idempotencyKey, execute, attempts: 0 };
      queue.push(action);
      return action.id;
    },
    size() {
      return queue.length;
    },
    has(idempotencyKey) {
      return queue.some((item) => item.idempotencyKey === idempotencyKey);
    },
    async flush() {
      const succeeded: string[] = [];
      const failed: string[] = [];
      const dropped: string[] = [];

      while (queue.length > 0) {
        const action = queue[0]!;
        try {
          await action.execute();
          queue.shift();
          succeeded.push(action.idempotencyKey);
        } catch {
          action.attempts += 1;
          if (action.attempts >= maxAttempts) {
            queue.shift();
            failed.push(action.idempotencyKey);
            dropped.push(action.idempotencyKey);
            continue;
          }
          failed.push(action.idempotencyKey);
          // 顺序重放：遇到第一个失败即停止，避免后续动作依赖前序结果时被乱序执行。
          break;
        }
      }

      return { succeeded, failed, dropped, remaining: queue.length };
    },
    clear() {
      queue.length = 0;
    },
  };
}
