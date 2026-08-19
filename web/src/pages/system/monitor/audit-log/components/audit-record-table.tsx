import { EyeOutlined } from '@ant-design/icons';
import { Button, Tag, Typography } from 'antd';
import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef } from 'react';
import { NebulaProTable } from '@/components/nebula-pro-table';
import type { NebulaPageReq, NebulaProColumns, NebulaProTableAction } from '@/components/nebula-pro-table';
import {
  AUDIT_RESULT_STATUS_LABEL_KEY,
  AUDIT_RESULT_STATUS_TAG_COLOR,
  AUDIT_RESULT_STATUS_VALUES,
} from '@/enums/audit';
import { useNebulaI18n } from '@/hooks/use-nebula-i18n';
import type { AuditService } from '@/services/audit';
import type { AuditRecordPageReq, AuditRecordResp, AuditResultStatus } from '@/types/audit';
import type { AuditActionDictionary } from '../use-audit-action-dictionary';

export interface AuditRecordTableHandle {
  readonly reload: () => Promise<void>;
}

interface AuditRecordTableProps {
  readonly service: AuditService;
  readonly actionDictionary: AuditActionDictionary;
  readonly onDetail: (record: AuditRecordResp) => void;
}

export interface AuditRecordQuery {
  readonly module?: string;
  readonly action?: string;
  readonly operatorId?: string;
  readonly operatorName?: string;
  readonly resourceType?: string;
  readonly resourceId?: string;
  readonly resourceName?: string;
  readonly requestIp?: string;
  readonly resultStatus?: AuditResultStatus;
}

function normalizeOptionalText(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

export function buildAuditRecordPageReq(params: AuditRecordQuery & NebulaPageReq): AuditRecordPageReq {
  const module = normalizeOptionalText(params.module);
  const action = normalizeOptionalText(params.action);
  const operatorId = normalizeOptionalText(params.operatorId);
  const operatorName = normalizeOptionalText(params.operatorName);
  const resourceType = normalizeOptionalText(params.resourceType);
  const resourceId = normalizeOptionalText(params.resourceId);
  const resourceName = normalizeOptionalText(params.resourceName);
  const requestIp = normalizeOptionalText(params.requestIp);

  return {
    pageNum: params.pageNum,
    pageSize: params.pageSize,
    ...(params.orderName ? { orderName: params.orderName } : {}),
    ...(params.orderType ? { orderType: params.orderType } : {}),
    ...(module ? { module } : {}),
    ...(action ? { action } : {}),
    ...(operatorId ? { operatorId } : {}),
    ...(operatorName ? { operatorName } : {}),
    ...(resourceType ? { resourceType } : {}),
    ...(resourceId ? { resourceId } : {}),
    ...(resourceName ? { resourceName } : {}),
    ...(requestIp ? { requestIp } : {}),
    ...(params.resultStatus ? { resultStatus: params.resultStatus } : {}),
  };
}

function formatText(value: string | undefined): string {
  return value?.trim() ? value : '-';
}

function formatDateTime(value: string): string {
  return value.replace('T', ' ');
}

export const AuditRecordTable = forwardRef<AuditRecordTableHandle, AuditRecordTableProps>(
  function AuditRecordTable({ service, actionDictionary, onDetail }, ref) {
    const actionRef = useRef<NebulaProTableAction | undefined>(undefined);
    const { t } = useNebulaI18n();

    useImperativeHandle(
      ref,
      () => ({ reload: () => actionRef.current?.reload() ?? Promise.resolve() }),
      [],
    );

    const requestRecords = useCallback(
      (params: AuditRecordQuery & NebulaPageReq) => service.pageRecords(buildAuditRecordPageReq(params)),
      [service],
    );

    const resultStatusValueEnum = useMemo(
      () => Object.fromEntries(
        AUDIT_RESULT_STATUS_VALUES.map((status) => [status, { text: t(AUDIT_RESULT_STATUS_LABEL_KEY[status]) }]),
      ),
      [t],
    );

    const columns = useMemo<NebulaProColumns<AuditRecordResp>[]>(() => [
      {
        title: t('audit.columns.id'), dataIndex: 'id', width: 220, search: false,
        render: (_, record) => (
          <Typography.Text copyable={{ text: record.id }} ellipsis={{ tooltip: record.id }}>
            {record.id}
          </Typography.Text>
        ),
      },
      { title: t('audit.columns.module'), dataIndex: 'module', width: 140, ellipsis: true },
      {
        title: t('audit.columns.action'), dataIndex: 'action', width: 140, valueType: 'select',
        valueEnum: Object.fromEntries(
          actionDictionary.options.map((option) => [option.value, { text: option.label }]),
        ),
        fieldProps: {
          'aria-label': t('audit.columns.action'),
          allowClear: true,
          loading: actionDictionary.loading,
          optionFilterProp: 'label',
          showSearch: true,
        },
        render: (_, record) => (
          <Typography.Text ellipsis={{ tooltip: record.action }}>
            {actionDictionary.getLabel(record.action)}
          </Typography.Text>
        ),
      },
      { title: t('audit.columns.operatorId'), dataIndex: 'operatorId', width: 160, render: (_, record) => formatText(record.operatorId) },
      { title: t('audit.columns.operatorName'), dataIndex: 'operatorName', width: 140, render: (_, record) => formatText(record.operatorName) },
      { title: t('audit.columns.resourceType'), dataIndex: 'resourceType', width: 140, render: (_, record) => formatText(record.resourceType) },
      { title: t('audit.columns.resourceId'), dataIndex: 'resourceId', width: 180, render: (_, record) => formatText(record.resourceId) },
      { title: t('audit.columns.resourceName'), dataIndex: 'resourceName', width: 160, render: (_, record) => formatText(record.resourceName) },
      { title: t('audit.columns.requestIp'), dataIndex: 'requestIp', width: 150, render: (_, record) => formatText(record.requestIp) },
      {
        title: t('audit.columns.resultStatus'), dataIndex: 'resultStatus', width: 120, valueType: 'select',
        valueEnum: resultStatusValueEnum,
        fieldProps: { 'aria-label': t('audit.columns.resultStatus'), allowClear: true },
        render: (_, record) => (
          <Tag color={AUDIT_RESULT_STATUS_TAG_COLOR[record.resultStatus]}>
            {t(AUDIT_RESULT_STATUS_LABEL_KEY[record.resultStatus])}
          </Tag>
        ),
      },
      {
        title: t('audit.columns.resultMessage'), dataIndex: 'resultMessage', width: 240, search: false,
        render: (_, record) => (
          <Typography.Text className="block max-w-[240px]" ellipsis={{ tooltip: record.resultMessage }}>
            {formatText(record.resultMessage)}
          </Typography.Text>
        ),
      },
      { title: t('audit.columns.createTime'), dataIndex: 'createTime', width: 180, search: false, sorter: true, render: (_, record) => formatDateTime(record.createTime) },
      { title: t('audit.columns.updateTime'), dataIndex: 'updateTime', width: 180, search: false, sorter: true, render: (_, record) => formatDateTime(record.updateTime) },
      {
        title: t('audit.columns.actions'), key: 'actions', fixed: 'right', width: 100, valueType: 'option', search: false,
        render: (_, record) => (
          <Button
            type="link"
            icon={<EyeOutlined />}
            aria-label={`${t('audit.actions.detail')} ${record.id}`}
            onClick={() => onDetail(record)}
          >
            {t('audit.actions.detail')}
          </Button>
        ),
      },
    ], [actionDictionary, onDetail, resultStatusValueEnum, t]);

    return (
      <NebulaProTable<AuditRecordResp, AuditRecordQuery>
        actionRef={actionRef}
        columns={columns}
        request={requestRecords}
        rowKey="id"
        scroll={{ x: 2240 }}
        pagination={{
          defaultPageSize: 20,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => t('audit.pagination.total').replace('{count}', String(total)),
        }}
      />
    );
  },
);
