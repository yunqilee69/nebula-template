import { Drawer, Empty, Skeleton, Space, Table, Tag, Typography, theme as antdTheme } from 'antd';
import type { TableColumnsType } from 'antd';
import { useMemo } from 'react';
import { useNebulaI18n } from '@/hooks/use-nebula-i18n';
import type { SchedulerJobDetailResp, SchedulerJobParamSchemaResp } from '@/types/scheduler';

interface JobDetailDrawerProps {
  readonly open: boolean;
  readonly detail?: SchedulerJobDetailResp;
  readonly loading: boolean;
  readonly onClose: () => void;
}

function renderText(value: string | undefined) {
  return value || '-';
}

function formatUnknown(value: unknown) {
  if (value === undefined || value === null || value === '') return '-';
  if (typeof value === 'string') return value;
  return JSON.stringify(value, null, 2);
}

export function JobDetailDrawer({ open, detail, loading, onClose }: JobDetailDrawerProps) {
  const { token } = antdTheme.useToken();
  const { t } = useNebulaI18n();

  const schemaColumns = useMemo<TableColumnsType<SchedulerJobParamSchemaResp>>(() => [
    { title: t('scheduler.job.fields.param'), dataIndex: 'fieldKey', width: 160 },
    { title: t('scheduler.job.fields.paramClassName'), dataIndex: 'fieldType', width: 140 },
    {
      title: t('scheduler.job.fields.enabled'),
      dataIndex: 'required',
      width: 100,
      render: (required: boolean) => <Tag color={required ? 'error' : 'default'}>{required ? t('common.actions.confirm') : '-'}</Tag>,
    },
    { title: t('scheduler.job.columns.jobName'), dataIndex: 'label', width: 160 },
    { title: t('scheduler.job.columns.description'), dataIndex: 'description', render: (value?: string) => renderText(value) },
    { title: t('scheduler.job.fields.defaultParamJson'), dataIndex: 'defaultValue', render: (value: unknown) => formatUnknown(value) },
  ], [t]);

  return (
    <Drawer title={t('scheduler.job.modal.detailTitle')} open={open} size={760} onClose={onClose}>
      <Skeleton loading={loading} active paragraph={{ rows: 8 }}>
        {detail ? (
          <Space orientation="vertical" size={token.marginMD} className="w-full">
            <Table
              size="small"
              rowKey="label"
              columns={[
                { title: t('scheduler.job.columns.jobName'), dataIndex: 'label' },
                { title: t('scheduler.job.columns.description'), dataIndex: 'value' },
              ]}
              dataSource={[
                { label: 'ID', value: detail.id },
                { label: t('scheduler.job.fields.jobCode'), value: detail.jobCode },
                { label: t('scheduler.job.fields.jobName'), value: detail.jobName },
                { label: t('scheduler.job.fields.cronExpr'), value: renderText(detail.cronExpr) },
                {
                  label: t('scheduler.job.fields.enabled'),
                  value: <Tag color={detail.enabled ? 'success' : 'default'}>{detail.enabled ? t('scheduler.job.actions.enable') : t('scheduler.job.actions.disable')}</Tag>,
                },
                { label: t('scheduler.job.fields.engineJobRef'), value: renderText(detail.engineJobRef) },
                { label: t('scheduler.job.fields.paramClassName'), value: renderText(detail.paramClassName) },
                {
                  label: t('scheduler.job.fields.manualTriggerEnabled'),
                  value: <Tag color={detail.manualTriggerEnabled ? 'success' : 'default'}>{detail.manualTriggerEnabled ? t('common.actions.confirm') : '-'}</Tag>,
                },
                {
                  label: t('scheduler.job.fields.paramOverrideEnabled'),
                  value: <Tag color={detail.paramOverrideEnabled ? 'success' : 'default'}>{detail.paramOverrideEnabled ? t('common.actions.confirm') : '-'}</Tag>,
                },
                { label: t('scheduler.job.fields.description'), value: renderText(detail.description) },
                {
                  label: t('scheduler.job.fields.defaultParamJson'),
                  value: detail.defaultParamJson ? <Typography.Paragraph copyable className="m-0 whitespace-pre-wrap break-all">{detail.defaultParamJson}</Typography.Paragraph> : '-',
                },
              ]}
              pagination={false}
              showHeader={false}
            />
            <Typography.Title level={5}>{t('scheduler.job.modal.paramSchemaTitle')}</Typography.Title>
            {detail.paramSchemaList?.length ? (
              <Table<SchedulerJobParamSchemaResp>
                size="small"
                rowKey="fieldKey"
                columns={schemaColumns}
                dataSource={detail.paramSchemaList}
                pagination={false}
              />
            ) : (
              <Empty description={t('scheduler.job.empty.paramSchema')} />
            )}
          </Space>
        ) : (
          <Empty description={t('scheduler.job.feedback.detailLoadFailed')} />
        )}
      </Skeleton>
    </Drawer>
  );
}
