/**
 * 微信扫码登录轮询参数。
 *
 * 后端登录会话（state 缓存）默认 600 秒，这里在会话过期前留出提前量主动停止。
 */
export const WECHAT_WEB_POLL_INTERVAL_MS = 2000;
export const WECHAT_WEB_TOTAL_WAIT_MS = 540_000;

export type WechatWebPollDecision = 'continue' | 'stop-success' | 'stop-failed' | 'stop-expired';

export function nextWechatWebPollDecision(status: string, elapsedMs: number): WechatWebPollDecision {
  switch (status) {
    case 'SUCCESS':
      return 'stop-success';
    case 'WAITING':
    case 'SCANNED':
    case 'PROCESSING':
      return elapsedMs >= WECHAT_WEB_TOTAL_WAIT_MS ? 'stop-expired' : 'continue';
    case 'FAILED':
      return 'stop-failed';
    case 'EXPIRED':
    case 'CONSUMED':
    default:
      return 'stop-expired';
  }
}
