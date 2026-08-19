import { ApartmentOutlined, DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined, TeamOutlined } from '@ant-design/icons';
import { Button, Popconfirm, Tag } from 'antd';
import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Access } from '@/components/access';
import { NebulaProTable } from '@/components/nebula-pro-table';
import type { NebulaPageReq, NebulaProColumns, NebulaProTableAction } from '@/components/nebula-pro-table';
import { AUTH_BUTTON_CODES } from '@/constants/auth-button-codes';
import { useNebulaI18n } from '@/hooks/use-nebula-i18n';
import type { AuthManagementService } from '@/api/auth-management';
import type { EnableStatus, OrgOptionResp, RoleOptionResp, UserPageReq, UserResp } from '@/types/auth-management';
import type { BatchAssignmentMode } from '../../components/batch-assignment-modal';
import { createEnableStatusOptions, normalizeOptionalText } from './user-page-shared';

interface UserQuery {
  username?: string;
  nickname?: string;
  status?: EnableStatus;
  roleId?: string;
  orgId?: string;
}

export interface UserTableHandle {
  reload: () => Promise<void>;
  clearSelection: () => void;
}

interface UserTableProps {
  service: AuthManagementService;
  onAddUser: () => void;
  onEditUser: (record: UserResp) => void;
  onResetPassword: (userIds: readonly string[]) => Promise<void>;
  onBatchAssign: (users: readonly UserResp[], mode: Exclude<BatchAssignmentMode, 'both'>) => void;
  resetPasswordLoading?: boolean;
  batchAssignLoading?: boolean;
  roles?: RoleOptionResp[];
  orgs?: OrgOptionResp[];
}

function buildUserPageReq(params: UserQuery & NebulaPageReq): UserPageReq {
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
  if (params.status !== undefined) req.status = Number(params.status) as EnableStatus;
  if (params.roleId) req.roleId = params.roleId;
  if (params.orgId) req.orgId = params.orgId;

  return req;
}

export const UserTable = forwardRef<UserTableHandle, UserTableProps>(function UserTable(
  { service, onAddUser, onEditUser, onResetPassword, onBatchAssign, resetPasswordLoading = false, batchAssignLoading = false, roles = [], orgs = [] },
  ref,
) {
  const actionRef = useRef<NebulaProTableAction | undefined>(undefined);
  const { t } = useNebulaI18n();
  const statusOptions = createEnableStatusOptions(t);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<UserResp[]>([]);

  useImperativeHandle(ref, () => ({
    reload: () => actionRef.current?.reload() ?? Promise.resolve(),
    clearSelection: () => {
      setSelectedUserIds([]);
      setSelectedUsers([]);
    },
  }), []);

  const requestUsers = useCallback(
    (params: UserQuery & NebulaPageReq) => service.pageUsers(buildUserPageReq(params)),
    [service],
  );

  const removeUser = useCallback(
    async (record: UserResp) => {
      await service.deleteUser(record.id);
      await actionRef.current?.reload();
    },
    [service],
  );

  const resetSelectedUsersPassword = useCallback(async () => {
    await onResetPassword(selectedUserIds);
    setSelectedUserIds([]);
    setSelectedUsers([]);
    await actionRef.current?.reload();
  }, [onResetPassword, selectedUserIds]);

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
      valueEnum: Object.fromEntries(statusOptions.map((option) => [option.value, { text: option.label }])) as Record<EnableStatus, { text: string }>,
      render: (_, record) => (
        <Tag color={record.status === 1 ? 'success' : 'default'}>
          {record.status === 1 ? t('auth.userManagement.status.enabled') : t('auth.userManagement.status.disabled')}
        </Tag>
      ),
    },
    {
      title: t('auth.userManagement.columns.role'),
      dataIndex: 'roleId',
      valueType: 'select',
      valueEnum: Object.fromEntries(roles.map((role) => [role.id, { text: role.name }])) as Record<string, { text: string }>,
      fieldProps: {
        showSearch: true,
        optionFilterProp: 'label',
      },
    },
    {
      title: t('auth.userManagement.columns.org'),
      dataIndex: 'orgId',
      valueType: 'select',
      valueEnum: Object.fromEntries(orgs.map((org) => [org.id, { text: org.name }])) as Record<string, { text: string }>,
      fieldProps: {
        showSearch: true,
        optionFilterProp: 'label',
        placeholder: t('auth.select.allOrgs'),
        allowClear: true,
      },
    },
    {
      title: t('auth.userManagement.columns.actions'),
      key: 'actions',
      valueType: 'option',
      search: false,
      render: (_, record) => [
        <Access key="edit" permission={AUTH_BUTTON_CODES.USER_EDIT} fallback={null}>
          <Button type="link" icon={<EditOutlined />} onClick={() => onEditUser(record)}>
            {t('auth.userManagement.actions.edit')}
          </Button>
        </Access>,
        <Access key="delete" permission={AUTH_BUTTON_CODES.USER_DELETE} fallback={null}>
          <Popconfirm
          key="delete"
          title={t('auth.userManagement.confirm.deleteTitle')}
          okText={t('auth.userManagement.actions.delete')}
          cancelText={t('auth.userManagement.actions.cancel')}
          onConfirm={() => void removeUser(record)}
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              {t('auth.userManagement.actions.delete')}
            </Button>
          </Popconfirm>
        </Access>,
      ],
    },
  ], [onEditUser, removeUser, statusOptions, t, roles, orgs]);

  return (
    <NebulaProTable<UserResp, UserQuery>
      actionRef={actionRef}
      columns={columns}
      request={requestUsers}
      search={{
        labelWidth: 'auto',
        defaultCollapsed: false,
      }}
      rowSelection={{
        selectedRowKeys: selectedUserIds,
        onChange: (selectedKeys, selectedRows) => {
          setSelectedUserIds(selectedKeys.filter((key): key is string => typeof key === 'string'));
          setSelectedUsers(selectedRows);
        },
      }}
      tableAlertRender={false}
      toolBarRender={() => [
        <Access key="create" permission={AUTH_BUTTON_CODES.USER_CREATE} fallback={null}>
          <Button type="primary" icon={<PlusOutlined />} onClick={onAddUser}>
            {t('auth.userManagement.actions.create')}
          </Button>
        </Access>,
        <Access key="set-orgs" permission={AUTH_BUTTON_CODES.USER_ASSIGN} fallback={null}>
          <Button
            icon={<ApartmentOutlined />}
            disabled={selectedUserIds.length === 0}
            loading={batchAssignLoading}
            onClick={() => onBatchAssign(selectedUsers, 'orgs')}
          >
            {t('auth.assignment.actions.setOrgs')}
          </Button>
        </Access>,
        <Access key="set-roles" permission={AUTH_BUTTON_CODES.USER_ASSIGN} fallback={null}>
          <Button
            icon={<TeamOutlined />}
            disabled={selectedUserIds.length === 0}
            loading={batchAssignLoading}
            onClick={() => onBatchAssign(selectedUsers, 'roles')}
          >
            {t('auth.assignment.actions.setRoles')}
          </Button>
        </Access>,
        <Access key="reset-password" permission={AUTH_BUTTON_CODES.USER_RESET_PASSWORD} fallback={null}>
          <Popconfirm
            title={t('auth.userManagement.confirm.resetPasswordTitle')}
            okText={t('auth.userManagement.actions.resetPassword')}
            cancelText={t('auth.userManagement.actions.cancel')}
            onConfirm={() => void resetSelectedUsersPassword()}
            disabled={selectedUserIds.length === 0}
          >
            <Button icon={<ReloadOutlined />} disabled={selectedUserIds.length === 0} loading={resetPasswordLoading}>
              {t('auth.userManagement.actions.resetPassword')}
            </Button>
          </Popconfirm>
        </Access>,
      ]}
    />
  );
});
