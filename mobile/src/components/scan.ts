/**
 * 扫码输入通道：相机扫码与蓝牙扫码枪共用同一处理入口。
 *
 * <p>扫码枪以键盘事件形式连续输入并以回车结束，且可能重复上报；因此需要去重窗口。</p>
 */

export type ScanSource = 'CAMERA' | 'GUN' | 'MANUAL';
export type ScanClassification = 'EMPTY' | 'DEEPLINK' | 'URL' | 'TEXT';

/** 归一化扫码值；空白返回 null。 */
export function normalizeScanValue(raw: string | null | undefined): string | null {
  if (raw === null || raw === undefined) return null;
  const value = raw.trim();
  return value.length > 0 ? value : null;
}

/** 分类扫码内容。 */
export function classifyScanValue(raw: string | null | undefined): ScanClassification {
  const value = normalizeScanValue(raw);
  if (!value) return 'EMPTY';
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(value)) {
    return value.startsWith('http://') || value.startsWith('https://') ? 'URL' : 'DEEPLINK';
  }
  return 'TEXT';
}

export interface ScanHandlerDeps {
  onScan: (value: string, source: ScanSource) => void;
  /** 去重窗口，默认 800ms（扫码枪可能重复上报同一码）。 */
  dedupeWindowMs?: number;
  now?: () => number;
}

export interface ScanHandler {
  /** 处理一次扫码输入；被去重时返回 null。 */
  handle(raw: string | null | undefined, source?: ScanSource): string | null;
  reset(): void;
}

export const DEFAULT_SCAN_DEDUPE_WINDOW_MS = 800;

export function createScanHandler(deps: ScanHandlerDeps): ScanHandler {
  const dedupeWindowMs = deps.dedupeWindowMs ?? DEFAULT_SCAN_DEDUPE_WINDOW_MS;
  const now = deps.now ?? Date.now;
  const recent = new Map<string, number>();

  return {
    handle(raw, source = 'MANUAL') {
      const value = normalizeScanValue(raw);
      if (!value) return null;

      const timestamp = now();
      const last = recent.get(value);
      if (last !== undefined && timestamp - last < dedupeWindowMs) return null;
      recent.set(value, timestamp);

      // 清理过期记录，避免 Map 无界增长。
      for (const [key, seenAt] of recent) {
        if (timestamp - seenAt >= dedupeWindowMs) recent.delete(key);
      }

      deps.onScan(value, source);
      return value;
    },
    reset() {
      recent.clear();
    },
  };
}
