import { Button, Modal, Typography } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { createStyles } from 'antd-style';
import { useAuthStore } from '@/stores/auth-store';
import { notifyService, type NotifyService } from '@/services/notify';
import type { CurrentAnnouncementResp } from '@/types/notify';

type PopupState = 'idle' | 'loading' | 'ready' | 'acknowledging' | 'ackError' | 'loadError';

export interface PopupAnnouncementService {
  readonly listCurrentPopupAnnouncements: NotifyService['listCurrentPopupAnnouncements'];
  readonly markAnnouncementRead: NotifyService['markAnnouncementRead'];
}

interface PopupAnnouncementProps {
  readonly service?: PopupAnnouncementService;
}

const useStyles = createStyles(({ token }) => ({
  modal: {
    maxWidth: `calc(100vw - ${token.paddingSM * 2}px)`,
  },
  content: {
    maxHeight: `calc(100vh - ${token.paddingLG * 8}px)`,
    overflowY: 'auto',
    lineHeight: token.lineHeight,
    wordBreak: 'break-word' as const,
  },
  error: {
    marginBottom: token.margin,
  },
}));

export function PopupAnnouncement({ service = notifyService }: PopupAnnouncementProps) {
  const userId = useAuthStore((state) => state.user?.id);
  const { styles } = useStyles();
  const [state, setState] = useState<PopupState>('idle');
  const [announcement, setAnnouncement] = useState<CurrentAnnouncementResp>();
  const requestSequenceRef = useRef(0);
  const queueRef = useRef<CurrentAnnouncementResp[]>([]);
  const acknowledgedIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const sequence = requestSequenceRef.current + 1;
    requestSequenceRef.current = sequence;
    queueRef.current = [];
    acknowledgedIdsRef.current = new Set();
    setAnnouncement(undefined);
    setState(userId ? 'loading' : 'idle');

    if (!userId) {
      return;
    }

    void service.listCurrentPopupAnnouncements().then(
      (items) => {
        if (requestSequenceRef.current !== sequence) return;

        const unreadItems = items.filter((item) => !item.readStatus && !acknowledgedIdsRef.current.has(item.id));
        queueRef.current = [...unreadItems];
        setAnnouncement(unreadItems[0]);
        setState(unreadItems.length > 0 ? 'ready' : 'idle');
      },
      () => {
        if (requestSequenceRef.current === sequence) {
          setAnnouncement(undefined);
          setState('loadError');
        }
      },
    );

    return () => {
      requestSequenceRef.current += 1;
    };
  }, [service, userId]);

  if (!userId) {
    return null;
  }

  const dismissLoadError = () => {
    requestSequenceRef.current += 1;
    queueRef.current = [];
    setAnnouncement(undefined);
    setState('idle');
  };

  const retryLoad = () => {
    const sequence = requestSequenceRef.current + 1;
    requestSequenceRef.current = sequence;
    setState('loading');
    void service.listCurrentPopupAnnouncements().then(
      (items) => {
        if (requestSequenceRef.current !== sequence) return;

        const unreadItems = items.filter((item) => !item.readStatus && !acknowledgedIdsRef.current.has(item.id));
        queueRef.current = [...unreadItems];
        setAnnouncement(unreadItems[0]);
        setState(unreadItems.length > 0 ? 'ready' : 'idle');
      },
      () => {
        if (requestSequenceRef.current === sequence) {
          setState('loadError');
        }
      },
    );
  };

  const handleAcknowledge = () => {
    if (!announcement || state === 'acknowledging') return;

    const currentAnnouncement = announcement;
    const sequence = requestSequenceRef.current + 1;
    requestSequenceRef.current = sequence;
    setState('acknowledging');
    void service.markAnnouncementRead(currentAnnouncement.id).then(
      () => {
        if (requestSequenceRef.current !== sequence) return;

        acknowledgedIdsRef.current.add(currentAnnouncement.id);
        queueRef.current.shift();
        const nextAnnouncement = queueRef.current[0];
        setAnnouncement(nextAnnouncement);
        setState(nextAnnouncement ? 'ready' : 'idle');
      },
      () => {
        if (requestSequenceRef.current === sequence) {
          setState('ackError');
        }
      },
    );
  };

  const showAnnouncement = announcement !== undefined && (state === 'ready' || state === 'acknowledging' || state === 'ackError');

  return (
    <>
      <Modal
        open={showAnnouncement}
        title={announcement?.title}
        closable={false}
        destroyOnHidden
        className={styles.modal}
        footer={(
          <Button type="primary" loading={state === 'acknowledging'} onClick={handleAcknowledge}>
            知道了
          </Button>
        )}
      >
        {state === 'ackError' && (
          <Typography.Text type="danger" className={styles.error}>
            公告确认失败，请重试
          </Typography.Text>
        )}
        <pre className={styles.content} style={{ whiteSpace: 'pre-wrap', margin: 0, fontFamily: 'inherit' }}>
          {announcement?.content}
        </pre>
      </Modal>
      <Modal
        open={state === 'loadError'}
        title="公告加载失败"
        destroyOnHidden
        onCancel={dismissLoadError}
        footer={(
          <>
            <Button onClick={dismissLoadError}>关闭</Button>
            <Button type="primary" onClick={retryLoad}>重试</Button>
          </>
        )}
      >
        <Typography.Text type="danger">公告加载失败，请重试</Typography.Text>
      </Modal>
    </>
  );
}
