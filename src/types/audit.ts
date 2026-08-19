import type { PageReq } from './auth-management';

export type AuditResultStatus = 'SUCCESS' | 'FAILURE';

/**
 * 审计记录列表项
 */
export interface AuditRecordResp {
  readonly id: string;
  readonly operatorId?: string;
  readonly operatorName?: string;
  readonly module: string;
  readonly action: string;
  readonly resourceType?: string;
  readonly resourceId?: string;
  readonly resourceName?: string;
  readonly requestParams?: string;
  readonly responseData?: string;
  readonly requestIp?: string;
  readonly resultStatus: AuditResultStatus;
  readonly resultMessage?: string;
  readonly createTime: string;
  readonly updateTime: string;
}

/**
 * 审计记录详情
 */
export type AuditRecordDetailResp = AuditRecordResp;

/**
 * 分页查询参数
 */
export interface AuditRecordPageReq extends PageReq {
  readonly module?: string;
  readonly action?: string;
  readonly operatorId?: string;
  readonly operatorName?: string;
  readonly resourceType?: string;
  readonly resourceId?: string;
  readonly resourceName?: string;
  readonly requestIp?: string;
  readonly resultStatus?: AuditResultStatus;
}
