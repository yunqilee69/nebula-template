import { StopOutlined } from '@ant-design/icons';
import { Button, Popconfirm, Space, Tag, Tooltip, Typography } from 'antd';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Access } from '@/components/access';
import { NebulaProTable } from '@/components/nebula-pro-table';
import type { NebulaPageReq, NebulaProColumns, NebulaProTableAction } from '@/components/nebula-pro-table';
import { AUTH_BUTTON_CODES } from '@/constants/auth-button-codes';
import {
  CLIENT_TYPE_LABEL_KEY,
  CLIENT_TYPE_SOURCE_LABEL_KEY,
  CLIENT_TYPE_TAG_COLOR,
  CLIENT_TYPE_VALUES,
  DEVICE_TYPE_LABEL_KEY,
} from '@/enums/client-type';
import { LOGIN_RECORD_TYPE_LABEL_KEY, LOGIN_RECORD_TYPE_VALUES } from '@/enums/login-record';
import {
  DEFAULT_ONLINE_USER_TOKEN_TYPE,
  ONLINE_USER_TOKEN_TYPE_LABEL_KEY,
  ONLINE_USER_TOKEN_TYPE_VALUES,
} from '@/enums/online-user-token-type';
import { useNebulaI18n } from '@/hooks/use-nebula-i18n';
import { useNotice } from '@/hooks/use-notice';
import type { NebulaMessageKey } from '@/i18n/types';
import { onlineUserService, type OnlineUserService } from '@/services/online-user';
import type { ClientType } from '@/types/client-type';
import type { OnlineUserPageReq, OnlineUserResp, OnlineUserTokenType } from '@/types/online-user';

type Translate = (key: NebulaMessageKey) => string;

export interface OnlineUserPageProps {
  readonly service?: OnlineUserService;
}

type OnlineUserSearchValues = {
  readonly userId?: string;
  readonly username?: string;
  readonly nickname?: string;
  readonly email?: string;
  readonly phone?: string;
  readonly clientType?: ClientType;
  readonly loginIp?: string;
  readonly tokenType?: OnlineUserTokenType;
};

function formatSeconds(value: number | undefined): string {
  return value === undefined ? '-' : `${value}s`;
}

function formatDateTime(value: string | undefined): string {
  return value ? value.replace('T', ' ') : '-';
}

function trimOptionalText(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function buildQuery(values: OnlineUserSearchValues & NebulaPageReq): OnlineUserPageReq {
  const userId = trimOptionalText(values.userId);
  const username = trimOptionalText(values.username);
  const nickname = trimOptionalText(values.nickname);
  const email = trimOptionalText(values.email);
  const phone = trimOptionalText(values.phone);
  const loginIp = trimOptionalText(values.loginIp);

  return {
    pageNum: values.pageNum,
    pageSize: values.pageSize,
    ...(values.orderName ? { orderName: values.orderName } : {}),
    ...(values.orderType ? { orderType: values.orderType } : {}),
    ...(userId ? { userId } : {}),
    ...(username ? { username } : {}),
    ...(nickname ? { nickname } : {}),
    ...(email ? { email } : {}),
    ...(phone ? { phone } : {}),
    ...(values.clientType ? { clientType: values.clientType } : {}),
    ...(loginIp ? { loginIp } : {}),
    ...(values.tokenType ? { tokenType: values.tokenType } : {}),
  };
}

export function OnlineUserPage({ service: serviceProp }: OnlineUserPageProps) {
  const service = serviceProp ?? onlineUserService;
  const notice = useNotice();
  const { t } = useNebulaI18n();
  const actionRef = useRef<NebulaProTableAction | undefined>(undefined);
  const [kickingKey, setKickingKey] = useState<string>();

  const requestOnlineUsers = useCallback(
    (params: OnlineUserSearchValues & NebulaPageReq) => service.pageOnlineUsers(buildQuery(params)),
    [service],
  );

  const kickOutUser = useCallback(async (record: OnlineUserResp) => {
    setKickingKey(record.cacheKey);
    try {
      await service.kickOutOnlineUser(record.cacheKey);
      notice.success(t('onlineUser.feedback.kickOutSuccess'));
      await actionRef.current?.reload();
    } catch (error) {
      if (error instanceof Error) {
        notice.error(t('onlineUser.feedback.kickOutFailed'));
        return;
      }
      throw error;
    } finally {
      setKickingKey(undefined);
    }
  }, [notice, service, t]);

  const kickOutAllSessions = useCallback(async (record: OnlineUserResp) => {
    setKickingKey(record.userId);
    try {
      await service.kickOutOnlineUsers(record.userId);
      notice.success(t('onlineUser.feedback.kickOutAllSuccess'));
      await actionRef.current?.reload();
    } catch (error) {
      if (error instanceof Error) {
        notice.error(t('onlineUser.feedback.kickOutAllFailed'));
        return;
      }
      throw error;
    } finally {
      setKickingKey(undefined);
    }
  }, [notice, service, t]);

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

  const tokenTypeValueEnum = useMemo(
    () => Object.fromEntries(
      ONLINE_USER_TOKEN_TYPE_VALUES.map((tokenType) => [tokenType, { text: t(ONLINE_USER_TOKEN_TYPE_LABEL_KEY[tokenType]) }]),
    ),
    [t],
  );

  const renderCodeTags = useCallback((values: readonly string[] | undefined): React.ReactNode => {
    if (!values?.length) return '-';

    return (
      <Space size={[0, 4]} wrap>
        {values.map((value) => <Tag key={value}>{value}</Tag>)}
      </Space>
    );
  }, []);

  const columns = useMemo<NebulaProColumns<OnlineUserResp>[]>(() => [
    { title: t('onlineUser.columns.userId'), dataIndex: 'userId', hideInTable: true },
    { title: t('onlineUser.columns.username'), dataIndex: 'username', width: 140 },
    {
      title: t('onlineUser.columns.tokenType'), dataIndex: 'tokenType', hideInTable: true, valueType: 'select',
      valueEnum: tokenTypeValueEnum,
      initialValue: DEFAULT_ONLINE_USER_TOKEN_TYPE,
      fieldProps: { 'aria-label': t('onlineUser.columns.tokenType'), allowClear: false },
    },
    {
      title: t('onlineUser.columns.clientType'), dataIndex: 'clientType', width: 130, valueType: 'select',
      valueEnum: clientTypeValueEnum,
      fieldProps: { 'aria-label': t('onlineUser.columns.clientType'), allowClear: true },
      render: (_, record) => renderClientTypeTag(record, t),
    },
    { title: t('onlineUser.columns.loginIp'), dataIndex: 'loginIp', width: 150, render: (_, record) => formatText(record.loginIp) },
    {
      title: t('onlineUser.columns.loginType'), dataIndex: 'loginType', width: 130, search: false,
      render: (_, record) => (
        record.loginType ? t(LOGIN_RECORD_TYPE_LABEL_KEY[record.loginType]) : t('common.notProvided')
      ),
    },
    { title: t('onlineUser.columns.browser'), dataIndex: 'browser', width: 120, search: false, render: (_, record) => formatText(record.browser) },
    { title: t('onlineUser.columns.os'), dataIndex: 'os', width: 120, search: false, render: (_, record) => formatText(record.os) },
    {
      title: t('onlineUser.columns.deviceType'), dataIndex: 'deviceType', width: 120, search: false,
      render: (_, record) => renderDeviceType(record, t),
    },
    { title: t('onlineUser.columns.nickname'), dataIndex: 'nickname', width: 140, render: (_, record) => formatText(record.nickname) },
    { title: t('onlineUser.columns.phone'), dataIndex: 'phone', width: 150, render: (_, record) => formatText(record.phone) },
    { title: t('onlineUser.columns.email'), dataIndex: 'email', width: 200, render: (_, record) => formatText(record.email) },
    { title: t('onlineUser.columns.orgCodeList'), dataIndex: 'orgCodeList', width: 180, search: false, render: (_, record) => renderCodeTags(record.orgCodeList) },
    { title: t('onlineUser.columns.roleCodeList'), dataIndex: 'roleCodeList', width: 180, search: false, render: (_, record) => renderCodeTags(record.roleCodeList) },
    { title: t('onlineUser.columns.loginTime'), dataIndex: 'loginTime', width: 180, search: false, sorter: true, render: (_, record) => formatDateTime(record.loginTime) },
    { title: t('onlineUser.columns.lastActiveTime'), dataIndex: 'lastActiveTime', width: 180, search: false, sorter: true, render: (_, record) => formatDateTime(record.lastActiveTime) },
    { title: t('onlineUser.columns.expireTime'), dataIndex: 'expireTime', width: 180, search: false, render: (_, record) => formatDateTime(record.expireTime) },
    { title: t('onlineUser.columns.remainingTtlSeconds'), dataIndex: 'remainingTtlSeconds', width: 120, search: false, render: (_, record) => formatSeconds(record.remainingTtlSeconds) },
    {
      title: t('onlineUser.columns.actions'),
      key: 'actions',
      fixed: 'right',
      width: 220,
      valueType: 'option',
      search: false,
      render: (_, record) => (
        <Space size={4}>
          <Access permission={AUTH_BUTTON_CODES.ONLINE_USER_KICK_OUT} fallback={null}>
            <Popconfirm
              title={t('onlineUser.confirm.kickOutTitle')}
              okText={t('onlineUser.actions.kickOut')}
              cancelText={t('common.actions.cancel')}
              onConfirm={() => void kickOutUser(record)}
            >
              <Button
                danger
                type="link"
                icon={<StopOutlined />}
                loading={kickingKey === record.cacheKey}
                aria-label={`${t('onlineUser.actions.kickOut')} ${record.username}`}
              >
                {t('onlineUser.actions.kickOut')}
              </Button>
            </Popconfirm>
          </Access>
          <Access permission={AUTH_BUTTON_CODES.ONLINE_USER_KICK_OUT_ALL} fallback={null}>
            <Popconfirm
              title={t('onlineUser.confirm.kickOutAllTitle')}
              description={t('onlineUser.confirm.kickOutAllDescription')}
              okText={t('onlineUser.actions.kickOutAll')}
              cancelText={t('common.actions.cancel')}
              onConfirm={() => void kickOutAllSessions(record)}
            >
              <Button
                danger
                type="link"
                icon={<StopOutlined />}
                loading={kickingKey === record.userId}
                aria-label={`${t('onlineUser.actions.kickOutAll')} ${record.username}`}
              >
                {t('onlineUser.actions.kickOutAll')}
              </Button>
            </Popconfirm>
          </Access>
        </Space>
      ),
    },
  ], [clientTypeValueEnum, kickOutAllSessions, kickOutUser, kickingKey, loginTypeValueEnum, renderCodeTags, t, tokenTypeValueEnum]);

  return (
    <div className="h-full flex flex-col gap-4">
      <NebulaProTable<OnlineUserResp, OnlineUserSearchValues>
        actionRef={actionRef}
        rowKey="cacheKey"
        columns={columns}
        request={requestOnlineUsers}
        search={{
          labelWidth: 'auto',
          defaultCollapsed: false,
        }}
        pagination={{
          showSizeChanger: true,
          showTotal: (total) => t('onlineUser.pagination.total').replace('{count}', String(total)),
        }}
        scroll={{ x: 2600 }}
      />
    </div>
  );
}

function formatText(value: string | undefined): string {
  const trimmed = value?.trim();

  return trimmed ? trimmed : '-';
}

function renderClientTypeTag(record: OnlineUserResp, t: Translate) {
  if (!record.clientType) return '-';

  const tag = <Tag color={CLIENT_TYPE_TAG_COLOR[record.clientType]}>{t(CLIENT_TYPE_LABEL_KEY[record.clientType])}</Tag>;
  if (!record.clientTypeSource) return tag;

  return (
    <Tooltip title={`${t('onlineUser.tooltip.clientTypeSource')}: ${t(CLIENT_TYPE_SOURCE_LABEL_KEY[record.clientTypeSource])}`}>
      {tag}
    </Tooltip>
  );
}

function renderDeviceType(record: OnlineUserResp, t: Translate) {
  const label = record.deviceType ? t(DEVICE_TYPE_LABEL_KEY[record.deviceType]) : '-';
  if (!record.userAgent) return label;

  return (
    <Tooltip
      title={(
        <div className="max-w-[420px]">
          <div>{t('onlineUser.tooltip.userAgent')}</div>
          <div className="break-all">{record.userAgent}</div>
        </div>
      )}
    >
      <span className="cursor-help">{label}</span>
    </Tooltip>
  );
}

export default OnlineUserPage;
