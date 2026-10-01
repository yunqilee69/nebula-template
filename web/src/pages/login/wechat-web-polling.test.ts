import { describe, expect, it } from 'vitest';
import { WECHAT_WEB_TOTAL_WAIT_MS, nextWechatWebPollDecision } from './wechat-web-polling';

describe('nextWechatWebPollDecision', () => {
  it('keeps polling while session is waiting or scanned', () => {
    expect(nextWechatWebPollDecision('WAITING', 0)).toBe('continue');
    expect(nextWechatWebPollDecision('SCANNED', 10_000)).toBe('continue');
    expect(nextWechatWebPollDecision('PROCESSING', 100_000)).toBe('continue');
  });

  it('stops with success as soon as session succeeds regardless of elapsed time', () => {
    expect(nextWechatWebPollDecision('SUCCESS', 0)).toBe('stop-success');
  });

  it('stops immediately on explicit failure', () => {
    expect(nextWechatWebPollDecision('FAILED', 0)).toBe('stop-failed');
  });

  it('treats expired and consumed sessions as expired', () => {
    expect(nextWechatWebPollDecision('EXPIRED', 0)).toBe('stop-expired');
    expect(nextWechatWebPollDecision('CONSUMED', 0)).toBe('stop-expired');
  });

  it('stops as expired once the wait budget is exhausted', () => {
    expect(nextWechatWebPollDecision('WAITING', WECHAT_WEB_TOTAL_WAIT_MS)).toBe('stop-expired');
    expect(nextWechatWebPollDecision('WAITING', WECHAT_WEB_TOTAL_WAIT_MS + 1)).toBe('stop-expired');
  });

  it('treats unknown statuses as expired', () => {
    expect(nextWechatWebPollDecision('UNKNOWN', 0)).toBe('stop-expired');
  });
});
