import { PlusOutlined, TeamOutlined, UserDeleteOutlined } from '@ant-design/icons';
import { Button, Popconfirm, Tag } from 'antd';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Access } from '@/components/access';
import { NebulaProTable } from '@/components/nebula-pro-table';
import type { NebulaPageReq, NebulaProColumns, NebulaProTableAction } from '@/components/nebula-pro-table';
import { AUTH_BUTTON_CODES } from '@/constants/auth-button-codes';
import { useNebulaI18n } from '@/hooks/use-nebula-i18n';
import { useNotice } from '@/hooks/use-notice';
import type { AuthManagementService } from '@/api/auth-management';
import type { EnableStatus, UserPageReq, UserResp } from '@/types/auth-management';

export type RoleUserScope =
  | { readonly kind: 'withRole'; readonly key: string; readonly title: string }
  | { readonly kind: 'withoutRole'; readonly key: string; readonly title: string }
  | { readonly kind: 'role'; readonly key: string; readonly roleId: string; readonly title: string };

export interface RoleUsersTableHandle {
  readonly reload: () => Promise<void>;
  readonly clearSelection: () => void;
}

interface RoleUsersTableProps {
  readonly service: AuthManagementService;
  readonly scope: RoleUserScope;
  readonly onBindUsers: () => void;
  readonly onUnbindUsers: (userIds: readonly string[]) => Promise<void>;
  readonly onAssignUsers: (users: readonly UserResp[]) => void;
  readonly bindingLoading?: boolean;
  readonly assignmentLoading?: boolean;
}

interface UserQuery {
  readonly username?: string;
  readonly nickname?: string;
  readonly status?: EnableStatus;
}

function normalizeOptionalText(value: string | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function buildUserPageReq(params: UserQuery & NebulaPageReq, scope: RoleUserScope): UserPageReq {
  const req: UserPageReq = {
    pageNum: params.pageNum,
    pageSize: params.pageSize,
  };
  const username = normalizeOptionalText(params.username);
  const nickname = normalizeOptionalText(params.nickname);

  if (params.orderName) req.orderName = params.orderName;
  if (params.orderType) req.orderType = params.orderType;
  if (username) req.username = username;
  if (nickname) req.nickname = nickname;
  if (params.status !== undefined) req.status = Number(params.status) === 1 ? 1 : 0;

  switch (scope.kind) {
    case 'withRole':
      req.withRole = true;
      break;
    case 'withoutRole':
      req.withoutRole = true;
      break;
    case 'role':
      req.roleId = scope.roleId;
      break;
  }

  return req;
}

export const RoleUsersTable = forwardRef<RoleUsersTableHandle, RoleUsersTableProps>(function RoleUsersTable(
  { service, scope, onBindUsers, onUnbindUsers, onAssignUsers, bindingLoading = false, assignmentLoading = false },
  ref,
) {
  const actionRef = useRef<NebulaProTableAction | undefined>(undefined);
  const { t } = useNebulaI18n();
  const notice = useNotice();
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<UserResp[]>([]);

  useImperativeHandle(ref, () => ({
    reload: () => actionRef.current?.reload() ?? Promise.resolve(),
    clearSelection: () => {
      setSelectedUserIds([]);
      setSelectedUsers([]);
    },
  }), []);

  useEffect(() => {
    setSelectedUserIds([]);
    setSelectedUsers([]);
    void actionRef.current?.reload();
  }, [scope.key]);

  const requestUsers = useCallback(
    (params: UserQuery & NebulaPageReq) => service.pageUsers(buildUserPageReq(params, scope)),
    [scope, service],
  );

  const statusValueEnum = useMemo(
    () => ({
      1: { text: t('auth.userManagement.status.enabled') },
      0: { text: t('auth.userManagement.status.disabled') },
    }),
    [t],
  );

  const columns = useMemo<NebulaProColumns<UserResp>[]>(() => [
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
  ], [statusValueEnum, t]);

  const unbindSelectedUsers = useCallback(async () => {
    await onUnbindUsers(selectedUserIds);
    setSelectedUserIds([]);
    setSelectedUsers([]);
    await actionRef.current?.reload();
  }, [onUnbindUsers, selectedUserIds]);

  const assignSelectedUsers = useCallback(() => {
    onAssignUsers(selectedUsers);
  }, [onAssignUsers, selectedUsers]);

  const selectable = scope.kind !== 'withRole';

  return (
    <NebulaProTable<UserResp, UserQuery>
      actionRef={actionRef}
      columns={columns}
      request={requestUsers}
      onRequestError={() => notice.error(t('auth.roleManagement.feedback.userListLoadFailed'))}
      rowSelection={selectable ? {
        selectedRowKeys: selectedUserIds,
        onChange: (selectedKeys, rows) => {
          setSelectedUserIds(selectedKeys.filter((key): key is string => typeof key === 'string'));
          setSelectedUsers(rows);
        },
      } : undefined}
      tableAlertRender={false}
      size="middle"
      scroll={{ x: 720 }}
      toolBarRender={() => {
        if (scope.kind === 'role') {
          return [
            <Access key="bind" permission={AUTH_BUTTON_CODES.USER_ASSIGN} fallback={null}>
              <Button type="primary" icon={<PlusOutlined />} loading={bindingLoading} onClick={onBindUsers}>
                {t('auth.roleManagement.actions.addUsers')}
              </Button>
            </Access>,
            <Access key="unbind" permission={AUTH_BUTTON_CODES.USER_ASSIGN} fallback={null}>
              <Popconfirm
                title={t('auth.roleManagement.confirm.unbindUsersTitle')}
                okText={t('auth.roleManagement.actions.removeUsers')}
                cancelText={t('auth.roleManagement.actions.cancel')}
                disabled={selectedUserIds.length === 0}
                onConfirm={() => void unbindSelectedUsers()}
              >
                <Button danger icon={<UserDeleteOutlined />} disabled={selectedUserIds.length === 0} loading={assignmentLoading}>
                  {t('auth.roleManagement.actions.removeUsers')}
                </Button>
              </Popconfirm>
            </Access>,
          ];
        }
        if (scope.kind === 'withoutRole') {
          return [
            <Access key="assign" permission={AUTH_BUTTON_CODES.USER_ASSIGN} fallback={null}>
              <Button
                type="primary"
                icon={<TeamOutlined />}
                disabled={selectedUserIds.length === 0}
                loading={assignmentLoading}
                onClick={assignSelectedUsers}
              >
                {t('auth.assignment.actions.setRoles')}
              </Button>
            </Access>,
          ];
        }
        return [];
      }}
    />
  );
});
