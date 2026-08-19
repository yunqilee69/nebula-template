import { Descriptions, Form, Input, Modal, Switch } from 'antd';
import type { FormInstance } from 'antd';
import { useNebulaI18n } from '@/hooks/use-nebula-i18n';
import type { SchedulerJobDetailResp, UpdateSchedulerJobReq } from '@/types/scheduler';

export interface JobFormValues extends UpdateSchedulerJobReq {
  enabled: boolean;
}

interface JobFormModalProps {
  readonly form: FormInstance<JobFormValues>;
  readonly open: boolean;
  readonly submitting: boolean;
  readonly detailLoading: boolean;
  readonly job?: SchedulerJobDetailResp;
  readonly onSubmit: () => void;
  readonly onCancel: () => void;
}

function renderText(value: string | undefined) {
  return value || '-';
}

function isJsonRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseOptionalJsonObject(value: string | undefined) {
  const normalized = value?.trim();
  if (!normalized) return null;
  const parsed: unknown = JSON.parse(normalized);
  if (isJsonRecord(parsed)) return parsed;
  throw new SyntaxError('JSON must be an object');
}

function isValidCronExpression(value: string | undefined) {
  const normalized = value?.trim();
  if (!normalized) return true;
  const segments = normalized.split(/\s+/);
  return segments.length >= 5 && segments.length <= 7 && segments.every((segment) => segment.length > 0);
}

export function JobFormModal({ form, open, submitting, detailLoading, job, onSubmit, onCancel }: JobFormModalProps) {
  const { t } = useNebulaI18n();

  return (
    <Modal
      title={t('scheduler.job.modal.editTitle')}
      open={open}
      width={760}
      confirmLoading={submitting}
      okText={t('common.actions.confirm')}
      cancelText={t('common.actions.cancel')}
      forceRender
      onOk={onSubmit}
      onCancel={onCancel}
    >
      <Descriptions size="small" column={2} bordered className="mb-4">
        <Descriptions.Item label={t('scheduler.job.fields.jobCode')}>{renderText(job?.jobCode)}</Descriptions.Item>
        <Descriptions.Item label={t('scheduler.job.fields.jobName')}>{renderText(job?.jobName)}</Descriptions.Item>
        <Descriptions.Item label={t('scheduler.job.fields.engineJobRef')}>{renderText(job?.engineJobRef)}</Descriptions.Item>
        <Descriptions.Item label={t('scheduler.job.fields.paramClassName')}>{renderText(job?.paramClassName)}</Descriptions.Item>
      </Descriptions>
      <Form form={form} layout="vertical" disabled={detailLoading || submitting} initialValues={{ enabled: true }}>
        <Form.Item name="jobName" label={t('scheduler.job.fields.jobName')}>
          <Input allowClear placeholder={t('scheduler.job.placeholders.jobName')} />
        </Form.Item>
        <Form.Item
          name="cronExpr"
          label={t('scheduler.job.fields.cronExpr')}
          rules={[{
            validator: (_, value: string | undefined) => {
              if (isValidCronExpression(value)) return Promise.resolve();
              return Promise.reject(new Error(t('scheduler.job.validation.cronFormat')));
            },
          }]}
        >
          <Input allowClear placeholder={t('scheduler.job.placeholders.cronExpr')} />
        </Form.Item>
        <Form.Item name="enabled" label={t('scheduler.job.fields.enabled')} valuePropName="checked">
          <Switch checkedChildren={t('scheduler.job.actions.enable')} unCheckedChildren={t('scheduler.job.actions.disable')} />
        </Form.Item>
        <Form.Item
          name="defaultParamJson"
          label={t('scheduler.job.fields.defaultParamJson')}
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
          <Input.TextArea rows={4} placeholder={t('scheduler.job.placeholders.defaultParamJson')} />
        </Form.Item>
        <Form.Item name="description" label={t('scheduler.job.fields.description')}>
          <Input.TextArea rows={3} placeholder={t('scheduler.job.placeholders.description')} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
