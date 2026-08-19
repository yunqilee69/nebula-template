import { BellOutlined } from '@ant-design/icons';
import { Badge, Button, Dropdown, Typography } from 'antd';
import type { MenuProps } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createStyles } from 'antd-style';
import type { NotifyService } from '@/services/notify';
import { notifyService } from '@/services/notify';
import { useAuthStore } from '@/stores/auth-store';
import { useNotifyStore } from '@/stores/notify';
import type { SiteMessageResp } from '@/types/notify';

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
  state: {
    paddingBlock: token.paddingXS,
    color: token.colorTextSecondary,
    textAlign: 'center' as const,
  },
  message: {
    minWidth: 0,
    paddingBlock: token.paddingXXS,
  },
  messageTitle: {
    display: 'block',
    overflow: 'hidden',
    color: token.colorText,
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  messageMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: token.marginXS,
    marginTop: token.marginXXS,
  },
  unreadStatus: {
    color: token.colorPrimary,
  },
}));

const MESSAGE_ITEM_KEY_PREFIX = 'message:';

type PreviewState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'loading' }
  | { readonly kind: 'empty' }
  | { readonly kind: 'error' }
  | { readonly kind: 'ready'; readonly messages: readonly SiteMessageResp[] };

function assertNever(value: never): never {
  throw new TypeError(`Unexpected notification preview state: ${JSON.stringify(value)}`);
}

export interface NotificationBellService {
  readonly getUnreadSiteMessageCount: NotifyService['getUnreadSiteMessageCount'];
  readonly pageSiteMessages: NotifyService['pageSiteMessages'];
}

interface NotificationBellProps {
  readonly service?: NotificationBellService;
  readonly onOpenInboxTab?: (path: string) => void;
}

export function NotificationBell({ service = notifyService, onOpenInboxTab }: NotificationBellProps) {
  const navigate = useNavigate();
  const userId = useAuthStore((state) => state.user?.id);
  const unreadCount = useNotifyStore((state) => state.unreadCount);
  const setUnreadCount = useNotifyStore((state) => state.setUnreadCount);
  const [unreadRefreshFailed, setUnreadRefreshFailed] = useState(false);
  const [open, setOpen] = useState(false);
  const [previewState, setPreviewState] = useState<PreviewState>({ kind: 'idle' });
  const { styles } = useStyles();
  const requestSequenceRef = useRef(0);
  const previewRequestSequenceRef = useRef(0);

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
    const intervalId = window.setInterval(refreshUnreadCount, 60_000);

    return () => {
      active = false;
      requestSequenceRef.current += 1;
      window.clearInterval(intervalId);
    };
  }, [service, setUnreadCount, userId]);

  useEffect(() => {
    previewRequestSequenceRef.current += 1;
    setPreviewState({ kind: 'idle' });
  }, [userId]);

  if (!userId) {
    return null;
  }

  const loadPreview = () => {
    const requestSequence = previewRequestSequenceRef.current + 1;
    previewRequestSequenceRef.current = requestSequence;
    setPreviewState({ kind: 'loading' });
    void service.pageSiteMessages({
      pageNum: 1,
      pageSize: 5,
      receiverUserId: userId,
      readStatus: false,
    }).then(
      (result) => {
        if (previewRequestSequenceRef.current === requestSequence) {
          const latestMessages = result.data.slice(0, 5);
          setPreviewState(latestMessages.length > 0
            ? { kind: 'ready', messages: latestMessages }
            : { kind: 'empty' });
        }
      },
      () => {
        if (previewRequestSequenceRef.current === requestSequence) {
          setPreviewState({ kind: 'error' });
        }
      },
    );
  };

  const stateItems: MenuProps['items'] = (() => {
    switch (previewState.kind) {
      case 'idle':
        return [];
      case 'loading':
        return [{ key: 'loading', disabled: true, label: <div className={styles.state}>正在加载消息</div> }];
      case 'empty':
        return [{
          key: 'empty',
          disabled: true,
          label: (
            <div className={styles.state}>
              <Typography.Text strong>暂无消息</Typography.Text>
              <br />
              <Typography.Text type="secondary">当前没有站内消息</Typography.Text>
            </div>
          ),
        }];
      case 'error':
        return [
          {
            key: 'error',
            disabled: true,
            label: (
              <div className={styles.state}>
                <Typography.Text strong type="danger">消息加载失败</Typography.Text>
                <br />
                <Typography.Text type="secondary">请检查网络后重试</Typography.Text>
              </div>
            ),
          },
          { key: 'retry', label: <Typography.Text>重新加载</Typography.Text> },
        ];
      case 'ready':
        return previewState.messages.map((message) => ({
          key: `${MESSAGE_ITEM_KEY_PREFIX}${message.id}`,
          label: (
            <div className={styles.message}>
              <Typography.Text className={styles.messageTitle} title={message.title}>
                {message.title}
              </Typography.Text>
              <span className={styles.messageMeta}>
                <Typography.Text type="secondary">{message.createTime ?? '时间未知'}</Typography.Text>
                <Typography.Text
                  type={message.readStatus ? 'secondary' : undefined}
                  className={message.readStatus ? undefined : styles.unreadStatus}
                >
                  {message.readStatus ? '已读' : '未读'}
                </Typography.Text>
              </span>
            </div>
          ),
        }));
      default:
        return assertNever(previewState);
    }
  })();

  const menuItems: MenuProps['items'] = [
    ...stateItems,
    ...(stateItems.length > 0 ? [{ type: 'divider' as const }] : []),
    { key: 'inbox', label: <Typography.Text strong>查看全部消息</Typography.Text> },
  ];

  const bellLabel = unreadRefreshFailed
    ? `通知，${unreadCount} 条未读，未读数量刷新失败`
    : `通知，${unreadCount} 条未读`;

  return (
    <Dropdown
      open={open}
      trigger={['click']}
      placement="bottomRight"
      menu={{
        items: menuItems,
        selectable: false,
        'aria-label': '通知消息',
        onClick: ({ key }) => {
          if (key === 'retry') {
            loadPreview();
          } else if (key === 'inbox') {
            setOpen(false);
            onOpenInboxTab?.('/notify/inbox');
            navigate('/notify/inbox');
          } else if (key.startsWith(MESSAGE_ITEM_KEY_PREFIX)) {
            const messageId = key.slice(MESSAGE_ITEM_KEY_PREFIX.length);
            setOpen(false);
            onOpenInboxTab?.('/notify/inbox');
            navigate(`/notify/inbox?messageId=${encodeURIComponent(messageId)}`);
          }
        },
      }}
      popupRender={(menu) => <div className={styles.popup}>{menu}</div>}
      onOpenChange={(nextOpen, info) => {
        if (!nextOpen && info.source === 'menu' && previewState.kind === 'error') {
          return;
        }
        setOpen(nextOpen);
        if (nextOpen) {
          loadPreview();
        }
      }}
    >
      <Badge count={unreadCount} overflowCount={99} size="small">
        <Button
          type="text"
          icon={<BellOutlined aria-hidden="true" />}
          aria-label={bellLabel}
          aria-haspopup="menu"
          className={styles.trigger}
        />
      </Badge>
    </Dropdown>
  );
}
