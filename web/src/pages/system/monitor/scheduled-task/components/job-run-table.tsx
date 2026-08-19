import { FileTextOutlined, InfoCircleOutlined, RedoOutlined, ReloadOutlined, StopOutlined } from '@ant-design/icons';
import { Button, Tag, Typography } from 'antd';
import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef } from 'react';
import { NebulaProTable } from '@/components/nebula-pro-table';
import type { NebulaPageReq, NebulaProColumns, NebulaProTableAction } from '@/components/nebula-pro-table';
import {
  RUN_STATUS_LABEL_KEY,
  RUN_STATUS_TAG_COLOR,
  TRIGGER_SOURCE_TAG_COLOR,
} from '@/enums/scheduler';
import type { SchedulerJobRunStatus, SchedulerTriggerSource } from '@/enums/scheduler';
import { useNebulaI18n } from '@/hooks/use-nebula-i18n';
import { useNotice } from '@/hooks/use-notice';
import type { SchedulerService } from '@/services/scheduler';
import type { SchedulerJobRunPageReq, SchedulerJobRunResp } from '@/types/scheduler';

const RUN_STATUSES = ['PENDING', 'RUNNING', 'TERMINATING', 'TERMINATED', 'TIMEOUT', 'SUCCESS', 'FAILED'] as const satisfies readonly SchedulerJobRunStatus[];

const TRIGGER_SOURCES = ['SCHEDULED', 'MANUAL', 'RETRY'] as const satisfies readonly SchedulerTriggerSource[];

const TRIGGER_SOURCE_LABEL_KEY = {
  SCHEDULED: 'scheduler.triggerSource.scheduled',
  MANUAL: 'scheduler.triggerSource.manual',
  RETRY: 'scheduler.triggerSource.retry',
} as const satisfies Record<SchedulerTriggerSource, string>;

interface DateRangeFormatter {
  readonly format: (template: string) => string;
}

type DateRangeBoundary = DateRangeFormatter | string | undefined;
type DateRangeValue = readonly [DateRangeBoundary, DateRangeBoundary];

export interface JobRunTableHandle {
  reload: () => Promise<void>;
}

export interface JobRunQuery {
  readonly jobCode?: string;
  readonly runStatus?: SchedulerJobRunStatus;
  readonly triggerSource?: SchedulerTriggerSource;
  readonly startTimeRange?: DateRangeValue;
}

interface JobRunTableProps {
  readonly service: SchedulerService;
  readonly onDetail: (record: SchedulerJobRunResp) => void;
  readonly onLogs: (record: SchedulerJobRunResp) => void;
  readonly onTerminate: (record: SchedulerJobRunResp) => void;
  readonly onRetry: (record: SchedulerJobRunResp) => void;
  readonly onRerun: (record: SchedulerJobRunResp) => void;
}

type NebulaTranslator = ReturnType<typeof useNebulaI18n>['t'];

function translateKey(t: NebulaTranslator, key: string): string {
  return String(Reflect.apply(t, undefined, [key]));
}

function normalizeOptionalText(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function formatDateTime(value: string | undefined): string {
  return value ? value.replace('T', ' ') : '-';
}

function isDateRangeFormatter(value: unknown): value is DateRangeFormatter {
  return typeof value === 'object' && value !== null && 'format' in value && typeof value.format === 'function';
}

function formatRangeBoundary(value: DateRangeBoundary): string | undefined {
  if (!value) return undefined;
  if (typeof value === 'string') {
    return normalizeOptionalText(value)?.replace('T', ' ');
  }
  return isDateRangeFormatter(value) ? value.format('YYYY-MM-DD HH:mm:ss') : undefined;
}

function buildJobRunPageReq(params: JobRunQuery & NebulaPageReq): SchedulerJobRunPageReq {
  const req: SchedulerJobRunPageReq = {
    pageNum: params.pageNum,
    pageSize: params.pageSize,
  };

  const jobCode = normalizeOptionalText(params.jobCode);
  const startTimeFrom = formatRangeBoundary(params.startTimeRange?.[0]);
  const startTimeTo = formatRangeBoundary(params.startTimeRange?.[1]);

  if (params.orderName) req.orderName = params.orderName;
  if (params.orderType) req.orderType = params.orderType;
  if (jobCode) req.jobCode = jobCode;
  if (params.runStatus) req.runStatus = params.runStatus;
  if (params.triggerSource) req.triggerSource = params.triggerSource;
  if (startTimeFrom) req.startTimeFrom = startTimeFrom;
  if (startTimeTo) req.startTimeTo = startTimeTo;

  return req;
}

function getRunStatusLabel(t: NebulaTranslator, status: SchedulerJobRunStatus): string {
  return translateKey(t, RUN_STATUS_LABEL_KEY[status]);
}

function getTriggerSourceLabel(t: NebulaTranslator, source: SchedulerTriggerSource): string {
  return translateKey(t, TRIGGER_SOURCE_LABEL_KEY[source]);
}

export const JobRunTable = forwardRef<JobRunTableHandle, JobRunTableProps>(function JobRunTable(
  { service, onDetail, onLogs, onTerminate, onRetry, onRerun },
  ref,
) {
  const actionRef = useRef<NebulaProTableAction | undefined>(undefined);
  const { t } = useNebulaI18n();
  const notice = useNotice();

  useImperativeHandle(ref, () => ({ reload: () => actionRef.current?.reload() ?? Promise.resolve() }), []);

  const requestRuns = useCallback(
    (params: JobRunQuery & NebulaPageReq) => service.pageJobRuns(buildJobRunPageReq(params)),
    [service],
  );

  const runStatusValueEnum = useMemo(
    () => Object.fromEntries(RUN_STATUSES.map((status) => [status, { text: getRunStatusLabel(t, status) }])),
    [t],
  );

  const triggerSourceValueEnum = useMemo(
    () => Object.fromEntries(TRIGGER_SOURCES.map((source) => [source, { text: getTriggerSourceLabel(t, source) }])),
    [t],
  );

  const columns = useMemo<NebulaProColumns<SchedulerJobRunResp>[]>(() => [
    {
      title: t('scheduler.run.columns.requestId'),
      dataIndex: 'requestId',
      width: 220,
      search: false,
      render: (_, record) => (
        <Typography.Text copyable={{ text: record.requestId }} ellipsis={{ tooltip: record.requestId }}>
          {record.requestId}
        </Typography.Text>
      ),
    },
    {
      title: t('scheduler.run.columns.jobCode'),
      dataIndex: 'jobCode',
      width: 180,
      sorter: true,
      fieldProps: {
        'aria-label': t('scheduler.run.search.jobCode'),
        placeholder: t('scheduler.run.placeholders.jobCode'),
      },
    },
    {
      title: t('scheduler.run.columns.runStatus'),
      dataIndex: 'runStatus',
      width: 140,
      valueType: 'select',
      valueEnum: runStatusValueEnum,
      fieldProps: {
        'aria-label': t('scheduler.run.search.runStatus'),
        placeholder: t('scheduler.run.placeholders.runStatus'),
      },
      render: (_, record) => (
        <Tag color={RUN_STATUS_TAG_COLOR[record.runStatus]}>
          {getRunStatusLabel(t, record.runStatus)}
        </Tag>
      ),
    },
    {
      title: t('scheduler.run.columns.triggerSource'),
      dataIndex: 'triggerSource',
      width: 140,
      valueType: 'select',
      valueEnum: triggerSourceValueEnum,
      fieldProps: {
        'aria-label': t('scheduler.run.search.triggerSource'),
        placeholder: t('scheduler.run.placeholders.triggerSource'),
      },
      render: (_, record) => (
        <Tag color={TRIGGER_SOURCE_TAG_COLOR[record.triggerSource]}>
          {getTriggerSourceLabel(t, record.triggerSource)}
        </Tag>
      ),
    },
    {
      title: t('scheduler.run.search.startTimeRange'),
      dataIndex: 'startTimeRange',
      valueType: 'dateTimeRange',
      hideInTable: true,
      fieldProps: {
        'aria-label': t('scheduler.run.search.startTimeRange'),
        placeholder: [t('scheduler.run.placeholders.startTimeRange'), t('scheduler.run.placeholders.startTimeRange')],
      },
    },
    {
      title: t('scheduler.run.columns.startTime'),
      dataIndex: 'startTime',
      width: 180,
      search: false,
      sorter: true,
      render: (_, record) => formatDateTime(record.startTime),
    },
    {
      title: t('scheduler.run.columns.finishTime'),
      dataIndex: 'finishTime',
      width: 180,
      search: false,
      sorter: true,
      render: (_, record) => formatDateTime(record.finishTime),
    },
    {
      title: t('scheduler.run.columns.resultMessage'),
      dataIndex: 'resultMessage',
      width: 240,
      search: false,
      render: (_, record) => (
        <Typography.Text className="block max-w-[240px]" ellipsis={{ tooltip: record.resultMessage }}>
          {record.resultMessage || '-'}
        </Typography.Text>
      ),
    },
    {
      title: t('scheduler.run.columns.actions'),
      key: 'actions',
      fixed: 'right',
      width: 320,
      valueType: 'option',
      search: false,
      render: (_, record) => [
        <Button key="detail" type="link" icon={<InfoCircleOutlined />} aria-label={`${t('scheduler.run.actions.detail')} ${record.requestId}`} onClick={() => onDetail(record)}>
          {t('scheduler.run.actions.detail')}
        </Button>,
        <Button key="logs" type="link" icon={<FileTextOutlined />} aria-label={`${t('scheduler.run.actions.logs')} ${record.requestId}`} onClick={() => onLogs(record)}>
          {t('scheduler.run.actions.logs')}
        </Button>,
        record.runStatus === 'RUNNING' ? (
          <Button key="terminate" type="link" danger icon={<StopOutlined />} aria-label={`${t('scheduler.run.actions.terminate')} ${record.requestId}`} onClick={() => onTerminate(record)}>
            {t('scheduler.run.actions.terminate')}
          </Button>
        ) : null,
        record.runStatus === 'FAILED' ? (
          <Button key="retry" type="link" icon={<ReloadOutlined />} aria-label={`${t('scheduler.run.actions.retry')} ${record.requestId}`} onClick={() => onRetry(record)}>
            {t('scheduler.run.actions.retry')}
          </Button>
        ) : null,
        <Button key="rerun" type="link" icon={<RedoOutlined />} aria-label={`${t('scheduler.run.actions.rerun')} ${record.requestId}`} onClick={() => onRerun(record)}>
          {t('scheduler.run.actions.rerun')}
        </Button>,
      ],
    },
  ], [onDetail, onLogs, onRerun, onRetry, onTerminate, runStatusValueEnum, t, triggerSourceValueEnum]);

  return (
    <NebulaProTable<SchedulerJobRunResp, JobRunQuery>
      rowKey="id"
      actionRef={actionRef}
      columns={columns}
      request={requestRuns}
      onRequestError={() => notice.error(t('scheduler.run.feedback.listLoadFailed'))}
      search={{ labelWidth: 'auto', defaultCollapsed: false }}
      size="middle"
      scroll={{ x: 1420 }}
    />
  );
});
