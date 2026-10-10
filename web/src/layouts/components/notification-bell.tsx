import { BellOutlined } from '@ant-design/icons';
import { Badge, Button, Popover } from 'antd';
import { createStyles } from 'antd-style';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { NotifyPreferenceService } from '@/api/notify-preference';
import { notifyPreferenceService } from '@/api/notify-preference';
import type { SiteMessageListService } from '@/components/site-message-list/site-message-list.types';
import type { NotifyService } from '@/services/notify';
import { notifyService } from '@/services/notify';
import { useAuthStore } from '@/stores/auth-store';
import { useNotifyStore } from '@/stores/notify';
import { NotificationPanel } from './notification-panel';

const useStyles = createStyles(({ token }) => ({
  trigger: {
    width: token.controlHeightLG,
    minWidth: token.controlHeightLG,
    height: token.controlHeightLG,
    padding: 0,
    borderRadius: token.borderRadiusLG,
    fontSize: token.fontSizeLG,
  },
  popup: {
    width: `min(${token.screenXS - token.paddingLG * 4}px, calc(100vw - ${token.paddingLG * 2}px))`,
  },
}));

/**
 * 兜底轮询间隔：实时通道（SSE）是主路径，轮询只用于通道不可用或标签页被挂起时
 * 补齐未读数，因此不再按分钟级频率请求后端。
 */
const FALLBACK_POLL_INTERVAL_MS = 300_000;

export interface NotificationBellService extends SiteMessageListService {
  readonly getUnreadSiteMessageCount: NotifyService['getUnreadSiteMessageCount'];
}

interface NotificationBellProps {
  readonly service?: NotificationBellService;
  readonly preferenceService?: NotifyPreferenceService;
  readonly onOpenInboxTab?: (path: string) => void;
}

export function NotificationBell({
  service = notifyService,
  preferenceService = notifyPreferenceService,
  onOpenInboxTab,
}: NotificationBellProps) {
  const navigate = useNavigate();
  const userId = useAuthStore((state) => state.user?.id);
  const unreadCount = useNotifyStore((state) => state.unreadCount);
  const setUnreadCount = useNotifyStore((state) => state.setUnreadCount);
  const [unreadRefreshFailed, setUnreadRefreshFailed] = useState(false);
  const [open, setOpen] = useState(false);
  // 每次打开自增：面板据此回到列表视图并重新拉取数据
  const [openToken, setOpenToken] = useState(0);
  const { styles } = useStyles();
  const requestSequenceRef = useRef(0);

  useEffect(() => {
    if (!userId) {
      requestSequenceRef.current += 1;
      setUnreadCount(0);
      setUnreadRefreshFailed(false);
      return;
    }

    let active = true;
    const refreshUnreadCount = () => {
      const requestSequence = requestSequenceRef.current + 1;
      requestSequenceRef.current = requestSequence;
      void service.getUnreadSiteMessageCount().then(
        (nextUnreadCount) => {
          if (active && requestSequenceRef.current === requestSequence) {
            setUnreadCount(nextUnreadCount);
            setUnreadRefreshFailed(false);
          }
        },
        () => {
          if (active && requestSequenceRef.current === requestSequence) {
            setUnreadRefreshFailed(true);
          }
        },
      );
    };

    refreshUnreadCount();
    const intervalId = window.setInterval(refreshUnreadCount, FALLBACK_POLL_INTERVAL_MS);
    // 实时通道在标签页后台/断线期间可能漏信号，恢复可见时补拉一次
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshUnreadCount();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      active = false;
      requestSequenceRef.current += 1;
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [service, setUnreadCount, userId]);

  if (!userId) {
    return null;
  }

  const openInbox = () => {
    setOpen(false);
    onOpenInboxTab?.('/notify/inbox');
    navigate('/notify/inbox');
  };

  const bellLabel = unreadRefreshFailed
    ? `通知，${unreadCount} 条未读，未读数量刷新失败`
    : `通知，${unreadCount} 条未读`;

  return (
    <Popover
      open={open}
      trigger="click"
      placement="bottomRight"
      arrow={false}
      content={(
        <div className={styles.popup}>
          <NotificationPanel
            service={service}
            preferenceService={preferenceService}
            receiverUserId={userId}
            openToken={openToken}
            onViewAll={openInbox}
            onClose={() => setOpen(false)}
          />
        </div>
      )}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) {
          setOpenToken((current) => current + 1);
        }
      }}
    >
      <Badge count={unreadCount} overflowCount={99} size="small">
        <Button
          type="text"
          icon={<BellOutlined aria-hidden="true" />}
          aria-label={bellLabel}
          aria-haspopup="dialog"
          className={styles.trigger}
        />
      </Badge>
    </Popover>
  );
}
