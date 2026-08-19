import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { FormInstance } from 'antd';
import type { Ref } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NebulaProvider } from '@/providers/nebula-provider';
import type { SchedulerService } from '@/services/scheduler';
import type { SchedulerJobResp, SchedulerJobRunResp, SchedulerJobRunStatus, SchedulerPageResp, SchedulerTriggerSource, UpdateSchedulerJobReq } from '@/types/scheduler';
import type { JobRunActionType } from './components/job-run-action-modal';
import type { JobRunTableHandle } from './components/job-run-table';
import type { JobTableHandle } from './components/job-table';
import { ScheduledTaskPage } from './index';

interface MockJobTableProps {
  readonly onDetail: (record: SchedulerJobResp) => void;
  readonly onEdit: (record: SchedulerJobResp) => void;
  readonly onTrigger: (record: SchedulerJobResp) => void;
}

interface MockTriggerModalProps {
  readonly open: boolean;
  readonly onTriggered?: () => void;
}

interface MockJobFormModalProps {
  readonly form: FormInstance<MockJobFormValues>;
  readonly open: boolean;
  readonly submitting: boolean;
  readonly detailLoading: boolean;
  readonly onSubmit: () => void;
}

interface MockJobFormValues extends UpdateSchedulerJobReq {
  readonly enabled: boolean;
}

const INITIAL_JOB_FORM_VALUES = {
  jobName: '',
  description: '',
  cronExpr: '',
  enabled: false,
  defaultParamJson: '',
} as const satisfies MockJobFormValues;

interface MockRunTableProps {
  readonly onDetail: (record: SchedulerJobRunResp) => void;
  readonly onLogs: (record: SchedulerJobRunResp) => void;
  readonly onTerminate: (record: SchedulerJobRunResp) => void;
  readonly onRetry: (record: SchedulerJobRunResp) => void;
  readonly onRerun: (record: SchedulerJobRunResp) => void;
}

interface MockRunActionModalProps {
  readonly open: boolean;
  readonly actionType: JobRunActionType;
  readonly onSubmit: (reason?: string) => void;
}

const mockState = vi.hoisted(() => ({
  jobReload: vi.fn(() => Promise.resolve()),
  runReload: vi.fn(() => Promise.resolve()),
  jobRecord: { id: 'job-1', jobCode: 'demoJob', jobName: 'Demo Job', enabled: true } satisfies SchedulerJobResp,
  runRecord: { id: 'run-1', requestId: 'req-1', jobCode: 'demoJob', runStatus: 'RUNNING', triggerSource: 'MANUAL' } satisfies SchedulerJobRunResp,
}));

vi.mock('./components/job-table', async () => {
  const React = await vi.importActual<typeof import('react')>('react');

  return {
    JobTable: React.forwardRef(function JobTable(props: MockJobTableProps, ref: Ref<JobTableHandle>) {
      React.useImperativeHandle(ref, () => ({ reload: mockState.jobReload }));
      return React.createElement(
        'section',
        { 'aria-label': 'job-table' },
        React.createElement('button', { onClick: () => props.onDetail(mockState.jobRecord) }, 'open job detail'),
        React.createElement('button', { onClick: () => props.onEdit(mockState.jobRecord) }, 'open job edit'),
        React.createElement('button', { onClick: () => props.onTrigger(mockState.jobRecord) }, 'open job trigger'),
      );
    }),
  };
});

vi.mock('./components/trigger-job-modal', async () => {
  const React = await vi.importActual<typeof import('react')>('react');

  return {
    TriggerJobModal: ({ open, onTriggered }: MockTriggerModalProps) => open
      ? React.createElement('button', { onClick: () => onTriggered?.() }, 'complete trigger')
      : null,
  };
});

vi.mock('./components/job-run-table', async () => {
  const React = await vi.importActual<typeof import('react')>('react');

  return {
    JobRunTable: React.forwardRef(function JobRunTable(props: MockRunTableProps, ref: Ref<JobRunTableHandle>) {
      React.useImperativeHandle(ref, () => ({ reload: mockState.runReload }));
      return React.createElement(
        'section',
        { 'aria-label': 'run-table' },
        React.createElement('button', { onClick: () => props.onDetail(mockState.runRecord) }, 'open run detail'),
        React.createElement('button', { onClick: () => props.onLogs(mockState.runRecord) }, 'open run logs'),
        React.createElement('button', { onClick: () => props.onTerminate(mockState.runRecord) }, 'open terminate'),
        React.createElement('button', { onClick: () => props.onRetry(mockState.runRecord) }, 'open retry'),
        React.createElement('button', { onClick: () => props.onRerun(mockState.runRecord) }, 'open rerun'),
      );
    }),
  };
});

vi.mock('./components/job-run-action-modal', async () => {
  const React = await vi.importActual<typeof import('react')>('react');

  return {
    JobRunActionModal: ({ open, actionType, onSubmit }: MockRunActionModalProps) => open
      ? React.createElement('button', { onClick: () => onSubmit(' manual reason ') }, `submit ${actionType}`)
      : null,
  };
});

vi.mock('./components/job-form-modal', async () => {
  const React = await vi.importActual<typeof import('react')>('react');
  const { Form } = await vi.importActual<typeof import('antd')>('antd');
  const TypedForm = Form<MockJobFormValues>;

  return {
    JobFormModal: ({ form, open, submitting, detailLoading, onSubmit }: MockJobFormModalProps) => open
      ? React.createElement(
        React.Fragment,
        null,
        React.createElement(
          TypedForm,
          { form, component: false, initialValues: INITIAL_JOB_FORM_VALUES },
          React.createElement(TypedForm.Item, { name: 'jobName', hidden: true }, React.createElement('input')),
          React.createElement(TypedForm.Item, { name: 'description', hidden: true }, React.createElement('input')),
          React.createElement(TypedForm.Item, { name: 'cronExpr', hidden: true }, React.createElement('input')),
          React.createElement(TypedForm.Item, { name: 'enabled', valuePropName: 'checked', hidden: true }, React.createElement('input', { type: 'checkbox' })),
          React.createElement(TypedForm.Item, { name: 'defaultParamJson', hidden: true }, React.createElement('input')),
        ),
        React.createElement('button', { disabled: submitting || detailLoading, onClick: onSubmit }, 'submit job form'),
      )
      : null,
  };
});

vi.mock('./components/job-detail-drawer', async () => {
  const React = await vi.importActual<typeof import('react')>('react');

  return {
    JobDetailDrawer: ({ open }: { readonly open: boolean }) => open ? React.createElement('span', null, 'job detail drawer') : null,
  };
});

vi.mock('./components/job-run-detail-drawer', async () => {
  const React = await vi.importActual<typeof import('react')>('react');

  return {
    JobRunDetailDrawer: ({ open }: { readonly open: boolean }) => open ? React.createElement('span', null, 'run detail drawer') : null,
  };
});

vi.mock('./components/job-run-log-modal', async () => {
  const React = await vi.importActual<typeof import('react')>('react');

  return {
    JobRunLogModal: ({ open }: { readonly open: boolean }) => open ? React.createElement('span', null, 'run log modal') : null,
  };
});

function createService(): SchedulerService {
  const emptyJobs: SchedulerPageResp<SchedulerJobResp> = { data: [], total: 0 };
  const emptyRuns: SchedulerPageResp<SchedulerJobRunResp> = { data: [], total: 0 };

  return {
    pageJobs: vi.fn().mockResolvedValue(emptyJobs),
    getJobDetail: vi.fn().mockResolvedValue({ id: 'job-1', jobCode: 'demoJob', jobName: ' Detail Job ', cronExpr: ' 0 0 * * * ? ', enabled: true, defaultParamJson: ' {"limit":1} ', description: ' Detail description ' }),
    updateJob: vi.fn().mockResolvedValue({ id: 'job-1', jobCode: 'demoJob', jobName: 'Demo Job', enabled: true }),
    triggerJob: vi.fn().mockResolvedValue({ requestId: 'req-1', jobCode: 'demoJob', runStatus: 'PENDING' satisfies SchedulerJobRunStatus, triggerSource: 'MANUAL' satisfies SchedulerTriggerSource }),
    enableJob: vi.fn().mockResolvedValue({ id: 'job-1', jobCode: 'demoJob', jobName: 'Demo Job', enabled: true }),
    disableJob: vi.fn().mockResolvedValue({ id: 'job-1', jobCode: 'demoJob', jobName: 'Demo Job', enabled: false }),
    pageJobRuns: vi.fn().mockResolvedValue(emptyRuns),
    getJobRunDetail: vi.fn().mockResolvedValue({ requestId: 'req-1', jobCode: 'demoJob', runStatus: 'PENDING', triggerSource: 'MANUAL' }),
    getJobRunLogs: vi.fn().mockResolvedValue({ requestId: 'req-1', content: '' }),
    terminateJobRun: vi.fn().mockResolvedValue(undefined),
    retryJobRun: vi.fn().mockResolvedValue({ requestId: 'req-2', jobCode: 'demoJob', runStatus: 'PENDING', triggerSource: 'RETRY' }),
    rerunJobRun: vi.fn().mockResolvedValue({ requestId: 'req-3', jobCode: 'demoJob', runStatus: 'PENDING', triggerSource: 'MANUAL' }),
  };
}

function renderPage(service = createService()) {
  render(
    <NebulaProvider>
      <ScheduledTaskPage service={service} />
    </NebulaProvider>,
  );

  return service;
}

describe('ScheduledTaskPage', () => {
  beforeEach(() => {
    mockState.jobReload.mockClear();
    mockState.runReload.mockClear();
  });

  it('renders job definition and run history tabs with an injected service', () => {
    renderPage();

    expect(screen.getByRole('tab', { name: '任务定义' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '执行记录' })).toBeInTheDocument();
  });

  it('switches to run history and reloads runs after a trigger callback', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'open job trigger' }));
    await user.click(screen.getByRole('button', { name: 'complete trigger' }));

    await waitFor(() => {
      expect(mockState.runReload).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByRole('tab', { name: '执行记录' })).toHaveAttribute('aria-selected', 'true');
  });

  it('submits job edits with only the scheduler override payload', async () => {
    const user = userEvent.setup();
    const service = renderPage();

    await user.click(screen.getByRole('button', { name: 'open job edit' }));
    await waitFor(() => {
      expect(service.getJobDetail).toHaveBeenCalledWith('demoJob');
    });
    const submitButton = screen.getByRole('button', { name: 'submit job form' });
    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });
    await user.click(submitButton);

    await waitFor(() => {
      expect(service.updateJob).toHaveBeenCalledWith('demoJob', {
        jobName: 'Detail Job',
        description: 'Detail description',
        cronExpr: '0 0 * * * ?',
        enabled: true,
        defaultParamJson: '{"limit":1}',
      });
    });
  });
});
