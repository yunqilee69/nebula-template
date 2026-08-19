import { useCallback, useRef, useState } from 'react';
import { notifyService } from '@/services/notify';
import type { NotifyService } from '@/services/notify';
import type { NotifyRecordResp } from '@/types/notify';
import { RecordDetailModal } from './record-detail-modal';
import type { RecordDetailState } from './record-detail-modal';
import { NotifyRecordTable } from './record-table';

type NotifyRecordPageService = Pick<NotifyService, 'pageNotifyRecords' | 'getNotifyRecord'>;

export interface NotifyRecordPageProps {
  readonly service?: NotifyRecordPageService;
}

const CLOSED_DETAIL_STATE = { kind: 'closed' } as const satisfies RecordDetailState;

export function NotifyRecordPage({ service = notifyService }: NotifyRecordPageProps) {
  const detailRequestVersion = useRef(0);
  const [detailState, setDetailState] = useState<RecordDetailState>(CLOSED_DETAIL_STATE);

  const loadDetail = useCallback(async (record: NotifyRecordResp) => {
    const requestVersion = detailRequestVersion.current + 1;
    detailRequestVersion.current = requestVersion;
    setDetailState({ kind: 'loading', record });

    try {
      const detail = await service.getNotifyRecord(record.id);
      if (detailRequestVersion.current === requestVersion) {
        setDetailState({ kind: 'ready', detail });
      }
    } catch (error: unknown) {
      if (!(error instanceof Error)) throw error;
      if (detailRequestVersion.current === requestVersion) {
        setDetailState({ kind: 'error', record });
      }
    }
  }, [service]);

  const closeDetail = useCallback(() => {
    detailRequestVersion.current += 1;
    setDetailState(CLOSED_DETAIL_STATE);
  }, []);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1">
        <NotifyRecordTable
          service={service}
          onDetail={(record) => void loadDetail(record)}
        />
      </div>
      <RecordDetailModal
        state={detailState}
        onClose={closeDetail}
        onRetry={(record) => void loadDetail(record)}
      />
    </div>
  );
}

export default NotifyRecordPage;
