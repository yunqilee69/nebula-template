import { CheckOutlined, CloseOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import { Alert, Button, Checkbox, Empty, Popconfirm, Segmented, Select, Space, Spin, Tag, Typography, theme as antdTheme } from 'antd';
import { createStyles } from 'antd-style';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNebulaI18n } from '@/hooks/use-nebula-i18n';
import { useNotice } from '@/hooks/use-notice';
import { useNotifyStore } from '@/stores/notify';
import type { SiteMessageCategoryResp, SiteMessageResp } from '@/types/notify';
import type { SiteMessageFilter, SiteMessageListProps } from './site-message-list.types';

const DEFAULT_PAGE_SIZE = 10;

const useStyles = createStyles(({ token }) => ({
  root: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: token.marginSM,
    marginBottom: token.marginSM,
  },
  filters: {
    display: 'flex',
    alignItems: 'center',
    gap: token.marginXS,
    minWidth: 0,
  },
  batchBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: token.marginSM,
    padding: `${token.paddingXS}px ${token.paddingSM}px`,
    marginBottom: token.marginSM,
    borderRadius: token.borderRadiusSM,
    backgroundColor: token.colorFillQuaternary,
  },
  batchActions: {
    display: 'flex',
    alignItems: 'center',
    gap: token.marginXS,
  },
  item: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: token.marginXS,
    width: '100%',
    padding: `${token.paddingSM}px 0`,
    borderBottom: `1px solid ${token.colorSplit}`,
    color: 'inherit',
    cursor: 'pointer',
    '&:hover': {
      backgroundColor: token.colorFillQuaternary,
    },
    '&:focus-visible': {
      outline: `2px solid ${token.colorPrimaryBorder}`,
      outlineOffset: 2,
    },
  },
  itemSelected: {
    backgroundColor: token.colorPrimaryBg,
  },
  itemBody: {
    flex: 1,
    minWidth: 0,
  },
  itemHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: token.marginSM,
  },
  title: {
    flex: 1,
    minWidth: 0,
  },
  meta: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: token.marginSM,
    marginTop: token.marginXS,
  },
  time: {
    whiteSpace: 'nowrap',
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: token.marginXXS,
    flexShrink: 0,
  },
  footer: {
    display: 'flex',
    justifyContent: 'center',
    paddingTop: token.paddingSM,
  },
  state: {
    padding: `${token.paddingXL}px 0`,
    textAlign: 'center',
  },
}));

function replaceMessageReadStatus(
  messages: readonly SiteMessageResp[],
  messageId: string,
  readStatus: boolean,
): readonly SiteMessageResp[] {
  return messages.map((message) => (message.id === messageId ? { ...message, readStatus } : message));
}

/**
 * 站内信列表：已读状态分段筛选 + 类别筛选 + 全部已读 + 分页加载。
 *
 * <p>面板与「查看更多」全文页共用同一份实现，避免两处列表逐渐走样。
 * 详情展示由使用方决定（面板切视图，全文页展示正文）。</p>
 */
export function SiteMessageList({
  service,
  receiverUserId,
  onSelect,
  selectedMessageId,
  pageSize = DEFAULT_PAGE_SIZE,
  showMessageActions = false,
  selectable = false,
  renderBatchActions,
  reloadToken = 0,
  onDataLoaded,
}: SiteMessageListProps) {
  const { t } = useNebulaI18n();
  const notice = useNotice();
  const { token } = antdTheme.useToken();
  const { styles } = useStyles();
  const decrementUnread = useNotifyStore((state) => state.decrementUnread);
  const incrementUnread = useNotifyStore((state) => state.incrementUnread);
  const decrementUnreadBy = useNotifyStore((state) => state.decrementUnreadBy);

  const [filter, setFilter] = useState<SiteMessageFilter>('all');
  const [categoryCode, setCategoryCode] = useState<string>();
  const [messages, setMessages] = useState<readonly SiteMessageResp[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [actionError, setActionError] = useState<string>();
  const [markingAll, setMarkingAll] = useState(false);
  const [deletingMessageId, setDeletingMessageId] = useState<string>();
  const [categories, setCategories] = useState<readonly SiteMessageCategoryResp[]>([]);
  const [selectedMessageIds, setSelectedMessageIds] = useState<ReadonlySet<string>>(() => new Set());
  const requestSequenceRef = useRef(0);
  const pendingIdsRef = useRef(new Set<string>());

  const fetchPage = useCallback(async (targetPage: number) => {
    if (!receiverUserId) {
      setMessages([]);
      setTotal(0);
      setLoadError(false);
      setLoading(false);
      return;
    }

    const requestSequence = requestSequenceRef.current + 1;
    requestSequenceRef.current = requestSequence;
    setLoading(true);
    setLoadError(false);
    setActionError(undefined);
    if (targetPage === 1) setSelectedMessageIds(new Set());

    try {
      const result = await service.pageSiteMessages({
        pageNum: targetPage,
        pageSize,
        receiverUserId,
        ...(categoryCode ? { categoryCode } : {}),
        ...(filter === 'unread' ? { readStatus: false } : {}),
      });
      if (requestSequenceRef.current !== requestSequence) return;
      setMessages((current) => (targetPage === 1 ? result.data : [...current, ...result.data]));
      setTotal(result.total);
      setPage(targetPage);
    } catch {
      if (requestSequenceRef.current !== requestSequence) return;
      setLoadError(true);
      if (targetPage === 1) {
        setMessages([]);
        setTotal(0);
      }
    } finally {
      if (requestSequenceRef.current === requestSequence) setLoading(false);
    }
  }, [categoryCode, filter, pageSize, receiverUserId, service]);

  const loadCategories = useCallback(async () => {
    if (!receiverUserId) {
      setCategories([]);
      return;
    }
    try {
      const nextCategories = await service.listSiteMessageCategories();
      setCategories(nextCategories);
    } catch {
      // 类别下拉拿不到不影响看消息，静默降级为「全部类别」
      setCategories([]);
    }
  }, [receiverUserId, service]);

  useEffect(() => {
    void fetchPage(1);
  }, [fetchPage, reloadToken]);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories, reloadToken]);

  useEffect(() => {
    onDataLoaded?.(messages);
  }, [messages, onDataLoaded]);

  const categoryOptions = useMemo(() => categories.map((category) => {
    const name = category.name ?? category.code;
    const unreadCount = category.unreadCount ?? 0;
    return { value: category.code, label: unreadCount > 0 ? `${name} (${unreadCount})` : name };
  }), [categories]);

  const selectedMessages = useMemo(
    () => messages.filter((message) => selectedMessageIds.has(message.id)),
    [messages, selectedMessageIds],
  );

  const toggleSelection = useCallback((messageId: string, checked: boolean) => {
    setSelectedMessageIds((current) => {
      const next = new Set(current);
      if (checked) next.add(messageId);
      else next.delete(messageId);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedMessageIds(new Set());
  }, []);

  const allSelected = messages.length > 0 && selectedMessages.length === messages.length;
  const someSelected = selectedMessages.length > 0 && !allSelected;

  const openMessage = useCallback((message: SiteMessageResp) => {
    onSelect(message);
    if (message.readStatus || pendingIdsRef.current.has(message.id)) return;

    pendingIdsRef.current.add(message.id);
    setActionError(undefined);
    setMessages((current) => replaceMessageReadStatus(current, message.id, true));

    void service.markSiteMessageRead(message.id).then(
      () => {
        decrementUnread();
      },
      () => {
        setMessages((current) => replaceMessageReadStatus(current, message.id, false));
        setActionError(t('siteMessage.message.markReadFailed'));
      },
    ).finally(() => {
      pendingIdsRef.current.delete(message.id);
    });
  }, [decrementUnread, onSelect, service, t]);

  const markMessageUnread = useCallback((message: SiteMessageResp) => {
    setActionError(undefined);
    setMessages((current) => replaceMessageReadStatus(current, message.id, false));

    void service.markSiteMessageUnread(message.id).then(
      () => {
        incrementUnread();
      },
      () => {
        setMessages((current) => replaceMessageReadStatus(current, message.id, true));
        setActionError(t('siteMessage.message.markUnreadFailed'));
      },
    );
  }, [incrementUnread, service, t]);

  const deleteMessage = useCallback((message: SiteMessageResp) => {
    setActionError(undefined);
    setDeletingMessageId(message.id);

    void service.deleteSiteMessage(message.id).then(
      () => {
        setMessages((current) => current.filter((item) => item.id !== message.id));
        setTotal((current) => Math.max(0, current - 1));
        if (!message.readStatus) decrementUnread();
        void loadCategories();
      },
      () => setActionError(t('siteMessage.message.deleteFailed')),
    ).finally(() => {
      setDeletingMessageId((current) => (current === message.id ? undefined : current));
    });
  }, [decrementUnread, loadCategories, service, t]);

  const markAllRead = useCallback(async () => {
    setMarkingAll(true);
    setActionError(undefined);
    try {
      const affected = await service.markAllSiteMessagesRead(categoryCode ? { categoryCode } : {});
      decrementUnreadBy(affected);
      notice.success(t('siteMessage.filter.markAllReadSuccess'));
      await fetchPage(1);
      await loadCategories();
    } catch {
      setActionError(t('siteMessage.filter.markAllReadFailed'));
    } finally {
      setMarkingAll(false);
    }
  }, [categoryCode, decrementUnreadBy, fetchPage, loadCategories, notice, service, t]);

  const hasMore = messages.length < total;

  return (
    <div className={styles.root}>
      <div className={styles.toolbar}>
        <div className={styles.filters}>
          {selectable && messages.length > 0 ? (
            <Checkbox
              checked={allSelected}
              indeterminate={someSelected}
              onChange={(event) => setSelectedMessageIds(
                event.target.checked ? new Set(messages.map((message) => message.id)) : new Set(),
              )}
            >
              {t('siteMessage.batch.selectAll')}
            </Checkbox>
          ) : null}
          <Segmented
            size="small"
            value={filter}
            onChange={(value) => setFilter(value as SiteMessageFilter)}
            options={[
              { label: t('siteMessage.filter.all'), value: 'all' },
              { label: t('siteMessage.filter.unreadOnly'), value: 'unread' },
            ]}
          />
          <Select<string>
            allowClear
            size="small"
            aria-label={t('siteMessage.filter.categoryAriaLabel')}
            placeholder={t('siteMessage.filter.categoryPlaceholder')}
            value={categoryCode}
            options={categoryOptions}
            onChange={(value) => setCategoryCode(value ?? undefined)}
            popupMatchSelectWidth={false}
          />
        </div>
        <Popconfirm
          title={t('siteMessage.filter.markAllReadConfirmTitle')}
          description={t('siteMessage.filter.markAllReadConfirmContent')}
          onConfirm={() => void markAllRead()}
        >
          <Button
            size="small"
            icon={<CheckOutlined />}
            loading={markingAll}
            disabled={total === 0}
          >
            {t('siteMessage.filter.markAllRead')}
          </Button>
        </Popconfirm>
      </div>

      {actionError ? <Alert className="mb-2" showIcon type="error" title={actionError} /> : null}

      {selectable && renderBatchActions && selectedMessages.length > 0 ? (
        <div className={styles.batchBar}>
          <Typography.Text type="secondary">
            {selectedMessages.length} {t('siteMessage.batch.selectedCountSuffix')}
          </Typography.Text>
          <div className={styles.batchActions}>
            {renderBatchActions(selectedMessages, clearSelection)}
          </div>
        </div>
      ) : null}

      {loadError ? (
        <div className={styles.state}>
          <Space orientation="vertical" size={token.marginSM}>
            <Typography.Text type="danger">{t('siteMessage.message.loadFailed')}</Typography.Text>
            <Button icon={<ReloadOutlined />} onClick={() => void fetchPage(1)}>
              {t('siteMessage.message.reload')}
            </Button>
          </Space>
        </div>
      ) : null}

      {!loadError && loading && messages.length === 0 ? (
        <div className={styles.state}>
          <Spin />
        </div>
      ) : null}

      {!loadError && !loading && messages.length === 0 ? (
        <div className={styles.state}>
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('siteMessage.message.empty')} />
        </div>
      ) : null}

      <div role="list">
        {messages.map((message) => {
          const categoryName = message.categoryName ?? message.categoryCode;
          return (
            <div
              key={message.id}
              role="listitem"
              className={`${styles.item} ${message.id === selectedMessageId ? styles.itemSelected : ''}`}
              tabIndex={0}
              aria-label={message.title}
              onClick={() => openMessage(message)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  openMessage(message);
                }
              }}
            >
              {selectable ? (
                <Checkbox
                  checked={selectedMessageIds.has(message.id)}
                  aria-label={`${t('siteMessage.batch.select')} ${message.title}`}
                  onClick={(event) => event.stopPropagation()}
                  onChange={(event) => toggleSelection(message.id, event.target.checked)}
                />
              ) : null}
              <div className={styles.itemBody}>
                <div className={styles.itemHeader}>
                  <Typography.Text className={styles.title} strong={!message.readStatus} ellipsis={{ tooltip: message.title }}>
                    {message.title}
                  </Typography.Text>
                  {showMessageActions ? (
                    <div className={styles.actions}>
                      <Button
                        type="link"
                        size="small"
                        icon={<CloseOutlined />}
                        aria-label={`${t('siteMessage.message.markUnread')} ${message.title}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          markMessageUnread(message);
                        }}
                      >
                        {t('siteMessage.message.markUnread')}
                      </Button>
                      <Popconfirm
                        title={t('siteMessage.message.deleteConfirmTitle')}
                        description={t('siteMessage.message.deleteConfirmContent')}
                        okButtonProps={{ danger: true }}
                        onConfirm={() => deleteMessage(message)}
                      >
                        <Button
                          type="link"
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                          aria-label={`${t('siteMessage.message.delete')} ${message.title}`}
                          loading={deletingMessageId === message.id}
                          onClick={(event) => event.stopPropagation()}
                        >
                          {t('siteMessage.message.delete')}
                        </Button>
                      </Popconfirm>
                    </div>
                  ) : null}
                </div>
                <div className={styles.meta}>
                  {categoryName ? <Tag>{categoryName}</Tag> : <span />}
                  <Typography.Text type="secondary" className={styles.time}>
                    {message.createTime ?? t('siteMessage.message.unknownTime')}
                  </Typography.Text>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {hasMore ? (
        <div className={styles.footer}>
          <Button type="link" loading={loading} onClick={() => void fetchPage(page + 1)}>
            {t('siteMessage.message.loadMore')}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
