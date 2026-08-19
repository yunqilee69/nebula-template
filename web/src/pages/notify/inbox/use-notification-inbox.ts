import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { NebulaPageResp } from '@/components/nebula-pro-table/params';
import type { NotifyService } from '@/services/notify';
import { useAuthStore } from '@/stores/auth-store';
import { useNotifyStore } from '@/stores/notify';
import type { SiteMessagePageReq, SiteMessageResp } from '@/types/notify';

export type InboxFilter = 'all' | 'unread' | 'read';

export interface InboxService {
  readonly pageSiteMessages: (
    data: SiteMessagePageReq,
  ) => Promise<NebulaPageResp<SiteMessageResp>>;
  readonly deleteSiteMessage: NotifyService['deleteSiteMessage'];
  readonly markSiteMessageRead: NotifyService['markSiteMessageRead'];
}

interface UseNotificationInboxResult {
  readonly filter: InboxFilter;
  readonly loading: boolean;
  readonly loadError: string | null;
  readonly messages: readonly SiteMessageResp[];
  readonly page: number;
  readonly pageSize: number;
  readonly deletingMessageId: string | undefined;
  readonly deleteError: string | null;
  readonly pendingReadIds: ReadonlySet<string>;
  readonly readError: string | null;
  readonly selectedMessage: SiteMessageResp | undefined;
  readonly total: number;
  readonly changeFilter: (filter: InboxFilter) => void;
  readonly changePage: (page: number) => void;
  readonly deleteMessage: (message: SiteMessageResp) => void;
  readonly reload: () => void;
  readonly selectMessage: (message: SiteMessageResp) => void;
}

const PAGE_SIZE = 10;

function buildPageRequest(
  filter: InboxFilter,
  page: number,
  receiverUserId: string,
): SiteMessagePageReq {
  const baseRequest = { pageNum: page, pageSize: PAGE_SIZE, receiverUserId };

  switch (filter) {
    case 'all':
      return baseRequest;
    case 'unread':
      return { ...baseRequest, readStatus: false };
    case 'read':
      return { ...baseRequest, readStatus: true };
  }
}

function updateReadStatus(
  messages: readonly SiteMessageResp[],
  messageId: string,
  readStatus: boolean,
): readonly SiteMessageResp[] {
  return messages.map((message) => (
    message.id === messageId ? { ...message, readStatus } : message
  ));
}

export function useNotificationInbox(service: InboxService): UseNotificationInboxResult {
  const receiverUserId = useAuthStore((state) => state.user?.id);
  const decrementUnread = useNotifyStore((state) => state.decrementUnread);
  const [filter, setFilter] = useState<InboxFilter>('all');
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [messages, setMessages] = useState<readonly SiteMessageResp[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [readError, setReadError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletingMessageId, setDeletingMessageId] = useState<string>();
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [pendingReadIds, setPendingReadIds] = useState<ReadonlySet<string>>(new Set());
  const pendingReadIdsRef = useRef(new Set<string>());
  const requestSequenceRef = useRef(0);

  useEffect(() => {
    if (!receiverUserId) {
      setMessages([]);
      setTotal(0);
      setSelectedMessageId(null);
      return;
    }

    const requestSequence = requestSequenceRef.current + 1;
    requestSequenceRef.current = requestSequence;
    setLoading(true);
    setLoadError(null);

    void service.pageSiteMessages(buildPageRequest(filter, page, receiverUserId))
      .then((result) => {
        if (requestSequenceRef.current !== requestSequence) {
          return;
        }

        setMessages(result.data);
        setTotal(result.total);
        setSelectedMessageId((currentId) => (
          currentId && result.data.some((message) => message.id === currentId)
            ? currentId
            : null
        ));
      })
      .catch(() => {
        if (requestSequenceRef.current === requestSequence) {
          setMessages([]);
          setTotal(0);
          setSelectedMessageId(null);
          setLoadError('消息加载失败，请重试');
        }
      })
      .finally(() => {
        if (requestSequenceRef.current === requestSequence) {
          setLoading(false);
        }
      });
  }, [filter, page, receiverUserId, reloadKey, service]);

  const selectedMessage = useMemo(
    () => messages.find((message) => message.id === selectedMessageId),
    [messages, selectedMessageId],
  );

  const changeFilter = useCallback((nextFilter: InboxFilter) => {
    setFilter(nextFilter);
    setPage(1);
    setReadError(null);
    setDeleteError(null);
  }, []);

  const changePage = useCallback((nextPage: number) => {
    setPage(nextPage);
    setReadError(null);
    setDeleteError(null);
  }, []);

  const reload = useCallback(() => {
    setReloadKey((currentKey) => currentKey + 1);
  }, []);

  const selectMessage = useCallback((message: SiteMessageResp) => {
    setSelectedMessageId(message.id);
    setReadError(null);

    if (message.readStatus || pendingReadIdsRef.current.has(message.id)) {
      return;
    }

    pendingReadIdsRef.current.add(message.id);
    setPendingReadIds(new Set(pendingReadIdsRef.current));
    setMessages((currentMessages) => updateReadStatus(currentMessages, message.id, true));

    void service.markSiteMessageRead(message.id)
      .then(() => {
        decrementUnread();
      })
      .catch(() => {
        setMessages((currentMessages) => updateReadStatus(currentMessages, message.id, false));
        setReadError('标记已读失败，请重试');
      })
      .finally(() => {
        pendingReadIdsRef.current.delete(message.id);
        setPendingReadIds(new Set(pendingReadIdsRef.current));
      });
  }, [decrementUnread, service]);

  const deleteMessage = useCallback((message: SiteMessageResp) => {
    setDeleteError(null);
    setDeletingMessageId(message.id);

    void service.deleteSiteMessage(message.id)
      .then(() => {
        setMessages((currentMessages) => currentMessages.filter(({ id }) => id !== message.id));
        setTotal((currentTotal) => Math.max(0, currentTotal - 1));
        setSelectedMessageId((currentId) => (currentId === message.id ? null : currentId));
      })
      .catch(() => {
        setDeleteError('删除消息失败，请重试');
      })
      .finally(() => {
        setDeletingMessageId((currentId) => (currentId === message.id ? undefined : currentId));
      });
  }, [service]);

  return {
    filter,
    loading,
    loadError,
    messages,
    page,
    pageSize: PAGE_SIZE,
    deletingMessageId,
    deleteError,
    pendingReadIds,
    readError,
    selectedMessage,
    total,
    changeFilter,
    changePage,
    deleteMessage,
    reload,
    selectMessage,
  };
}
