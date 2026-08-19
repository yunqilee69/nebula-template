import { Drawer, Descriptions, Tag, Typography } from 'antd';
import {
  RUN_STATUS_LABEL_KEY,
  RUN_STATUS_TAG_COLOR,
  TRIGGER_SOURCE_TAG_COLOR,
} from '@/enums/scheduler';
import type { SchedulerTriggerSource } from '@/enums/scheduler';
import { useNebulaI18n } from '@/hooks/use-nebula-i18n';
import type { SchedulerJobRunDetailResp } from '@/types/scheduler';

const TRIGGER_SOURCE_LABEL_KEY = {
  SCHEDULED: 'scheduler.triggerSource.scheduled',
  MANUAL: 'scheduler.triggerSource.manual',
  RETRY: 'scheduler.triggerSource.retry',
} as const satisfies Record<SchedulerTriggerSource, string>;

export interface JobRunDetailDrawerProps {
  readonly open: boolean;
  readonly detail?: SchedulerJobRunDetailResp;
  readonly loading: boolean;
  readonly onClose: () => void;
}

type NebulaTranslator = ReturnType<typeof useNebulaI18n>['t'];

function translateKey(t: NebulaTranslator, key: string): string {
  return String(Reflect.apply(t, undefined, [key]));
}

function formatDateTime(value: string | undefined): string {
  return value ? value.replace('T', ' ') : '-';
}

function formatText(value: string | undefined): string {
  return value?.trim() ? value : '-';
}

function JsonBlock({ value }: { readonly value?: string }) {
  const content = value?.trim() ? value : '-';

  return (
    <Typography.Paragraph
      className="mb-0 whitespace-pre-wrap break-all"
      copyable={value?.trim() ? { text: value } : false}
      type={value?.trim() ? undefined : 'secondary'}
    >
      {content}
    </Typography.Paragraph>
  );
}

export function JobRunDetailDrawer({ open, detail, loading, onClose }: JobRunDetailDrawerProps) {
  const { t } = useNebulaI18n();

  return (
    <Drawer
      title={t('scheduler.run.modal.detailTitle')}
      open={open}
      loading={loading}
      destroyOnHidden
      onClose={onClose}
    >
      <Descriptions column={1} bordered size="small">
        <Descriptions.Item label={t('scheduler.run.columns.requestId')}>
          <Typography.Text copyable={detail?.requestId ? { text: detail.requestId } : false}>
            {formatText(detail?.requestId)}
          </Typography.Text>
        </Descriptions.Item>
        <Descriptions.Item label={t('scheduler.run.columns.jobCode')}>
          {formatText(detail?.jobCode)}
        </Descriptions.Item>
        <Descriptions.Item label={t('scheduler.run.columns.runStatus')}>
          {detail ? (
            <Tag color={RUN_STATUS_TAG_COLOR[detail.runStatus]}>
              {translateKey(t, RUN_STATUS_LABEL_KEY[detail.runStatus])}
            </Tag>
          ) : '-'}
        </Descriptions.Item>
        <Descriptions.Item label={t('scheduler.run.columns.triggerSource')}>
          {detail ? (
            <Tag color={TRIGGER_SOURCE_TAG_COLOR[detail.triggerSource]}>
              {translateKey(t, TRIGGER_SOURCE_LABEL_KEY[detail.triggerSource])}
            </Tag>
          ) : '-'}
        </Descriptions.Item>
        <Descriptions.Item label={t('scheduler.run.columns.manualReason')}>
          {formatText(detail?.manualReason)}
        </Descriptions.Item>
        <Descriptions.Item label={t('scheduler.run.columns.operatorName')}>
          {formatText(detail?.operatorName)}
        </Descriptions.Item>
        <Descriptions.Item label={t('scheduler.run.columns.triggerTime')}>
          {formatDateTime(detail?.triggerTime)}
        </Descriptions.Item>
        <Descriptions.Item label={t('scheduler.run.columns.startTime')}>
          {formatDateTime(detail?.startTime)}
        </Descriptions.Item>
        <Descriptions.Item label={t('scheduler.run.columns.finishTime')}>
          {formatDateTime(detail?.finishTime)}
        </Descriptions.Item>
        <Descriptions.Item label={t('scheduler.run.columns.finalParamJson')}>
          <JsonBlock value={detail?.finalParamJson} />
        </Descriptions.Item>
        <Descriptions.Item label={t('scheduler.run.columns.resultMessage')}>
          <Typography.Paragraph className="mb-0" ellipsis={{ rows: 3, tooltip: detail?.resultMessage }}>
            {formatText(detail?.resultMessage)}
          </Typography.Paragraph>
        </Descriptions.Item>
        <Descriptions.Item label={t('scheduler.run.columns.resultJson')}>
          <JsonBlock value={detail?.resultJson} />
        </Descriptions.Item>
      </Descriptions>
    </Drawer>
  );
}
