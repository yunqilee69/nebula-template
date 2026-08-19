import { request } from '@/request/request';
import type {
  RetrySchedulerJobRunReq,
  SchedulerJobDetailResp,
  SchedulerJobLogResp,
  SchedulerJobPageReq,
  SchedulerJobResp,
  SchedulerJobRunDetailResp,
  SchedulerJobRunPageReq,
  SchedulerJobRunResp,
  SchedulerJobTriggerResultResp,
  SchedulerPageResp,
  TerminateSchedulerJobRunReq,
  TriggerSchedulerJobReq,
  UpdateSchedulerJobReq,
} from '@/types/scheduler';

export interface SchedulerService {
  pageJobs: (data: SchedulerJobPageReq) => Promise<SchedulerPageResp<SchedulerJobResp>>;
  getJobDetail: (jobCode: string) => Promise<SchedulerJobDetailResp>;
  updateJob: (jobCode: string, data: UpdateSchedulerJobReq) => Promise<SchedulerJobDetailResp>;
  triggerJob: (jobCode: string, data?: TriggerSchedulerJobReq) => Promise<SchedulerJobTriggerResultResp>;
  enableJob: (jobCode: string) => Promise<SchedulerJobDetailResp>;
  disableJob: (jobCode: string) => Promise<SchedulerJobDetailResp>;
  pageJobRuns: (data: SchedulerJobRunPageReq) => Promise<SchedulerPageResp<SchedulerJobRunResp>>;
  getJobRunDetail: (requestId: string) => Promise<SchedulerJobRunDetailResp>;
  getJobRunLogs: (requestId: string) => Promise<SchedulerJobLogResp>;
  terminateJobRun: (requestId: string, data?: TerminateSchedulerJobRunReq) => Promise<void>;
  retryJobRun: (requestId: string, data?: RetrySchedulerJobRunReq) => Promise<SchedulerJobTriggerResultResp>;
  rerunJobRun: (requestId: string, data?: RetrySchedulerJobRunReq) => Promise<SchedulerJobTriggerResultResp>;
}

export const schedulerService: SchedulerService = {
  pageJobs: (data) => request<SchedulerPageResp<SchedulerJobResp>>({ method: 'POST', url: '/api/scheduler/jobs/page', data }),
  getJobDetail: (jobCode) => request<SchedulerJobDetailResp>({ method: 'GET', url: `/api/scheduler/jobs/${jobCode}` }),
  updateJob: (jobCode, data) => request<SchedulerJobDetailResp>({ method: 'PUT', url: `/api/scheduler/jobs/${jobCode}`, data }),
  triggerJob: (jobCode, data) => request<SchedulerJobTriggerResultResp>({ method: 'POST', url: `/api/scheduler/jobs/${jobCode}/trigger`, data }),
  enableJob: (jobCode) => request<SchedulerJobDetailResp>({ method: 'POST', url: `/api/scheduler/jobs/${jobCode}/enable` }),
  disableJob: (jobCode) => request<SchedulerJobDetailResp>({ method: 'POST', url: `/api/scheduler/jobs/${jobCode}/disable` }),
  pageJobRuns: (data) => request<SchedulerPageResp<SchedulerJobRunResp>>({ method: 'POST', url: '/api/scheduler/job-runs/page', data }),
  getJobRunDetail: (requestId) => request<SchedulerJobRunDetailResp>({ method: 'GET', url: `/api/scheduler/job-runs/${requestId}` }),
  getJobRunLogs: (requestId) => request<SchedulerJobLogResp>({ method: 'GET', url: `/api/scheduler/job-runs/${requestId}/logs` }),
  terminateJobRun: (requestId, data) => request<void>({ method: 'POST', url: `/api/scheduler/job-runs/${requestId}/terminate`, data }),
  retryJobRun: (requestId, data) => request<SchedulerJobTriggerResultResp>({ method: 'POST', url: `/api/scheduler/job-runs/${requestId}/retry`, data }),
  rerunJobRun: (requestId, data) => request<SchedulerJobTriggerResultResp>({ method: 'POST', url: `/api/scheduler/job-runs/${requestId}/rerun`, data }),
};
