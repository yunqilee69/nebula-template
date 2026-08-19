import { EditOutlined, EyeOutlined, PauseCircleOutlined, PlayCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import { Button, Tag } from 'antd';
import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { NebulaProTable } from '@/components/nebula-pro-table';
import type { NebulaPageReq, NebulaProColumns, NebulaProTableAction } from '@/components/nebula-pro-table';
import { useNebulaI18n } from '@/hooks/use-nebula-i18n';
import { useNotice } from '@/hooks/use-notice';
import type { SchedulerService } from '@/services/scheduler';
import type { SchedulerJobPageReq, SchedulerJobResp } from '@/types/scheduler';

export interface JobTableHandle {
  reload: () => Promise<void>;
}

type JobEnabledSearchValue = boolean | 'true' | 'false';

interface JobQuery {
  jobCode?: string;
  jobName?: string;
  enabled?: JobEnabledSearchValue;
}

interface JobTableProps {
  readonly service: SchedulerService;
  readonly onDetail: (record: SchedulerJobResp) => void;
  readonly onEdit: (record: SchedulerJobResp) => void;
  readonly onTrigger: (record: SchedulerJobResp) => void;
}

function normalizeOptionalText(value: string | undefined) {
  const normalized = value?.trim();
  return normalized || undefined;
}

function normalizeOptionalBoolean(value: JobEnabledSearchValue | undefined) {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
}

function buildJobPageReq(params: JobQuery & NebulaPageReq): SchedulerJobPageReq {
  const jobCode = normalizeOptionalText(params.jobCode);
  const jobName = normalizeOptionalText(params.jobName);
  const enabled = normalizeOptionalBoolean(params.enabled);

  return {
    pageNum: params.pageNum,
    pageSize: params.pageSize,
    ...(params.orderName ? { orderName: params.orderName } : {}),
    ...(params.orderType ? { orderType: params.orderType } : {}),
    ...(jobCode ? { jobCode } : {}),
    ...(jobName ? { jobName } : {}),
    ...(enabled !== undefined ? { enabled } : {}),
  };
}

export const JobTable = forwardRef<JobTableHandle, JobTableProps>(function JobTable(
  { service, onDetail, onEdit, onTrigger },
  ref,
) {
  const actionRef = useRef<NebulaProTableAction | undefined>(undefined);
  const [togglingJobCode, setTogglingJobCode] = useState<string>();
  const { t } = useNebulaI18n();
  const notice = useNotice();

  const reloadTable = useCallback(() => actionRef.current?.reload() ?? Promise.resolve(), []);

  useImperativeHandle(ref, () => ({ reload: reloadTable }), [reloadTable]);

  const requestJobs = useCallback(
    (params: JobQuery & NebulaPageReq) => service.pageJobs(buildJobPageReq(params)),
    [service],
  );

  const toggleJob = useCallback(
    async (record: SchedulerJobResp) => {
      setTogglingJobCode(record.jobCode);
      try {
        if (record.enabled) {
          await service.disableJob(record.jobCode);
          notice.success(t('scheduler.job.feedback.disableSuccess'));
        } else {
          await service.enableJob(record.jobCode);
          notice.success(t('scheduler.job.feedback.enableSuccess'));
        }
        await reloadTable();
      } catch (error: unknown) {
        notice.error(record.enabled ? t('scheduler.job.feedback.disableFailed') : t('scheduler.job.feedback.enableFailed'));
        const message = error instanceof Error ? error.message : String(error);
        console.error('Failed to toggle scheduler job', message);
      } finally {
        setTogglingJobCode(undefined);
      }
    },
    [notice, reloadTable, service, t],
  );

  const enabledValueEnum = useMemo(
    () => ({
      true: { text: t('scheduler.job.actions.enable') },
      false: { text: t('scheduler.job.actions.disable') },
    }) satisfies Record<string, { text: string }>,
    [t],
  );

  const columns = useMemo<NebulaProColumns<SchedulerJobResp>[]>(() => [
    { title: t('scheduler.job.columns.jobName'), dataIndex: 'jobName', width: 180, sorter: true },
    { title: t('scheduler.job.columns.jobCode'), dataIndex: 'jobCode', width: 200, sorter: true },
    { title: t('scheduler.job.columns.cronExpr'), dataIndex: 'cronExpr', width: 180, search: false, renderText: (value?: string) => value || '-' },
    {
      title: t('scheduler.job.columns.enabled'),
      dataIndex: 'enabled',
      width: 120,
      valueType: 'select',
      valueEnum: enabledValueEnum,
      fieldProps: { 'aria-label': t('scheduler.job.search.enabled') },
      render: (_, record) => (
        <Tag color={record.enabled ? 'success' : 'default'}>
          {record.enabled ? t('scheduler.job.actions.enable') : t('scheduler.job.actions.disable')}
        </Tag>
      ),
    },
    {
      title: t('scheduler.job.columns.actions'),
      key: 'actions',
      fixed: 'right',
      width: 300,
      valueType: 'option',
      search: false,
      render: (_, record) => [
        <Button key="detail" type="link" icon={<EyeOutlined />} onClick={() => onDetail(record)}>{t('scheduler.job.actions.detail')}</Button>,
        <Button key="edit" type="link" icon={<EditOutlined />} onClick={() => onEdit(record)}>{t('scheduler.job.actions.edit')}</Button>,
        <Button key="trigger" type="link" icon={<PlayCircleOutlined />} onClick={() => onTrigger(record)}>{t('scheduler.job.actions.trigger')}</Button>,
        <Button
          key="toggle"
          type="link"
          loading={togglingJobCode === record.jobCode}
          icon={record.enabled ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
          onClick={() => void toggleJob(record)}
        >
          {record.enabled ? t('scheduler.job.actions.disable') : t('scheduler.job.actions.enable')}
        </Button>,
      ],
    },
  ], [enabledValueEnum, onDetail, onEdit, onTrigger, t, toggleJob, togglingJobCode]);

  return (
    <NebulaProTable<SchedulerJobResp, JobQuery>
      actionRef={actionRef}
      columns={columns}
      request={requestJobs}
      onRequestError={() => notice.error(t('scheduler.job.feedback.listLoadFailed'))}
      search={{ labelWidth: 'auto', defaultCollapsed: false }}
      size="middle"
      scroll={{ x: 980 }}
      toolBarRender={() => [
        <Button key="refresh" icon={<ReloadOutlined />} onClick={() => void reloadTable()}>{t('scheduler.job.actions.refresh')}</Button>,
      ]}
    />
  );
});
