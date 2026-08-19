import { request } from '@/request/request';
import type { PageResp } from '@/types/auth-management';
import type {
  AuditRecordDetailResp,
  AuditRecordPageReq,
  AuditRecordResp,
} from '@/types/audit';

export interface AuditService {
  readonly pageRecords: (data: AuditRecordPageReq) => Promise<PageResp<AuditRecordResp>>;
  readonly getRecordDetail: (id: string) => Promise<AuditRecordDetailResp>;
}

export const auditService: AuditService = {
  pageRecords: (data) =>
    request<PageResp<AuditRecordResp>>({
      method: 'POST',
      url: '/api/audit/records/page',
      data,
    }),
  getRecordDetail: (id) =>
    request<AuditRecordDetailResp>({
      method: 'GET',
      url: `/api/audit/records/${id}`,
    }),
};
