import { Form, Input, Modal, Typography } from 'antd';
import { useCallback, useEffect } from 'react';
import { useNebulaI18n } from '@/hooks/use-nebula-i18n';

export type JobRunActionType = 'terminate' | 'retry' | 'rerun';

export interface JobRunActionModalProps {
  readonly open: boolean;
  readonly actionType: JobRunActionType;
  readonly submitting: boolean;
  readonly onSubmit: (reason?: string) => void;
  readonly onCancel: () => void;
}

interface JobRunActionFormValues {
  readonly reason?: string;
}

function getActionTitleKey(actionType: JobRunActionType) {
  switch (actionType) {
    case 'terminate':
      return 'scheduler.run.modal.terminateTitle';
    case 'retry':
      return 'scheduler.run.modal.retryTitle';
    case 'rerun':
      return 'scheduler.run.modal.rerunTitle';
  }
}

export function JobRunActionModal({
  open,
  actionType,
  submitting,
  onSubmit,
  onCancel,
}: JobRunActionModalProps) {
  const [form] = Form.useForm<JobRunActionFormValues>();
  const { t } = useNebulaI18n();

  useEffect(() => {
    if (open) form.resetFields();
  }, [form, open]);

  const handleFinish = useCallback(
    (values: JobRunActionFormValues) => {
      const reason = values.reason?.trim();
      onSubmit(reason || undefined);
    },
    [onSubmit],
  );

  return (
    <Modal
      title={t(getActionTitleKey(actionType))}
      open={open}
      confirmLoading={submitting}
      okText={t('common.actions.confirm')}
      cancelText={t('common.actions.cancel')}
      destroyOnHidden
      forceRender
      onOk={() => form.submit()}
      onCancel={onCancel}
    >
      <Form form={form} layout="vertical" disabled={submitting} onFinish={handleFinish}>
        {actionType === 'terminate' ? (
          <Typography.Paragraph type="secondary">
            {t('scheduler.run.modal.terminateConfirm')}
          </Typography.Paragraph>
        ) : null}
        <Form.Item
          name="reason"
          label={t('scheduler.run.modal.reasonLabel')}
          htmlFor="job-run-action-reason"
        >
          <Input.TextArea
            id="job-run-action-reason"
            aria-label={t('scheduler.run.modal.reasonLabel')}
            allowClear
            rows={3}
            placeholder={t('scheduler.run.placeholders.reason')}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
