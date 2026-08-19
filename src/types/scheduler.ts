import type { SchedulerJobRunStatus, SchedulerTriggerSource } from '@/enums/scheduler';

export type { SchedulerJobRunStatus, SchedulerTriggerSource } from '@/enums/scheduler';

export interface SchedulerPageResp<T> {
  data: T[];
  total: number;
}

export interface SchedulerBasePageReq {
  pageNum: number;
  pageSize: number;
  orderName?: string;
  orderType?: 'asc' | 'desc';
}

export interface SchedulerJobPageReq extends SchedulerBasePageReq {
  jobCode?: string;
  jobName?: string;
  enabled?: boolean;
}

export interface SchedulerJobResp {
  id: string;
  jobCode: string;
  jobName: string;
  cronExpr?: string;
  enabled: boolean;
}

export interface SchedulerJobParamSchemaResp {
  fieldKey: string;
  fieldType: string;
  required: boolean;
  label: string;
  description?: string;
  defaultValue?: unknown;
  enumOptions?: string[];
}

export interface SchedulerJobDetailResp extends SchedulerJobResp {
  description?: string;
  engineJobRef?: string;
  defaultParamJson?: string;
  paramClassName?: string;
  manualTriggerEnabled?: boolean;
  paramOverrideEnabled?: boolean;
  paramSchemaList?: SchedulerJobParamSchemaResp[];
}

export interface UpdateSchedulerJobReq {
  jobName?: string;
  cronExpr?: string;
  enabled?: boolean;
  defaultParamJson?: string;
  description?: string;
}

export interface TriggerSchedulerJobReq {
  param?: Record<string, unknown>;
  reason?: string;
}

export interface RetrySchedulerJobRunReq {
  param?: Record<string, unknown>;
  reason?: string;
}

export type RerunSchedulerJobRunReq = RetrySchedulerJobRunReq;

export interface TerminateSchedulerJobRunReq {
  reason?: string;
}

export interface SchedulerJobRunPageReq extends SchedulerBasePageReq {
  jobCode?: string;
  runStatus?: SchedulerJobRunStatus;
  triggerSource?: SchedulerTriggerSource;
  startTimeFrom?: string;
  startTimeTo?: string;
}

export interface SchedulerJobRunResp {
  id: string;
  requestId: string;
  jobCode: string;
  runStatus: SchedulerJobRunStatus;
  triggerSource: SchedulerTriggerSource;
  finalParamJson?: string;
  resultMessage?: string;
  resultJson?: string;
  startTime?: string;
  finishTime?: string;
}

export interface SchedulerJobRunDetailResp {
  requestId: string;
  jobCode: string;
  runStatus: SchedulerJobRunStatus;
  triggerSource: SchedulerTriggerSource;
  finalParamJson?: string;
  manualReason?: string;
  operatorId?: string;
  operatorName?: string;
  resultMessage?: string;
  resultJson?: string;
  triggerTime?: string;
  startTime?: string;
  finishTime?: string;
}

export interface SchedulerJobLogResp {
  requestId: string;
  logSource?: string;
  content?: string;
  truncated?: boolean;
}

export interface SchedulerJobTriggerResultResp {
  requestId: string;
  jobCode: string;
  runStatus: SchedulerJobRunStatus;
  triggerSource: SchedulerTriggerSource;
}
