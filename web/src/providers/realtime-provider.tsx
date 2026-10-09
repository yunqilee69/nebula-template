import { useEffect, type PropsWithChildren } from 'react';
import { getStoredAccessToken } from '@/utils/auth/token-session';
import { refreshAccessToken } from '@/request/request';
import { notifyService } from '@/services/notify';
import {
  createSiteMessageStream,
  type SiteMessageStream,
  type SiteMessageStreamOptions,
} from '@/services/realtime-client';
import { useAuthStore } from '@/stores/auth-store';
import { useNotifyStore } from '@/stores/notify';

export interface RealtimeProviderProps extends PropsWithChildren {
  /** 可注入的流工厂，便于测试与按需降级（如未来切到 WebSocket）。 */
  readonly createStream?: (options: SiteMessageStreamOptions) => SiteMessageStream;
  /** 取当前未读数，由 provider 负责写入 store。SSE 信号与重连成功都会调用它。 */
  readonly refreshUnreadCount?: () => Promise<number>;
}

function fetchUnreadCount(): Promise<number> {
  return notifyService.getUnreadSiteMessageCount();
}

/**
 * 站内信实时通道生命周期。
 *
 * <p>以登录用户 id 为生命周期 key：登录建连，登出/切换用户/会话过期断连
 * （登出与会话过期都会清 authStore.user，因此这里统一覆盖）。</p>
 *
 * <p>信号只代表「有新消息」，收到后回拉未读数；连接建立（含重连成功）也回拉一次，
 * 用来补齐断线期间漏掉的信号。SSE 不可用时铃铛的兜底轮询保证最终一致。</p>
 */
export function RealtimeProvider({
  children,
  createStream = createSiteMessageStream,
  refreshUnreadCount = fetchUnreadCount,
}: RealtimeProviderProps) {
  const userId = useAuthStore((state) => state.user?.id);

  useEffect(() => {
    if (!userId) return;

    const refresh = () => {
      void refreshUnreadCount().then(
        (unreadCount) => {
          useNotifyStore.getState().setUnreadCount(unreadCount);
        },
        () => {
          // 拉取失败交由下一次信号/轮询兜底，不打断长连接
        },
      );
    };

    const stream = createStream({
      getToken: getStoredAccessToken,
      refreshToken: refreshAccessToken,
      onSignal: () => {
        useNotifyStore.getState().notifySignalReceived();
        refresh();
      },
      onOpen: refresh,
    });

    return () => stream.close();
  }, [createStream, refreshUnreadCount, userId]);

  return <>{children}</>;
}
