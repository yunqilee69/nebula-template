import { Button, Tag } from 'antd';
import { useCallback, useMemo, useRef } from 'react';
import { Access } from '@/components/access';
import { NebulaProTable } from '@/components/nebula-pro-table';
import type { NebulaPageReq, NebulaProColumns, NebulaProTableAction } from '@/components/nebula-pro-table';
import { AUTH_BUTTON_CODES } from '@/constants/auth-button-codes';
import { useNebulaI18n } from '@/hooks/use-nebula-i18n';
import { useNotice } from '@/hooks/use-notice';
import type { AuthManagementService } from '@/api/auth-management';
import type { EnableStatus, UserPageReq, UserResp } from '@/types/auth-management';

const TABLE_OPTIONS = { density: false, fullScreen: true, reload: true, setting: true };

type UserAssignmentFilter = 'withoutRole' | 'withoutOrg' | { readonly orgId?: string };

interface UnassignedUsersTableProps {
  readonly service: AuthManagementService;
  readonly filter: UserAssignmentFilter;
  readonly onAssign?: (userId: string) => void;
  readonly onAddUsers?: () => void;
}

interface UserQuery {
  readonly username?: string;
  readonly nickname?: string;
  readonly status?: EnableStatus;
}

function buildUserPageReq(params: UserQuery & NebulaPageReq, filter: UserAssignmentFilter): UserPageReq {
  const req: UserPageReq = {
    pageNum: params.pageNum,
    pageSize: params.pageSize,
  };
  if (filter === 'withoutRole') req.withoutRole = true;
  if (filter === 'withoutOrg') req.withoutOrg = true;
  if (typeof filter === 'object' && filter.orgId) req.orgId = filter.orgId;
  const username = params.username?.trim();
  const nickname = params.nickname?.trim();

  if (params.orderName) req.orderName = params.orderName;
  if (params.orderType) req.orderType = params.orderType;
  if (username) req.username = username;
  if (nickname) req.nickname = nickname;
  if (params.status !== undefined) req.status = Number(params.status) as EnableStatus;

  return req;
}

export function UnassignedUsersTable({ service, filter, onAssign, onAddUsers }: UnassignedUsersTableProps) {
  const actionRef = useRef<NebulaProTableAction | undefined>(undefined);
  const { t } = useNebulaI18n();
  const notice = useNotice();

  const statusValueEnum = useMemo(
    () => ({
      1: { text: t('auth.userManagement.status.enabled') },
      0: { text: t('auth.userManagement.status.disabled') },
    }),
    [t],
  );

  const requestUsers = useCallback(
    (params: UserQuery & NebulaPageReq) => service.pageUsers(buildUserPageReq(params, filter)),
    [filter, service],
  );

  const columns = useMemo<NebulaProColumns<UserResp>[]>(() => {
    const baseColumns: NebulaProColumns<UserResp>[] = [
    {
      title: t('auth.userManagement.columns.username'),
      dataIndex: 'username',
      sorter: true,
    },
    {
      title: t('auth.userManagement.columns.nickname'),
      dataIndex: 'nickname',
    },
    {
      title: t('auth.userManagement.columns.status'),
      dataIndex: 'status',
      valueType: 'select',
      valueEnum: statusValueEnum,
      render: (_, record) => (
        <Tag color={record.status === 1 ? 'success' : 'default'}>
          {record.status === 1 ? t('auth.userManagement.status.enabled') : t('auth.userManagement.status.disabled')}
        </Tag>
      ),
    },
  ];
    if (!onAssign) return baseColumns;
    return [
      ...baseColumns,
      {
        title: t('auth.userManagement.columns.actions'),
        key: 'actions',
        valueType: 'option',
        search: false,
        render: (_, record) => [
          <Access key="assign" permission={AUTH_BUTTON_CODES.USER_ASSIGN} fallback={null}>
            <Button type="link" onClick={() => onAssign(record.id)}>
              {t('auth.assignment.actions.assign')}
            </Button>
          </Access>,
        ],
      },
    ];
  }, [onAssign, statusValueEnum, t]);

  return (
    <NebulaProTable<UserResp, UserQuery>
      actionRef={actionRef}
      columns={columns}
      request={requestUsers}
      onRequestError={() => notice.error(t('auth.userManagement.feedback.optionsLoadFailed'))}
      options={TABLE_OPTIONS}
      size="middle"
      scroll={{ x: 720 }}
      toolBarRender={() => (onAddUsers ? [
        <Access key="add-users" permission={AUTH_BUTTON_CODES.USER_ASSIGN} fallback={null}>
          <Button type="primary" aria-label={t('auth.orgManagement.actions.addUsers')} onClick={onAddUsers}>
            {t('auth.orgManagement.actions.addUsers')}
          </Button>
        </Access>,
      ] : [])}
    />
  );
}
