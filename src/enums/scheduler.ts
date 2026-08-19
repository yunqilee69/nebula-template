export type SchedulerJobRunStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'TERMINATING'
  | 'TERMINATED'
  | 'TIMEOUT'
  | 'SUCCESS'
  | 'FAILED';

export type SchedulerTriggerSource = 'SCHEDULED' | 'MANUAL' | 'RETRY';

export const RUN_STATUS_TAG_COLOR: Record<SchedulerJobRunStatus, string> = {
  PENDING: 'processing',
  RUNNING: 'processing',
  TERMINATING: 'processing',
  TERMINATED: 'default',
  TIMEOUT: 'warning',
  SUCCESS: 'success',
  FAILED: 'error',
} as const;

export const RUN_STATUS_LABEL_KEY: Record<SchedulerJobRunStatus, string> = {
  PENDING: 'scheduler.runStatus.pending',
  RUNNING: 'scheduler.runStatus.running',
  TERMINATING: 'scheduler.runStatus.terminating',
  TERMINATED: 'scheduler.runStatus.terminated',
  TIMEOUT: 'scheduler.runStatus.timeout',
  SUCCESS: 'scheduler.runStatus.success',
  FAILED: 'scheduler.runStatus.failed',
} as const;

export const TRIGGER_SOURCE_TAG_COLOR: Record<SchedulerTriggerSource, string> = {
  SCHEDULED: 'blue',
  MANUAL: 'gold',
  RETRY: 'orange',
} as const;
