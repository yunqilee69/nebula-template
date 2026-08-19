import { Alert, Modal, Skeleton, Tabs, Tag, Typography } from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { NebulaPageResp } from '@/components/nebula-pro-table';
import { notifyService } from '@/services/notify';
import type { NotifyService } from '@/services/notify';
import { useAuthStore } from '@/stores/auth-store';
import { useNotifyStore } from '@/stores/notify';
import type { SiteMessageResp } from '@/types/notify';
import { SiteMessageTable } from './site-message-table';
import type { SiteMessageTableHandle } from './site-message-table';
import { CurrentAnnouncementTable } from './current-announcement-table';

export interface InboxService {
  readonly pageSiteMessages: (
    data: Parameters<NotifyService['pageSiteMessages']>[0],
  ) => Promise<NebulaPageResp<SiteMessageResp>>;
  readonly deleteSiteMessage: NotifyService['deleteSiteMessage'];
  readonly markSiteMessageRead: NotifyService['markSiteMessageRead'];
  readonly markSiteMessageUnread: NotifyService['markSiteMessageUnread'];
  readonly markSiteMessagesRead: NotifyService['markSiteMessagesRead'];
  readonly markSiteMessagesUnread: NotifyService['markSiteMessagesUnread'];
  readonly pageCurrentAnnouncements: NotifyService['pageCurrentAnnouncements'];
  readonly markAnnouncementRead: NotifyService['markAnnouncementRead'];
}

export interface NotificationInboxPageProps {
  readonly service?: InboxService;
}

interface MessageDetailProps {
  readonly message: SiteMessageResp | undefined;
}

function MessageDetail({ message }: MessageDetailProps) {
  if (!message) {
    return (
      <Skeleton active paragraph={{ rows: 4 }} title={false} />
    );
  }

  return (
    <article>
      <header className="flex items-start justify-between gap-4">
        <div>
          <Typography.Title level={4}>
            {message.title}
          </Typography.Title>
          <div className="flex flex-wrap gap-3">
            <Typography.Text type="secondary">{message.createTime ?? '时间未知'}</Typography.Text>
            {message.readTime && (
              <Typography.Text type="secondary">已读于 {message.readTime}</Typography.Text>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Tag color={message.readStatus ? 'default' : 'blue'} variant="filled">
            {message.readStatus ? '已读' : '未读'}
          </Tag>
        </div>
      </header>
      <Typography.Paragraph className="mt-4 whitespace-pre-wrap break-words">
        {message.content}
      </Typography.Paragraph>
    </article>
  );
}

function updateMessageReadStatus(
  messages: readonly SiteMessageResp[],
  messageIds: readonly string[],
  readStatus: boolean,
): readonly SiteMessageResp[] {
  const messageIdSet = new Set(messageIds);
  return messages.map((message) => (
    messageIdSet.has(message.id) ? { ...message, readStatus, readTime: readStatus ? message.readTime : undefined } : message
  ));
}

type PendingReadStatusAction = 'read' | 'unread';

export function NotificationInboxPage({ service = notifyService }: NotificationInboxPageProps) {
  const currentUserId = useAuthStore((state) => state.user?.id);
  const incrementUnread = useNotifyStore((state) => state.incrementUnread);
  const decrementUnread = useNotifyStore((state) => state.decrementUnread);
  const [searchParams, setSearchParams] = useSearchParams();
  const [messages, setMessages] = useState<readonly SiteMessageResp[]>([]);
  const [readError, setReadError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletingMessageId, setDeletingMessageId] = useState<string>();
  const [pendingReadStatusAction, setPendingReadStatusAction] = useState<PendingReadStatusAction>();
  const tableRef = useRef<SiteMessageTableHandle | null>(null);
  const markedReadMessageIdsRef = useRef(new Set<string>());
  const pendingReadMessageIdsRef = useRef(new Set<string>());
  const searchMessageId = searchParams.get('messageId') ?? undefined;
  const [activeMessageId, setActiveMessageId] = useState<string | undefined>(searchMessageId);
  const activeMessageIdRef = useRef<string | undefined>(searchMessageId);

  const syncActiveMessageId = useCallback((messageId: string | undefined) => {
    activeMessageIdRef.current = messageId;
    setActiveMessageId(messageId);
  }, []);

  const selectedMessage = useMemo(
    () => activeMessageId ? messages.find((message) => message.id === activeMessageId) : undefined,
    [activeMessageId, messages],
  );

  const handleDataLoaded = useCallback((nextMessages: readonly SiteMessageResp[]) => {
    setMessages(nextMessages);
  }, []);

  const selectMessage = useCallback((message: SiteMessageResp) => {
    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.set('messageId', message.id);
    setSearchParams(nextSearchParams);
    syncActiveMessageId(message.id);
    setReadError(null);
    setDeleteError(null);
  }, [searchParams, setSearchParams, syncActiveMessageId]);

  const closeDetail = useCallback(() => {
    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.delete('messageId');
    setSearchParams(nextSearchParams, { replace: true });
    syncActiveMessageId(undefined);
  }, [searchParams, setSearchParams, syncActiveMessageId]);

  const deleteMessage = useCallback((message: SiteMessageResp) => {
    const messageId = message.id;
    setDeleteError(null);
    setDeletingMessageId(messageId);

    void service.deleteSiteMessage(messageId).then(
      () => {
        setMessages((currentMessages) => currentMessages.filter((message) => message.id !== messageId));
        if (activeMessageIdRef.current === messageId) {
          closeDetail();
        }
        void tableRef.current?.reload();
      },
      () => {
        setDeleteError('删除消息失败，请重试');
      },
    ).finally(() => {
      setDeletingMessageId((currentMessageId) => currentMessageId === messageId ? undefined : currentMessageId);
    });
  }, [closeDetail, service]);

  const markMessagesRead = useCallback((selectedMessages: readonly SiteMessageResp[]) => {
    if (selectedMessages.length === 0) return;

    const messageIds = selectedMessages.map((message) => message.id);
    const changedCount = selectedMessages.filter((message) => !message.readStatus).length;
    setReadError(null);
    setDeleteError(null);
    setPendingReadStatusAction('read');

    void service.markSiteMessagesRead(messageIds).then(
      () => {
        for (const messageId of messageIds) {
          markedReadMessageIdsRef.current.add(messageId);
        }
        for (let index = 0; index < changedCount; index += 1) {
          decrementUnread();
        }
        setMessages((currentMessages) => updateMessageReadStatus(currentMessages, messageIds, true));
        void tableRef.current?.reload();
      },
      () => {
        setReadError('批量标记已读失败，请重试');
      },
    ).finally(() => {
      setPendingReadStatusAction((currentAction) => currentAction === 'read' ? undefined : currentAction);
    });
  }, [decrementUnread, service]);

  const markMessagesUnread = useCallback((selectedMessages: readonly SiteMessageResp[]) => {
    if (selectedMessages.length === 0) return;

    const messageIds = selectedMessages.map((message) => message.id);
    const changedCount = selectedMessages.filter((message) => message.readStatus).length;
    setReadError(null);
    setDeleteError(null);
    setPendingReadStatusAction('unread');

    void service.markSiteMessagesUnread(messageIds).then(
      () => {
        for (const messageId of messageIds) {
          markedReadMessageIdsRef.current.delete(messageId);
        }
        for (let index = 0; index < changedCount; index += 1) {
          incrementUnread();
        }
        setMessages((currentMessages) => updateMessageReadStatus(currentMessages, messageIds, false));
        void tableRef.current?.reload();
      },
      () => {
        setReadError('批量标记未读失败，请重试');
      },
    ).finally(() => {
      setPendingReadStatusAction((currentAction) => currentAction === 'unread' ? undefined : currentAction);
    });
  }, [incrementUnread, service]);

  useEffect(() => {
    syncActiveMessageId(searchMessageId);
  }, [searchMessageId, syncActiveMessageId]);

  useEffect(() => {
    if (!selectedMessage || selectedMessage.readStatus) return;
    if (markedReadMessageIdsRef.current.has(selectedMessage.id)) return;
    if (pendingReadMessageIdsRef.current.has(selectedMessage.id)) return;

    const messageId = selectedMessage.id;
    pendingReadMessageIdsRef.current.add(messageId);
    setReadError(null);

    void service.markSiteMessagesRead([messageId]).then(
      () => {
        markedReadMessageIdsRef.current.add(messageId);
        decrementUnread();
        setMessages((currentMessages) => updateMessageReadStatus(currentMessages, [messageId], true));
      },
      () => {
        setReadError('标记已读失败，请重试');
      },
    ).finally(() => {
      pendingReadMessageIdsRef.current.delete(messageId);
    });
  }, [decrementUnread, selectedMessage, service]);

  return (
    <section className="flex h-full min-h-0 flex-col">
      <Tabs
        defaultActiveKey="messages"
        items={[
          {
            key: 'messages',
            label: '站内信',
            children: (
              <div className="min-h-0">
                {readError && <Alert className="mb-3" showIcon title={readError} type="error" />}
                {deleteError && <Alert className="mb-3" showIcon title={deleteError} type="error" />}
                <SiteMessageTable
                  ref={tableRef}
                  currentUserId={currentUserId}
                  deletingMessageId={deletingMessageId}
                  pendingReadStatusAction={pendingReadStatusAction}
                  selectedMessageId={activeMessageId}
                  service={service}
                  onDataLoaded={handleDataLoaded}
                  onDelete={deleteMessage}
                  onMarkRead={markMessagesRead}
                  onMarkUnread={markMessagesUnread}
                  onSelect={selectMessage}
                />

                {selectedMessage ? (
                  <Modal
                    title="消息详情"
                    aria-label="消息详情"
                    open
                    footer={null}
                    onCancel={closeDetail}
                    destroyOnHidden
                  >
                    <MessageDetail
                      message={selectedMessage}
                    />
                  </Modal>
                ) : null}
              </div>
            ),
          },
          {
            key: 'announcements',
            label: '公告',
            children: (
              <CurrentAnnouncementTable service={service} />
            ),
          },
        ]}
      />
    </section>
  );
}

export default NotificationInboxPage;
