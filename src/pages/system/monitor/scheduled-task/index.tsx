import { Form, Tabs } from 'antd';
import type { TabsProps } from 'antd';
import { useCallback, useRef, useState } from 'react';
import { useNebulaI18n } from '@/hooks/use-nebula-i18n';
import { useNotice } from '@/hooks/use-notice';
import { schedulerService, type SchedulerService } from '@/services/scheduler';
import type { SchedulerJobDetailResp, SchedulerJobLogResp, SchedulerJobResp, SchedulerJobRunDetailResp, SchedulerJobRunResp, UpdateSchedulerJobReq } from '@/types/scheduler';
import { JobDetailDrawer } from './components/job-detail-drawer';
import { JobFormModal, type JobFormValues } from './components/job-form-modal';
import { JobRunActionModal, type JobRunActionType } from './components/job-run-action-modal';
import { JobRunDetailDrawer } from './components/job-run-detail-drawer';
import { JobRunLogModal } from './components/job-run-log-modal';
import { JobRunTable, type JobRunTableHandle } from './components/job-run-table';
import { JobTable, type JobTableHandle } from './components/job-table';
import { TriggerJobModal } from './components/trigger-job-modal';

export interface ScheduledTaskPageProps {
  readonly service?: SchedulerService;
}

type ScheduledTaskTabKey = 'jobs' | 'runs';

interface AntdValidationError {
  readonly errorFields: unknown;
}

interface DetailState<T> {
  readonly open: boolean;
  readonly loading: boolean;
  readonly data?: T;
}

interface JobFormState {
  readonly open: boolean;
  readonly submitting: boolean;
  readonly detailLoading: boolean;
  readonly jobCode?: string;
  readonly detail?: SchedulerJobDetailResp;
}

interface TriggerState {
  readonly open: boolean;
  readonly job?: SchedulerJobResp;
  readonly detail?: SchedulerJobDetailResp;
}

interface RunActionState {
  readonly open: boolean;
  readonly submitting: boolean;
  readonly actionType: JobRunActionType;
  readonly target?: SchedulerJobRunResp;
}

const EMPTY_JOB_FORM_STATE: JobFormState = { open: false, submitting: false, detailLoading: false };
const EMPTY_TRIGGER_STATE: TriggerState = { open: false };
const EMPTY_RUN_ACTION_STATE: RunActionState = { open: false, submitting: false, actionType: 'terminate' };
const RUN_ACTION_FEEDBACK = {
  terminate: { success: 'scheduler.run.feedback.terminateSuccess', failed: 'scheduler.run.feedback.terminateFailed' },
  retry: { success: 'scheduler.run.feedback.retrySuccess', failed: 'scheduler.run.feedback.retryFailed' },
  rerun: { success: 'scheduler.run.feedback.rerunSuccess', failed: 'scheduler.run.feedback.rerunFailed' },
} as const satisfies Record<JobRunActionType, { readonly success: string; readonly failed: string }>;

function isScheduledTaskTabKey(value: string): value is ScheduledTaskTabKey {
  return value === 'jobs' || value === 'runs';
}

function isAntdValidationError(error: unknown): error is AntdValidationError {
  return typeof error === 'object' && error !== null && 'errorFields' in error;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function trimText(value: string | undefined): string {
  return value?.trim() ?? '';
}

function optionalReason(reason: string | undefined): { readonly reason: string } | undefined {
  return reason ? { reason } : undefined;
}

export function ScheduledTaskPage({ service: serviceProp }: ScheduledTaskPageProps) {
  const service = serviceProp ?? schedulerService;
  const { t } = useNebulaI18n();
  const notice = useNotice();
  const [jobForm] = Form.useForm<JobFormValues>();
  const jobTableRef = useRef<JobTableHandle>(null);
  const runTableRef = useRef<JobRunTableHandle>(null);

  const [activeTabKey, setActiveTabKey] = useState<ScheduledTaskTabKey>('jobs');
  const [jobFormState, setJobFormState] = useState<JobFormState>(EMPTY_JOB_FORM_STATE);
  const [jobDetailState, setJobDetailState] = useState<DetailState<SchedulerJobDetailResp>>({ open: false, loading: false });
  const [triggerState, setTriggerState] = useState<TriggerState>(EMPTY_TRIGGER_STATE);
  const [runDetailState, setRunDetailState] = useState<DetailState<SchedulerJobRunDetailResp>>({ open: false, loading: false });
  const [runLogState, setRunLogState] = useState<DetailState<SchedulerJobLogResp>>({ open: false, loading: false });
  const [runActionState, setRunActionState] = useState<RunActionState>(EMPTY_RUN_ACTION_STATE);

  const handleTabChange = useCallback((key: string) => {
    if (isScheduledTaskTabKey(key)) setActiveTabKey(key);
  }, []);

  const openEditModal = useCallback(async (record: SchedulerJobResp) => {
    jobForm.resetFields();
    setJobFormState({ open: true, submitting: false, detailLoading: true, jobCode: record.jobCode });
    try {
      const detail = await service.getJobDetail(record.jobCode);
      jobForm.setFieldsValue({ jobName: detail.jobName ?? '', cronExpr: detail.cronExpr ?? '', enabled: detail.enabled, defaultParamJson: detail.defaultParamJson ?? '', description: detail.description ?? '' });
      setJobFormState({ open: true, submitting: false, detailLoading: false, jobCode: record.jobCode, detail });
    } catch (error: unknown) {
      notice.error(t('scheduler.job.feedback.detailLoadFailed'));
      console.error('Failed to load scheduler job detail', getErrorMessage(error));
      setJobFormState(EMPTY_JOB_FORM_STATE);
    }
  }, [jobForm, notice, service, t]);

  const closeJobFormModal = useCallback(() => {
    setJobFormState(EMPTY_JOB_FORM_STATE);
    jobForm.resetFields();
  }, [jobForm]);

  const submitJobForm = useCallback(async () => {
    if (!jobFormState.jobCode) return;
    const values = await jobForm.validateFields().catch((error: unknown) => {
      if (isAntdValidationError(error)) return undefined;
      notice.error(t('scheduler.job.feedback.updateFailed'));
      console.error('Failed to validate scheduler job form', getErrorMessage(error));
      return undefined;
    });
    if (!values) return;

    const payload: UpdateSchedulerJobReq = { jobName: trimText(values.jobName), description: trimText(values.description), cronExpr: trimText(values.cronExpr), enabled: values.enabled, defaultParamJson: trimText(values.defaultParamJson) };
    setJobFormState((state) => ({ ...state, submitting: true }));
    try {
      await service.updateJob(jobFormState.jobCode, payload);
      notice.success(t('scheduler.job.feedback.updateSuccess'));
      closeJobFormModal();
      await jobTableRef.current?.reload();
    } catch (error: unknown) {
      notice.error(t('scheduler.job.feedback.updateFailed'));
      console.error('Failed to update scheduler job', getErrorMessage(error));
    } finally {
      setJobFormState((state) => ({ ...state, submitting: false }));
    }
  }, [closeJobFormModal, jobForm, jobFormState.jobCode, notice, service, t]);

  const openJobDetail = useCallback(async (record: SchedulerJobResp) => {
    setJobDetailState({ open: true, loading: true });
    try {
      setJobDetailState({ open: true, loading: false, data: await service.getJobDetail(record.jobCode) });
    } catch (error: unknown) {
      notice.error(t('scheduler.job.feedback.detailLoadFailed'));
      console.error('Failed to load scheduler job detail', getErrorMessage(error));
      setJobDetailState({ open: true, loading: false });
    }
  }, [notice, service, t]);

  const closeJobDetail = useCallback(() => setJobDetailState({ open: false, loading: false }), []);
  const openTriggerModal = useCallback((record: SchedulerJobResp) => setTriggerState({ open: true, job: record }), []);
  const closeTriggerModal = useCallback(() => setTriggerState(EMPTY_TRIGGER_STATE), []);

  const handleTriggered = useCallback(async () => {
    closeTriggerModal();
    setActiveTabKey('runs');
    await runTableRef.current?.reload();
  }, [closeTriggerModal]);

  const openRunDetail = useCallback(async (record: SchedulerJobRunResp) => {
    setRunDetailState({ open: true, loading: true });
    try {
      setRunDetailState({ open: true, loading: false, data: await service.getJobRunDetail(record.requestId) });
    } catch (error: unknown) {
      notice.error(t('scheduler.run.feedback.detailLoadFailed'));
      console.error('Failed to load scheduler job run detail', getErrorMessage(error));
      setRunDetailState({ open: true, loading: false });
    }
  }, [notice, service, t]);

  const closeRunDetail = useCallback(() => setRunDetailState({ open: false, loading: false }), []);

  const openRunLogs = useCallback(async (record: SchedulerJobRunResp) => {
    setRunLogState({ open: true, loading: true });
    try {
      setRunLogState({ open: true, loading: false, data: await service.getJobRunLogs(record.requestId) });
    } catch (error: unknown) {
      notice.error(t('scheduler.run.feedback.logLoadFailed'));
      console.error('Failed to load scheduler job run logs', getErrorMessage(error));
      setRunLogState({ open: true, loading: false });
    }
  }, [notice, service, t]);

  const closeRunLog = useCallback(() => setRunLogState({ open: false, loading: false }), []);
  const openRunAction = useCallback((actionType: JobRunActionType, target: SchedulerJobRunResp) => setRunActionState({ open: true, submitting: false, actionType, target }), []);
  const closeRunAction = useCallback(() => setRunActionState(EMPTY_RUN_ACTION_STATE), []);

  const submitRunAction = useCallback(async (reason?: string) => {
    const requestId = runActionState.target?.requestId;
    if (!requestId) return;

    setRunActionState((state) => ({ ...state, submitting: true }));
    try {
      if (runActionState.actionType === 'terminate') await service.terminateJobRun(requestId, optionalReason(reason));
      else if (runActionState.actionType === 'retry') await service.retryJobRun(requestId, optionalReason(reason));
      else await service.rerunJobRun(requestId, optionalReason(reason));
      notice.success(t(RUN_ACTION_FEEDBACK[runActionState.actionType].success));
      closeRunAction();
      await runTableRef.current?.reload();
    } catch (error: unknown) {
      notice.error(t(RUN_ACTION_FEEDBACK[runActionState.actionType].failed));
      console.error('Failed to execute scheduler job run action', getErrorMessage(error));
    } finally {
      setRunActionState((state) => ({ ...state, submitting: false }));
    }
  }, [closeRunAction, notice, runActionState.actionType, runActionState.target?.requestId, service, t]);

  const tabItems: TabsProps['items'] = [
    { key: 'jobs', label: t('scheduler.tabs.jobs'), forceRender: true, children: <JobTable ref={jobTableRef} service={service} onDetail={(record) => void openJobDetail(record)} onEdit={(record) => void openEditModal(record)} onTrigger={openTriggerModal} /> },
    { key: 'runs', label: t('scheduler.tabs.runs'), forceRender: true, children: <JobRunTable ref={runTableRef} service={service} onDetail={(record) => void openRunDetail(record)} onLogs={(record) => void openRunLogs(record)} onTerminate={(record) => openRunAction('terminate', record)} onRetry={(record) => openRunAction('retry', record)} onRerun={(record) => openRunAction('rerun', record)} /> },
  ];

  return (
    <div className="h-full min-h-0">
      <Tabs activeKey={activeTabKey} items={tabItems} onChange={handleTabChange} />
      <JobFormModal form={jobForm} open={jobFormState.open} submitting={jobFormState.submitting || jobFormState.detailLoading} detailLoading={jobFormState.detailLoading} job={jobFormState.detail} onSubmit={() => void submitJobForm()} onCancel={closeJobFormModal} />
      <TriggerJobModal service={service} open={triggerState.open} job={triggerState.job} detail={triggerState.detail} onDetailLoaded={(detail) => setTriggerState((state) => ({ ...state, detail }))} onTriggered={() => void handleTriggered()} onCancel={closeTriggerModal} />
      <JobDetailDrawer open={jobDetailState.open} detail={jobDetailState.data} loading={jobDetailState.loading} onClose={closeJobDetail} />
      <JobRunDetailDrawer open={runDetailState.open} detail={runDetailState.data} loading={runDetailState.loading} onClose={closeRunDetail} />
      <JobRunLogModal open={runLogState.open} log={runLogState.data} loading={runLogState.loading} onClose={closeRunLog} />
      <JobRunActionModal open={runActionState.open} actionType={runActionState.actionType} submitting={runActionState.submitting} onSubmit={(reason) => void submitRunAction(reason)} onCancel={closeRunAction} />
    </div>
  );
}

export default ScheduledTaskPage;
