import { Flex, Input, Modal, Space, Spin, Tag, Typography } from 'antd';
import { useNebulaI18n } from '@/hooks/use-nebula-i18n';
import type { SchedulerJobLogResp } from '@/types/scheduler';

export interface JobRunLogModalProps {
  readonly open: boolean;
  readonly log?: SchedulerJobLogResp;
  readonly loading: boolean;
  readonly onClose: () => void;
}

function formatText(value: string | undefined): string {
  return value?.trim() ? value : '-';
}

export function JobRunLogModal({ open, log, loading, onClose }: JobRunLogModalProps) {
  const { t } = useNebulaI18n();
  const content = log?.content ?? '';

  return (
    <Modal
      title={t('scheduler.run.modal.logTitle')}
      open={open}
      footer={null}
      width={840}
      destroyOnHidden
      onCancel={onClose}
    >
      <Flex vertical gap="middle" className="w-full">
        <Space wrap>
          <Typography.Text type="secondary">{t('scheduler.run.columns.logSource')}</Typography.Text>
          <Typography.Text>{formatText(log?.logSource)}</Typography.Text>
          {log?.truncated ? <Tag color="warning">{t('scheduler.run.modal.logTruncated')}</Tag> : null}
        </Space>
        <Spin spinning={loading}>
          <Input.TextArea
            aria-label={t('scheduler.run.columns.content')}
            autoSize={{ minRows: 12, maxRows: 20 }}
            placeholder={t('scheduler.run.columns.content')}
            readOnly
            value={content}
          />
        </Spin>
      </Flex>
    </Modal>
  );
}
