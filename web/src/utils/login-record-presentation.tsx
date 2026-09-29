import { Tag, Tooltip, Typography } from 'antd';
import { CLIENT_TYPE_LABEL_KEY, CLIENT_TYPE_SOURCE_LABEL_KEY, CLIENT_TYPE_TAG_COLOR } from '@/enums/client-type';
import { LOGIN_RECORD_TYPE_LABEL_KEY, LOGIN_RECORD_RESULT_LABEL_KEY, LOGIN_RECORD_RESULT_TAG_COLOR } from '@/enums/login-record';
import type { NebulaMessageKey } from '@/i18n/types';
import type { ClientType } from '@/types/client-type';
import type { LoginRecordResp } from '@/types/login-record';

type Translate = (key: NebulaMessageKey) => string;

/** Renders the client type as a colored tag, with the detection source in a tooltip. */
export function renderLoginClientType(clientType: ClientType | undefined, source: string | undefined, t: Translate) {
  if (!clientType) return '-';

  const tag = <Tag color={CLIENT_TYPE_TAG_COLOR[clientType]}>{t(CLIENT_TYPE_LABEL_KEY[clientType])}</Tag>;
  if (!source || !(source in CLIENT_TYPE_SOURCE_LABEL_KEY)) return tag;

  const sourceLabel = t(CLIENT_TYPE_SOURCE_LABEL_KEY[source as keyof typeof CLIENT_TYPE_SOURCE_LABEL_KEY]);

  return <Tooltip title={`${t('common.tooltip.clientTypeSource')}: ${sourceLabel}`}>{tag}</Tooltip>;
}

/** Renders the parsed browser / OS label, with the raw User-Agent in a tooltip. */
export function renderLoginDeviceInfo(record: LoginRecordResp, t: Translate) {
  const label = record.deviceInfo?.trim() || '-';
  if (!record.userAgent) return label;

  return (
    <Tooltip
      title={(
        <div className="max-w-[420px]">
          <div>{t('common.tooltip.userAgent')}</div>
          <div className="break-all">{record.userAgent}</div>
        </div>
      )}
    >
      <span className="cursor-help">{label}</span>
    </Tooltip>
  );
}

export function renderLoginType(loginType: LoginRecordResp['loginType'], t: Translate) {
  return loginType ? t(LOGIN_RECORD_TYPE_LABEL_KEY[loginType]) : '-';
}

export function renderLoginResult(loginResult: LoginRecordResp['loginResult'], t: Translate) {
  return loginResult ? (
    <Tag color={LOGIN_RECORD_RESULT_TAG_COLOR[loginResult]}>{t(LOGIN_RECORD_RESULT_LABEL_KEY[loginResult])}</Tag>
  ) : (
    '-'
  );
}

export function renderLoginFailReason(failReason: string | undefined, t: Translate) {
  return (
    <Typography.Text className="block max-w-[220px]" ellipsis={{ tooltip: failReason }}>
      {failReason?.trim() || t('common.notProvided')}
    </Typography.Text>
  );
}

export function formatLoginRecordTime(value: string | undefined) {
  return value ? value.replace('T', ' ') : '-';
}
