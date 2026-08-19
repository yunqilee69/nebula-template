import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Popconfirm, Tag } from 'antd';
import { useMemo, type RefObject } from 'react';
import { Access } from '@/components/access';
import { NebulaProTable } from '@/components/nebula-pro-table';
import type { NebulaProColumns, NebulaProTableAction, NebulaProTableRequest } from '@/components/nebula-pro-table';
import { AUTH_BUTTON_CODES } from '@/constants/auth-button-codes';
import { useNebulaI18n } from '@/hooks/use-nebula-i18n';
import { useNotice } from '@/hooks/use-notice';
import type { RoleResp, RoleStatus } from '@/types/role';

export interface RoleSearchValues {
  readonly name?: string;
  readonly code?: string;
  readonly status?: RoleStatus | '0' | '1';
}

export interface RoleTableProps {
  readonly actionRef: RefObject<NebulaProTableAction | undefined>;
  readonly request: NebulaProTableRequest<RoleResp, RoleSearchValues>;
  readonly defaultPageSize: number;
  readonly actions: RoleTableActions;
}

export interface RoleTableActions {
  readonly onCreate: () => void;
  readonly onEdit: (record: RoleResp) => void | Promise<void>;
  readonly onDelete: (record: RoleResp) => void | Promise<void>;
  readonly onShowUnassigned: () => void;
}

function formatDateTime(value: string | undefined) {
  if (!value) return '-';
  return value.replace('T', ' ');
}

export function RoleTable({ actionRef, request, defaultPageSize, actions }: RoleTableProps) {
  const { t } = useNebulaI18n();
  const notice = useNotice();
  const roleStatusOptions = useMemo<ReadonlyArray<{ readonly label: string; readonly value: RoleStatus }>>(
    () => [
      { label: t('auth.roleManagement.status.enabled'), value: 1 },
      { label: t('auth.roleManagement.status.disabled'), value: 0 },
    ],
    [t],
  );
  const statusValueEnum = useMemo(
    () => Object.fromEntries(roleStatusOptions.map((option) => [option.value, { text: option.label }])),
    [roleStatusOptions],
  );
  const columns = useMemo<NebulaProColumns<RoleResp>[]>(() => [
    {
      title: t('auth.roleManagement.columns.name'),
      dataIndex: 'name',
      fixed: 'left',
      width: 180,
      sorter: true,
    },
    {
      title: t('auth.roleManagement.columns.code'),
      dataIndex: 'code',
      width: 180,
      sorter: true,
    },
    {
      title: t('auth.roleManagement.columns.status'),
      dataIndex: 'status',
      width: 100,
      valueType: 'select',
      valueEnum: statusValueEnum,
      fieldProps: { 'aria-label': t('auth.roleManagement.fields.status') },
      render: (_, record) => (
        <Tag color={record.status === 1 ? 'success' : 'default'}>
          {record.status === 1 ? t('auth.roleManagement.status.enabled') : t('auth.roleManagement.status.disabled')}
        </Tag>
      ),
    },
    {
      title: t('auth.roleManagement.columns.createTime'),
      dataIndex: 'createTime',
      width: 180,
      search: false,
      sorter: true,
      render: (_, record) => formatDateTime(record.createTime),
    },
    {
      title: t('auth.roleManagement.columns.updateTime'),
      dataIndex: 'updateTime',
      width: 180,
      search: false,
      sorter: true,
      render: (_, record) => formatDateTime(record.updateTime),
    },
    {
      title: t('auth.roleManagement.columns.actions'),
      key: 'actions',
      fixed: 'right',
      width: 160,
      valueType: 'option',
      search: false,
      render: (_, record) => [
        <Access key="edit" permission={AUTH_BUTTON_CODES.ROLE_EDIT} fallback={null}>
          <Button type="link" icon={<EditOutlined />} onClick={() => void actions.onEdit(record)}>
            {t('auth.roleManagement.actions.edit')}
          </Button>
        </Access>,
        <Access key="delete" permission={AUTH_BUTTON_CODES.ROLE_DELETE} fallback={null}>
          <Popconfirm
            title={t('auth.roleManagement.confirm.deleteTitle')}
            okText={t('auth.roleManagement.actions.delete')}
            cancelText={t('auth.roleManagement.actions.cancel')}
            onConfirm={() => void actions.onDelete(record)}
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              {t('auth.roleManagement.actions.delete')}
            </Button>
          </Popconfirm>
        </Access>,
      ],
    },
  ], [actions, statusValueEnum, t]);

  return (
    <NebulaProTable<RoleResp, RoleSearchValues>
      actionRef={actionRef}
      columns={columns}
      pagination={{ defaultPageSize }}
      request={request}
      onRequestError={() => notice.error(t('auth.roleManagement.feedback.listLoadFailed'))}
      size="middle"
      scroll={{ x: 960 }}
      toolBarRender={() => [
        <Button key="unassigned" onClick={actions.onShowUnassigned}>{t('auth.assignment.tabs.unassignedRoleUsers')}</Button>,
        <Access key="create" permission={AUTH_BUTTON_CODES.ROLE_CREATE} fallback={null}>
          <Button type="primary" icon={<PlusOutlined />} onClick={actions.onCreate}>{t('auth.roleManagement.actions.create')}</Button>
        </Access>,
      ]}
    />
  );
}
