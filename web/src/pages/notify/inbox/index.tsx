import { CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { Alert, Button, Modal, Space, Tabs, theme as antdTheme } from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SiteMessageDetail } from '@/components/site-message-list/site-message-detail';
import { SiteMessageList } from '@/components/site-message-list/site-message-list';
import type { SiteMessageListService } from '@/components/site-message-list/site-message-list.types';
import { useNebulaI18n } from '@/hooks/use-nebula-i18n';
import { useNotice } from '@/hooks/use-notice';
import { notifyService } from '@/services/notify';
import type { NotifyService } from '@/services/notify';
import { useAuthStore } from '@/stores/auth-store';
import { useNotifyStore } from '@/stores/notify';
import type { SiteMessageResp } from '@/types/notify';
import { CurrentAnnouncementTable } from './current-announcement-table';

export interface InboxService extends SiteMessageListService {
  readonly markSiteMessagesRead: NotifyService['markSiteMessagesRead'];
  readonly markSiteMessagesUnread: NotifyService['markSiteMessagesUnread'];
  readonly pageCurrentAnnouncements: NotifyService['pageCurrentAnnouncements'];
  readonly markAnnouncementRead: NotifyService['markAnnouncementRead'];
}

export interface NotificationInboxPageProps {
  readonly service?: InboxService;
}

type BatchAction = 'read' | 'unread';

export function NotificationInboxPage({ service = notifyService }: NotificationInboxPageProps) {
  const { t } = useNebulaI18n();
  const notice = useNotice();
  const { token } = antdTheme.useToken();
  const currentUserId = useAuthStore((state) => state.user?.id);
  const incrementUnread = useNotifyStore((state) => state.incrementUnread);
  const decrementUnread = useNotifyStore((state) => state.decrementUnread);

  const [searchParams, setSearchParams] = useSearchParams();
  const [messages, setMessages] = useState<readonly SiteMessageResp[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [batchError, setBatchError] = useState<string>();
  const [batchAction, setBatchAction] = useState<BatchAction>();
  // 批量动作后让列表重新从第一页拉取，避免列表与后端状态漂移
  const [reloadToken, setReloadToken] = useState(0);
  const closedMessageIdsRef = useRef(new Set<string>());
  // 见过的消息 id：用于区分「这条被删了/被筛掉了」与「列表还没加载到它」
  const seenMessageIdsRef = useRef(new Set<string>());

  const searchMessageId = searchParams.get('messageId') ?? undefined;
  const [activeMessageId, setActiveMessageId] = useState<string | undefined>(searchMessageId);
  // 深链进来的消息：只在这里补一次「打开即已读」，点击列表行由列表自己处理
  const [deepLinkMessageId] = useState(() => searchMessageId);
  const deepLinkMarkedRef = useRef(false);

  const activeMessage = useMemo(
    () => (activeMessageId ? messages.find((message) => message.id === activeMessageId) : undefined),
    [activeMessageId, messages],
  );

  const selectMessage = useCallback((message: SiteMessageResp) => {
    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.set('messageId', message.id);
    setSearchParams(nextSearchParams);
    setActiveMessageId(message.id);
    closedMessageIdsRef.current.delete(message.id);
  }, [searchParams, setSearchParams]);

  const closeDetail = useCallback(() => {
    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.delete('messageId');
    setSearchParams(nextSearchParams, { replace: true });
    if (activeMessageId) closedMessageIdsRef.current.add(activeMessageId);
    setActiveMessageId(undefined);
  }, [activeMessageId, searchParams, setSearchParams]);

  const handleDataLoaded = useCallback((nextMessages: readonly SiteMessageResp[]) => {
    for (const message of nextMessages) seenMessageIdsRef.current.add(message.id);
    setMessages(nextMessages);
    setDataLoaded(true);
  }, []);

  useEffect(() => {
    setActiveMessageId(searchMessageId);
    if (searchMessageId) closedMessageIdsRef.current.delete(searchMessageId);
  }, [searchMessageId]);

  // 目标消息被删除或已被筛掉时收起详情，避免停在一个永远加载不出来的骨架屏上
  useEffect(() => {
    if (!dataLoaded || !activeMessageId) return;
    if (!seenMessageIdsRef.current.has(activeMessageId)) return;
    if (messages.some((message) => message.id === activeMessageId)) return;
    if (closedMessageIdsRef.current.has(activeMessageId)) return;
    closeDetail();
  }, [activeMessageId, closeDetail, dataLoaded, messages]);

  useEffect(() => {
    if (!deepLinkMessageId || deepLinkMarkedRef.current) return;
    const message = messages.find((item) => item.id === deepLinkMessageId);
    if (!message || message.readStatus) return;
    deepLinkMarkedRef.current = true;
    void service.markSiteMessageRead(deepLinkMessageId).then(
      () => {
        decrementUnread();
        setReloadToken((current) => current + 1);
      },
      () => {
        deepLinkMarkedRef.current = false;
      },
    );
  }, [decrementUnread, deepLinkMessageId, messages, service]);

  const applyBatchAction = useCallback((
    selectedMessages: readonly SiteMessageResp[],
    clearSelection: () => void,
    action: BatchAction,
  ) => {
    if (selectedMessages.length === 0) return;

    const messageIds = selectedMessages.map((message) => message.id);
    const changedCount = selectedMessages.filter((message) => (
      action === 'read' ? !message.readStatus : message.readStatus
    )).length;
    setBatchError(undefined);
    setBatchAction(action);

    const request = action === 'read'
      ? service.markSiteMessagesRead(messageIds)
      : service.markSiteMessagesUnread(messageIds);

    void request.then(
      () => {
        for (let index = 0; index < changedCount; index += 1) {
          if (action === 'read') decrementUnread();
          else incrementUnread();
        }
        notice.success(t(action === 'read' ? 'siteMessage.batch.markReadSuccess' : 'siteMessage.batch.markUnreadSuccess'));
        clearSelection();
        setReloadToken((current) => current + 1);
      },
      () => {
        setBatchError(t(action === 'read' ? 'siteMessage.batch.markReadFailed' : 'siteMessage.batch.markUnreadFailed'));
      },
    ).finally(() => {
      setBatchAction((current) => (current === action ? undefined : current));
    });
  }, [decrementUnread, incrementUnread, notice, service, t]);

  return (
    <section className="flex h-full min-h-0 flex-col">
      <Tabs
        defaultActiveKey="messages"
        items={[
          {
            key: 'messages',
            label: t('siteMessage.tabs.messages'),
            children: (
              <div className="min-h-0">
                {batchError ? <Alert className="mb-3" showIcon title={batchError} type="error" /> : null}
                <SiteMessageList
                  service={service}
                  receiverUserId={currentUserId}
                  selectable
                  showMessageActions
                  selectedMessageId={activeMessageId}
                  reloadToken={reloadToken}
                  onDataLoaded={handleDataLoaded}
                  onSelect={selectMessage}
                  renderBatchActions={(selectedMessages, clearSelection) => (
                    <Space size="small">
                      <Button
                        size="small"
                        icon={<CheckOutlined />}
                        aria-label={t('siteMessage.batch.markRead')}
                        disabled={batchAction !== undefined}
                        loading={batchAction === 'read'}
                        onClick={() => applyBatchAction(selectedMessages, clearSelection, 'read')}
                      >
                        {t('siteMessage.batch.markRead')}
                      </Button>
                      <Button
                        size="small"
                        icon={<CloseOutlined />}
                        aria-label={t('siteMessage.batch.markUnread')}
                        disabled={batchAction !== undefined}
                        loading={batchAction === 'unread'}
                        onClick={() => applyBatchAction(selectedMessages, clearSelection, 'unread')}
                      >
                        {t('siteMessage.batch.markUnread')}
                      </Button>
                    </Space>
                  )}
                />

                {activeMessageId ? (
                  <Modal
                    title={t('siteMessage.message.detailTitle')}
                    aria-label={t('siteMessage.message.detailTitle')}
                    open
                    width={token.screenSM}
                    footer={null}
                    onCancel={closeDetail}
                    destroyOnHidden
                  >
                    <SiteMessageDetail message={activeMessage} />
                  </Modal>
                ) : null}
              </div>
            ),
          },
          {
            key: 'announcements',
            label: t('siteMessage.tabs.announcements'),
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
