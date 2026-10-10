import { CloseOutlined, LeftOutlined } from '@ant-design/icons';
import { Button, Divider, Space, Typography } from 'antd';
import { createStyles } from 'antd-style';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { NotifyPreferenceService } from '@/api/notify-preference';
import { NotifyPreferenceCard } from '@/components/notify-preference-card/notify-preference-card';
import { SiteMessageDetail } from '@/components/site-message-list/site-message-detail';
import { SiteMessageList } from '@/components/site-message-list/site-message-list';
import type { SiteMessageListService } from '@/components/site-message-list/site-message-list.types';
import { useNebulaI18n } from '@/hooks/use-nebula-i18n';
import type { SiteMessageResp } from '@/types/notify';

/** 面板内的三个视图，同一容器内切换，不跳路由。 */
type NotificationPanelView = 'list' | 'detail' | 'preference';

const useStyles = createStyles(({ token }) => ({
  panel: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    maxHeight: `min(70vh, ${token.screenSM}px)`,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: token.marginSM,
    minHeight: token.controlHeightSM,
  },
  headerGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: token.marginXS,
    minWidth: 0,
  },
  divider: {
    margin: `${token.marginXS}px 0`,
  },
  body: {
    minHeight: 0,
    overflowY: 'auto',
  },
  hidden: {
    display: 'none',
  },
}));

export interface NotificationPanelProps {
  readonly service: SiteMessageListService;
  readonly preferenceService: NotifyPreferenceService;
  readonly receiverUserId: string | undefined;
  /** 每次打开面板自增：回到列表视图并重新拉取数据。 */
  readonly openToken: number;
  readonly onViewAll: () => void;
  readonly onClose: () => void;
}

/**
 * 站内信面板：列表 / 消息详情 / 订阅管理三视图。
 *
 * <p>列表常驻挂载、用 CSS 隐藏，往返详情时不会丢失筛选与分页状态。</p>
 */
export function NotificationPanel({
  service,
  preferenceService,
  receiverUserId,
  openToken,
  onViewAll,
  onClose,
}: NotificationPanelProps) {
  const { t } = useNebulaI18n();
  const { styles } = useStyles();
  const [view, setView] = useState<NotificationPanelView>('list');
  const [messages, setMessages] = useState<readonly SiteMessageResp[]>([]);
  const [activeMessageId, setActiveMessageId] = useState<string>();
  const activeSnapshotRef = useRef<SiteMessageResp>();

  useEffect(() => {
    setView('list');
    setActiveMessageId(undefined);
    activeSnapshotRef.current = undefined;
  }, [openToken]);

  // 优先取列表里的最新态（已读状态可能已被列表改写），取不到时回落到点击时的快照
  const activeMessage = useMemo(
    () => messages.find((message) => message.id === activeMessageId) ?? activeSnapshotRef.current,
    [activeMessageId, messages],
  );

  const openMessageDetail = (message: SiteMessageResp) => {
    activeSnapshotRef.current = message;
    setActiveMessageId(message.id);
    setView('detail');
  };

  const headerActions = (
    <Space size="small" className={styles.headerGroup}>
      {view === 'list' ? (
        <>
          <Button type="link" size="small" onClick={onViewAll}>
            {t('siteMessage.panel.viewAll')}
          </Button>
          <Button type="link" size="small" onClick={() => setView('preference')}>
            {t('siteMessage.panel.preference')}
          </Button>
        </>
      ) : null}
      <Button
        type="text"
        size="small"
        icon={<CloseOutlined aria-hidden="true" />}
        aria-label={t('siteMessage.panel.close')}
        onClick={onClose}
      />
    </Space>
  );

  return (
    <section className={styles.panel} aria-label={t('siteMessage.panel.title')}>
      <header className={styles.header}>
        {view === 'list' ? (
          <Typography.Text strong>{t('siteMessage.panel.title')}</Typography.Text>
        ) : (
          <div className={styles.headerGroup}>
            <Button
              type="text"
              size="small"
              icon={<LeftOutlined aria-hidden="true" />}
              aria-label={t('siteMessage.panel.back')}
              onClick={() => setView('list')}
            />
            <Typography.Text strong>
              {view === 'detail' ? t('siteMessage.message.detailTitle') : t('siteMessage.panel.preference')}
            </Typography.Text>
          </div>
        )}
        {headerActions}
      </header>

      <Divider className={styles.divider} />

      <div className={styles.body}>
        <div className={view === 'list' ? undefined : styles.hidden}>
          <SiteMessageList
            service={service}
            receiverUserId={receiverUserId}
            selectedMessageId={activeMessageId}
            reloadToken={openToken}
            onDataLoaded={setMessages}
            onSelect={openMessageDetail}
          />
        </div>

        {view === 'detail' ? <SiteMessageDetail message={activeMessage} /> : null}

        {view === 'preference' ? <NotifyPreferenceCard service={preferenceService} /> : null}
      </div>
    </section>
  );
}
