import { Typography } from 'antd';
import { useCallback, useMemo, useRef } from 'react';
import { NebulaProTable } from '@/components/nebula-pro-table';
import type { NebulaPageReq, NebulaProColumns, NebulaProTableAction } from '@/components/nebula-pro-table';
import {
  CLIENT_TYPE_LABEL_KEY,
  CLIENT_TYPE_VALUES,
} from '@/enums/client-type';
import {
  LOGIN_RECORD_RESULT_LABEL_KEY,
  LOGIN_RECORD_RESULT_VALUES,
  LOGIN_RECORD_TYPE_LABEL_KEY,
  LOGIN_RECORD_TYPE_VALUES,
} from '@/enums/login-record';
import { useNebulaI18n } from '@/hooks/use-nebula-i18n';
import { useNotice } from '@/hooks/use-notice';
import type { LoginLogService } from '@/services/login-log';
import type { ClientType } from '@/types/client-type';
import type { LoginRecordPageReq, LoginRecordResp, LoginRecordResult, LoginRecordType } from '@/types/login-record';
import {
  formatLoginRecordTime,
  renderLoginClientType,
  renderLoginDeviceInfo,
  renderLoginFailReason,
  renderLoginResult,
  renderLoginType,
} from '@/utils/login-record-presentation';

interface DateRangeFormatter {
  readonly format: (template: string) => string;
}

type DateRangeBoundary = DateRangeFormatter | string | undefined;
type DateRangeValue = readonly [DateRangeBoundary, DateRangeBoundary];

export interface LoginLogTableHandle {
  readonly reload: () => Promise<void>;
}

interface LoginLogTableProps {
  readonly service: LoginLogService;
}

export interface LoginLogQuery {
  readonly loginAccount?: string;
  readonly loginType?: LoginRecordType;
  readonly clientType?: ClientType;
  readonly loginResult?: LoginRecordResult;
  readonly loginIp?: string;
  readonly loginTimeRange?: DateRangeValue;
}

function normalizeOptionalText(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
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

export function buildLoginRecordPageReq(params: LoginLogQuery & NebulaPageReq): LoginRecordPageReq {
  const loginAccount = normalizeOptionalText(params.loginAccount);
  const loginIp = normalizeOptionalText(params.loginIp);
  const loginTimeFrom = formatRangeBoundary(params.loginTimeRange?.[0]);
  const loginTimeTo = formatRangeBoundary(params.loginTimeRange?.[1]);

  return {
    pageNum: params.pageNum,
    pageSize: params.pageSize,
    ...(params.orderName ? { orderName: params.orderName } : {}),
    ...(params.orderType ? { orderType: params.orderType } : {}),
    ...(loginAccount ? { loginAccount } : {}),
    ...(params.loginType ? { loginType: params.loginType } : {}),
    ...(params.clientType ? { clientType: params.clientType } : {}),
    ...(params.loginResult ? { loginResult: params.loginResult } : {}),
    ...(loginIp ? { loginIp } : {}),
    ...(loginTimeFrom ? { loginTimeFrom } : {}),
    ...(loginTimeTo ? { loginTimeTo } : {}),
  };
}

export function LoginLogTable({ service }: LoginLogTableProps) {
  const actionRef = useRef<NebulaProTableAction | undefined>(undefined);
  const { t } = useNebulaI18n();
  const notice = useNotice();

  const requestRecords = useCallback(
    (params: LoginLogQuery & NebulaPageReq) => service.pageLoginRecords(buildLoginRecordPageReq(params)),
    [service],
  );

  const clientTypeValueEnum = useMemo(
    () => Object.fromEntries(
      CLIENT_TYPE_VALUES.map((clientType) => [clientType, { text: t(CLIENT_TYPE_LABEL_KEY[clientType]) }]),
    ),
    [t],
  );

  const loginTypeValueEnum = useMemo(
    () => Object.fromEntries(
      LOGIN_RECORD_TYPE_VALUES.map((loginType) => [loginType, { text: t(LOGIN_RECORD_TYPE_LABEL_KEY[loginType]) }]),
    ),
    [t],
  );

  const loginResultValueEnum = useMemo(
    () => Object.fromEntries(
      LOGIN_RECORD_RESULT_VALUES.map((result) => [result, { text: t(LOGIN_RECORD_RESULT_LABEL_KEY[result]) }]),
    ),
    [t],
  );

  const columns = useMemo<NebulaProColumns<LoginRecordResp>[]>(() => [
    {
      title: t('loginLog.columns.id'), dataIndex: 'id', width: 240, search: false,
      render: (_, record) => (
        <Typography.Text copyable={{ text: record.id }} ellipsis={{ tooltip: record.id }}>
          {record.id}
        </Typography.Text>
      ),
    },
    {
      title: t('loginLog.columns.loginAccount'), dataIndex: 'loginAccount', width: 200,
      fieldProps: { 'aria-label': t('loginLog.search.loginAccount'), placeholder: t('loginLog.placeholders.loginAccount') },
    },
    {
      title: t('loginLog.columns.loginType'), dataIndex: 'loginType', width: 140, valueType: 'select',
      valueEnum: loginTypeValueEnum,
      fieldProps: {
        'aria-label': t('loginLog.search.loginType'),
        placeholder: t('loginLog.placeholders.loginType'),
        allowClear: true,
      },
      render: (_, record) => renderLoginType(record.loginType, t),
    },
    {
      title: t('loginLog.columns.clientType'), dataIndex: 'clientType', width: 140, valueType: 'select',
      valueEnum: clientTypeValueEnum,
      fieldProps: {
        'aria-label': t('loginLog.search.clientType'),
        placeholder: t('loginLog.placeholders.clientType'),
        allowClear: true,
      },
      render: (_, record) => renderLoginClientType(record.clientType, record.clientTypeSource, t),
    },
    {
      title: t('loginLog.columns.loginIp'), dataIndex: 'loginIp', width: 160,
      fieldProps: { 'aria-label': t('loginLog.search.loginIp'), placeholder: t('loginLog.placeholders.loginIp') },
      render: (_, record) => formatText(record.loginIp),
    },
    {
      title: t('loginLog.columns.deviceInfo'), dataIndex: 'deviceInfo', width: 160, search: false,
      render: (_, record) => renderLoginDeviceInfo(record, t),
    },
    {
      title: t('loginLog.columns.loginResult'), dataIndex: 'loginResult', width: 120, valueType: 'select',
      valueEnum: loginResultValueEnum,
      fieldProps: {
        'aria-label': t('loginLog.search.loginResult'),
        placeholder: t('loginLog.placeholders.loginResult'),
        allowClear: true,
      },
      render: (_, record) => renderLoginResult(record.loginResult, t),
    },
    {
      title: t('loginLog.columns.failReason'), dataIndex: 'failReason', width: 220, search: false,
      render: (_, record) => renderLoginFailReason(record.failReason, t),
    },
    {
      title: t('loginLog.search.loginTimeRange'), dataIndex: 'loginTimeRange', valueType: 'dateTimeRange',
      hideInTable: true, fieldProps: {
        'aria-label': t('loginLog.search.loginTimeRange'),
        placeholder: [t('loginLog.placeholders.loginTimeRange'), t('loginLog.placeholders.loginTimeRange')],
      },
    },
    {
      title: t('loginLog.columns.loginTime'), dataIndex: 'loginTime', width: 180, search: false, sorter: true,
      render: (_, record) => formatLoginRecordTime(record.loginTime),
    },
  ], [clientTypeValueEnum, loginResultValueEnum, loginTypeValueEnum, t]);

  return (
    <NebulaProTable<LoginRecordResp, LoginLogQuery>
      actionRef={actionRef}
      columns={columns}
      request={requestRecords}
      onRequestError={() => notice.error(t('loginLog.feedback.listLoadFailed'))}
      rowKey="id"
      scroll={{ x: 1560 }}
      pagination={{
        defaultPageSize: 20,
        showSizeChanger: true,
        showQuickJumper: true,
        showTotal: (total) => t('loginLog.pagination.total').replace('{count}', String(total)),
      }}
    />
  );
}

function formatText(value: string | undefined): string {
  const trimmed = value?.trim();

  return trimmed ? trimmed : '-';
}
