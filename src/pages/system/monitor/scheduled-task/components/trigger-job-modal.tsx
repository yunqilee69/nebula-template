import { Alert, Descriptions, Form, Input, Modal, Table, Tag } from 'antd';
import type { TableColumnsType } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNebulaI18n } from '@/hooks/use-nebula-i18n';
import { useNotice } from '@/hooks/use-notice';
import type { SchedulerService } from '@/services/scheduler';
import type { SchedulerJobDetailResp, SchedulerJobParamSchemaResp, SchedulerJobResp, SchedulerJobTriggerResultResp, TriggerSchedulerJobReq } from '@/types/scheduler';

interface TriggerJobFormValues {
  readonly reason?: string;
  readonly param?: string;
}

interface TriggerJobModalProps {
  readonly service: SchedulerService;
  readonly open: boolean;
  readonly job?: SchedulerJobResp;
  readonly detail?: SchedulerJobDetailResp;
  readonly loading?: boolean;
  readonly submitting?: boolean;
  readonly onDetailLoaded?: (detail: SchedulerJobDetailResp) => void;
  readonly onTriggered?: (result: SchedulerJobTriggerResultResp) => void;
  readonly onCancel: () => void;
}

function normalizeOptionalText(value: string | undefined) {
  const normalized = value?.trim();
  return normalized || undefined;
}

function isJsonRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseOptionalJsonObject(value: string | undefined) {
  const normalized = value?.trim();
  if (!normalized) return null;
  const parsed: unknown = JSON.parse(normalized);
  if (isJsonRecord(parsed)) return parsed;
  throw new SyntaxError('JSON must be an object');
}

function renderText(value: string | undefined) {
  return value || '-';
}

export function TriggerJobModal({
  service,
  open,
  job,
  detail,
  loading = false,
  submitting = false,
  onDetailLoaded,
  onTriggered,
  onCancel,
}: TriggerJobModalProps) {
  const [form] = Form.useForm<TriggerJobFormValues>();
  const [localDetail, setLocalDetail] = useState<SchedulerJobDetailResp>();
  const [detailLoading, setDetailLoading] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const { t } = useNebulaI18n();
  const notice = useNotice();

  const providedDetail = detail?.jobCode === job?.jobCode ? detail : undefined;
  const matchingLocalDetail = localDetail?.jobCode === job?.jobCode ? localDetail : undefined;
  const effectiveDetail = providedDetail ?? matchingLocalDetail;
  const effectiveLoading = loading || detailLoading;
  const effectiveSubmitting = submitting || triggering;
  const canTrigger = effectiveDetail?.manualTriggerEnabled === true;
  const canOverrideParam = effectiveDetail?.paramOverrideEnabled === true;

  useEffect(() => {
    if (!open) {
      form.resetFields();
      setLocalDetail(undefined);
      return;
    }
    form.setFieldsValue({ reason: undefined, param: providedDetail?.defaultParamJson });
  }, [form, open, providedDetail]);

  useEffect(() => {
    if (!open || !job) return;
    if (detail?.jobCode === job.jobCode) return;

    let active = true;
    setLocalDetail(undefined);
    form.setFieldsValue({ param: undefined });
    setDetailLoading(true);
    void service.getJobDetail(job.jobCode)
      .then((nextDetail) => {
        if (!active) return;
        setLocalDetail(nextDetail);
        form.setFieldsValue({ param: nextDetail.defaultParamJson });
        onDetailLoaded?.(nextDetail);
      })
      .catch((error: unknown) => {
        if (!active) return;
        notice.error(t('scheduler.job.feedback.detailLoadFailed'));
        const message = error instanceof Error ? error.message : String(error);
        console.error('Failed to load scheduler job detail', message);
      })
      .finally(() => {
        if (active) setDetailLoading(false);
      });

    return () => {
      active = false;
    };
  }, [detail, form, job, notice, onDetailLoaded, open, service, t]);

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
  ], [t]);

  const submitTrigger = useCallback(
    async (values: TriggerJobFormValues) => {
      if (!effectiveDetail || !canTrigger) return;
      const payload: TriggerSchedulerJobReq = {};
      const reason = normalizeOptionalText(values.reason);
      if (reason) payload.reason = reason;
      if (canOverrideParam) {
        const parsedParam = parseOptionalJsonObject(values.param);
        if (parsedParam) payload.param = parsedParam;
      }

      setTriggering(true);
      try {
        const result = await service.triggerJob(effectiveDetail.jobCode, payload);
        notice.success(t('scheduler.job.feedback.triggerSuccess'));
        onTriggered?.(result);
      } catch (error: unknown) {
        notice.error(t('scheduler.job.feedback.triggerFailed'));
        const message = error instanceof Error ? error.message : String(error);
        console.error('Failed to trigger scheduler job', message);
      } finally {
        setTriggering(false);
      }
    },
    [canOverrideParam, canTrigger, effectiveDetail, notice, onTriggered, service, t],
  );

  return (
    <Modal
      title={t('scheduler.job.modal.triggerTitle')}
      open={open}
      width={720}
      confirmLoading={effectiveSubmitting}
      okText={t('scheduler.job.actions.trigger')}
      cancelText={t('common.actions.cancel')}
      okButtonProps={{ disabled: effectiveLoading || !canTrigger || !effectiveDetail }}
      forceRender
      onOk={() => form.submit()}
      onCancel={onCancel}
    >
      <Descriptions size="small" column={2} bordered className="mb-4">
        <Descriptions.Item label={t('scheduler.job.fields.jobCode')}>{renderText(effectiveDetail?.jobCode ?? job?.jobCode)}</Descriptions.Item>
        <Descriptions.Item label={t('scheduler.job.fields.jobName')}>{renderText(effectiveDetail?.jobName ?? job?.jobName)}</Descriptions.Item>
      </Descriptions>
      {!effectiveLoading && effectiveDetail && !canTrigger && (
        <Alert className="mb-4" type="warning" showIcon title={t('scheduler.job.modal.manualTriggerDisabled')} />
      )}
      {canOverrideParam && (
        <Table<SchedulerJobParamSchemaResp>
          className="mb-4"
          size="small"
          rowKey="fieldKey"
          columns={schemaColumns}
          dataSource={effectiveDetail?.paramSchemaList ?? []}
          pagination={false}
          locale={{ emptyText: t('scheduler.job.empty.paramSchema') }}
        />
      )}
      <Form form={form} layout="vertical" disabled={effectiveLoading || effectiveSubmitting || !canTrigger} onFinish={(values) => void submitTrigger(values)}>
        <Form.Item name="reason" label={t('scheduler.job.fields.reason')}>
          <Input allowClear placeholder={t('scheduler.job.placeholders.reason')} />
        </Form.Item>
        {canOverrideParam && (
          <Form.Item
            name="param"
            label={t('scheduler.job.fields.param')}
            rules={[{
              validator: (_, value: string | undefined) => {
                try {
                  parseOptionalJsonObject(value);
                  return Promise.resolve();
                } catch (error: unknown) {
                  if (error instanceof SyntaxError) {
                    return Promise.reject(new Error(t('scheduler.job.validation.paramJsonFormat')));
                  }
                  throw error;
                }
              },
            }]}
          >
            <Input.TextArea rows={5} placeholder={t('scheduler.job.placeholders.param')} />
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
}
