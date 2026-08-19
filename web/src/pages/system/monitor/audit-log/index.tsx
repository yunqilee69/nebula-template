import { useCallback, useState } from 'react';
import { auditService, type AuditService } from '@/services/audit';
import type { AuditRecordDetailResp, AuditRecordResp } from '@/types/audit';
import { AuditRecordDetailModal } from './components/audit-record-detail-modal';
import { AuditRecordTable } from './components/audit-record-table';
import { useAuditActionDictionary } from './use-audit-action-dictionary';

export interface AuditLogPageProps {
  readonly service?: AuditService;
}

interface DetailState {
  open: boolean;
  loading: boolean;
  data?: AuditRecordDetailResp;
}

const EMPTY_DETAIL_STATE: DetailState = { open: false, loading: false };

export function AuditLogPage({ service: serviceProp }: AuditLogPageProps) {
  const service = serviceProp ?? auditService;
  const actionDictionary = useAuditActionDictionary();
  const [detailState, setDetailState] = useState<DetailState>(EMPTY_DETAIL_STATE);

  const handleDetail = useCallback(
    async (record: AuditRecordResp) => {
      setDetailState({ open: true, loading: true });

      try {
        const detail = await service.getRecordDetail(record.id);
        setDetailState({ open: true, loading: false, data: detail });
      } catch (error) {
        if (!(error instanceof Error)) throw error;
        console.error('Failed to load audit record detail:', error);
        setDetailState({ open: false, loading: false });
      }
    },
    [service],
  );

  const handleDetailClose = useCallback(() => {
    setDetailState(EMPTY_DETAIL_STATE);
  }, []);

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0">
        <AuditRecordTable
          service={service}
          actionDictionary={actionDictionary}
          onDetail={handleDetail}
        />
      </div>

      <AuditRecordDetailModal
        open={detailState.open}
        loading={detailState.loading}
        detail={detailState.data}
        actionDictionary={actionDictionary}
        onClose={handleDetailClose}
      />
    </div>
  );
}

export default AuditLogPage;
