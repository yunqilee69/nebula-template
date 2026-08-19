import { Collapse, Descriptions, Modal, Tag, Typography } from 'antd';
import {
  AUDIT_RESULT_STATUS_LABEL_KEY,
  AUDIT_RESULT_STATUS_TAG_COLOR,
} from '@/enums/audit';
import { useNebulaI18n } from '@/hooks/use-nebula-i18n';
import type { AuditRecordDetailResp } from '@/types/audit';
import type { AuditActionDictionary } from '../use-audit-action-dictionary';
import { JsonViewer } from './json-viewer';

interface AuditRecordDetailModalProps {
  readonly open: boolean;
  readonly loading: boolean;
  readonly detail?: AuditRecordDetailResp;
  readonly actionDictionary: AuditActionDictionary;
  readonly onClose: () => void;
}

function formatText(value: string | undefined): string {
  return value?.trim() ? value : '-';
}

function formatDateTime(value: string | undefined): string {
  return value ? value.replace('T', ' ') : '-';
}

export function AuditRecordDetailModal({
  open,
  loading,
  detail,
  actionDictionary,
  onClose,
}: AuditRecordDetailModalProps) {
  const { t } = useNebulaI18n();

  return (
    <Modal
      title={t('audit.modal.detailTitle')}
      open={open}
      onCancel={onClose}
      width={900}
      footer={null}
      loading={loading}
      destroyOnHidden
    >
      <div className="space-y-4">
        <Descriptions title={t('audit.modal.basicInfo')} bordered size="small" column={2}>
          <Descriptions.Item label={t('audit.columns.id')} span={2}>
            <Typography.Text copyable={detail?.id ? { text: detail.id } : false}>
              {formatText(detail?.id)}
            </Typography.Text>
          </Descriptions.Item>
          <Descriptions.Item label={t('audit.columns.module')}>{formatText(detail?.module)}</Descriptions.Item>
          <Descriptions.Item label={t('audit.columns.action')}>
            {detail ? actionDictionary.getLabel(detail.action) : '-'}
          </Descriptions.Item>
          <Descriptions.Item label={t('audit.columns.operatorId')}>{formatText(detail?.operatorId)}</Descriptions.Item>
          <Descriptions.Item label={t('audit.columns.operatorName')}>{formatText(detail?.operatorName)}</Descriptions.Item>
          <Descriptions.Item label={t('audit.columns.resourceType')}>{formatText(detail?.resourceType)}</Descriptions.Item>
          <Descriptions.Item label={t('audit.columns.resourceId')}>{formatText(detail?.resourceId)}</Descriptions.Item>
          <Descriptions.Item label={t('audit.columns.resourceName')}>{formatText(detail?.resourceName)}</Descriptions.Item>
          <Descriptions.Item label={t('audit.columns.requestIp')}>{formatText(detail?.requestIp)}</Descriptions.Item>
          <Descriptions.Item label={t('audit.columns.resultStatus')} span={2}>
            {detail ? (
              <Tag color={AUDIT_RESULT_STATUS_TAG_COLOR[detail.resultStatus]}>
                {t(AUDIT_RESULT_STATUS_LABEL_KEY[detail.resultStatus])}
              </Tag>
            ) : '-'}
          </Descriptions.Item>
          <Descriptions.Item label={t('audit.columns.resultMessage')} span={2}>
            {formatText(detail?.resultMessage)}
          </Descriptions.Item>
          <Descriptions.Item label={t('audit.columns.createTime')}>{formatDateTime(detail?.createTime)}</Descriptions.Item>
          <Descriptions.Item label={t('audit.columns.updateTime')}>{formatDateTime(detail?.updateTime)}</Descriptions.Item>
        </Descriptions>

        <Collapse
          defaultActiveKey={['requestParams', 'responseData']}
          items={[
            {
              key: 'requestParams',
              label: t('audit.columns.requestParams'),
              children: <JsonViewer json={detail?.requestParams} label={t('audit.columns.requestParams')} />,
            },
            {
              key: 'responseData',
              label: t('audit.columns.responseData'),
              children: <JsonViewer json={detail?.responseData} label={t('audit.columns.responseData')} />,
            },
          ]}
        />
      </div>
    </Modal>
  );
}
