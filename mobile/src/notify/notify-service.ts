import {
  NOTIFY_ENDPOINTS,
  type CurrentAnnouncementPageReq,
  type CurrentAnnouncementResp,
  type PageResp,
  type SiteMessagePageReq,
  type SiteMessageResp,
} from '../../../packages/client-sdk/index.ts';
import type { RequestConfig } from '../request/types.ts';

/**
 * 站内信与公告服务。
 *
 * <p>推送未接入期间，站内信轮询 + 红点是 P0 兜底触达通道。服务端只有轮询，无推送/长连接。</p>
 */
export interface NotifyServiceDeps {
  request: <T>(config: RequestConfig) => Promise<T>;
}

export interface NotifyService {
  getUnreadCount(): Promise<number>;
  pageSiteMessages(request: SiteMessagePageReq): Promise<PageResp<SiteMessageResp>>;
  markSiteMessageRead(id: string): Promise<void>;
  markSiteMessagesRead(ids: readonly string[]): Promise<void>;
  pageCurrentAnnouncements(request: CurrentAnnouncementPageReq): Promise<PageResp<CurrentAnnouncementResp>>;
  listCurrentPopupAnnouncements(): Promise<CurrentAnnouncementResp[]>;
  markAnnouncementRead(id: string): Promise<void>;
}

export function createNotifyService(deps: NotifyServiceDeps): NotifyService {
  const request = deps.request;
  return {
    getUnreadCount() {
      return request<number>({ method: 'GET', url: NOTIFY_ENDPOINTS.siteMessagesUnreadCount });
    },
    pageSiteMessages(body) {
      return request<PageResp<SiteMessageResp>>({
        method: 'POST',
        url: NOTIFY_ENDPOINTS.siteMessagesPage,
        data: body,
      });
    },
    async markSiteMessageRead(id) {
      await request<void>({ method: 'PUT', url: NOTIFY_ENDPOINTS.siteMessageRead(id) });
    },
    async markSiteMessagesRead(ids) {
      await request<void>({
        method: 'PUT',
        url: NOTIFY_ENDPOINTS.siteMessagesReadBatch,
        data: { ids },
      });
    },
    pageCurrentAnnouncements(body) {
      return request<PageResp<CurrentAnnouncementResp>>({
        method: 'POST',
        url: NOTIFY_ENDPOINTS.announcementsCurrentPage,
        data: body,
      });
    },
    listCurrentPopupAnnouncements() {
      return request<CurrentAnnouncementResp[]>({
        method: 'GET',
        url: NOTIFY_ENDPOINTS.announcementsCurrentPopup,
      });
    },
    async markAnnouncementRead(id) {
      await request<void>({ method: 'PUT', url: NOTIFY_ENDPOINTS.announcementRead(id) });
    },
  };
}

/** 未读数轮询。定时器可注入，便于测试。 */
export interface UnreadPollerDeps {
  fetchUnread: () => Promise<number>;
  onCount: (count: number) => void;
  onError?: (error: unknown) => void;
  intervalMs?: number;
  setIntervalFn?: (handler: () => void, timeout: number) => unknown;
  clearIntervalFn?: (handle: unknown) => void;
}

export interface UnreadPoller {
  start(): void;
  stop(): void;
  isRunning(): boolean;
}

export const DEFAULT_UNREAD_POLL_INTERVAL_MS = 60_000;

export function createUnreadPoller(deps: UnreadPollerDeps): UnreadPoller {
  const intervalMs = deps.intervalMs ?? DEFAULT_UNREAD_POLL_INTERVAL_MS;
  const setIntervalFn =
    deps.setIntervalFn ?? ((handler: () => void, timeout: number) => setInterval(handler, timeout));
  const clearIntervalFn =
    deps.clearIntervalFn ?? ((handle: unknown) => clearInterval(handle as ReturnType<typeof setInterval>));

  let handle: unknown = null;
  let running = false;

  const tick = (): void => {
    deps
      .fetchUnread()
      .then((count) => deps.onCount(count))
      .catch((error) => deps.onError?.(error));
  };

  return {
    start() {
      if (running) return;
      running = true;
      tick();
      handle = setIntervalFn(tick, intervalMs);
    },
    stop() {
      if (!running) return;
      running = false;
      if (handle !== null) clearIntervalFn(handle);
      handle = null;
    },
    isRunning() {
      return running;
    },
  };
}
