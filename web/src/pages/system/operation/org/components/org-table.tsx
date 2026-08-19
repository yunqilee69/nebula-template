import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { App, Button, Popconfirm, Tag } from 'antd';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { Access } from '@/components/access';
import { NebulaProTable } from '@/components/nebula-pro-table';
import type { NebulaPageReq, NebulaProColumns, NebulaProTableAction } from '@/components/nebula-pro-table';
import { AUTH_BUTTON_CODES } from '@/constants/auth-button-codes';
import { useNebulaI18n } from '@/hooks/use-nebula-i18n';
import type { AuthManagementService } from '@/api/auth-management';
import type { EnableStatus, OrgPageReq, OrgResp, OrgType } from '@/types/auth-management';

const TABLE_OPTIONS = { density: false, fullScreen: true, reload: true, setting: true };

export interface OrgTableHandle {
  reload: () => Promise<void>;
}

interface OrgTableProps {
  service: AuthManagementService;
  parentId?: string;
  onCreate: () => void;
  onEdit: (record: OrgResp) => void;
  showCreateButton?: boolean;
}

interface OrgQuery {
  name?: string;
  code?: string;
  status?: EnableStatus;
}

function buildOrgPageReq(params: OrgQuery & NebulaPageReq, parentId?: string): OrgPageReq {
  const req: OrgPageReq = {
    pageNum: params.pageNum,
    pageSize: params.pageSize,
  };
  if (parentId !== undefined) req.parentId = parentId;
  if (params.orderName) req.orderName = params.orderName;
  if (params.orderType) req.orderType = params.orderType;
  const name = params.name?.trim() || undefined;
  const code = params.code?.trim() || undefined;
  if (name) req.name = name;
  if (code) req.code = code;
  if (params.status !== undefined) req.status = Number(params.status) as EnableStatus;
  return req;
}

export const OrgTable = forwardRef<OrgTableHandle, OrgTableProps>(function OrgTable(
  { service, parentId, onCreate, onEdit, showCreateButton = true },
  ref,
) {
  const actionRef = useRef<NebulaProTableAction | undefined>(undefined);
  const didMountRef = useRef(false);
  const { message } = App.useApp();
  const { t } = useNebulaI18n();
  const orgTypeLabels: Record<OrgType, string> = {
    COMPANY: t('auth.orgManagement.types.company'),
    DEPARTMENT: t('auth.orgManagement.types.department'),
    TEAM: t('auth.orgManagement.types.team'),
  };

  useImperativeHandle(ref, () => ({
    reload: () => actionRef.current?.reload() ?? Promise.resolve(),
  }));

  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    void actionRef.current?.reload();
  }, [parentId]);

  const requestOrgs = useCallback(
    (params: OrgQuery & NebulaPageReq) => service.pageOrgs(buildOrgPageReq(params, parentId)),
    [service, parentId],
  );

  const removeOrg = useCallback(
    async (record: OrgResp) => {
      try {
        await service.deleteOrg(record.id);
        await actionRef.current?.reload();
      } catch (error: unknown) {
        message.error(t('auth.orgManagement.feedback.deleteFailed'));
        const msg = error instanceof Error ? error.message : String(error);
        console.error('Failed to delete org', msg);
      }
    },
    [service, message, t],
  );

  const statusValueEnum = useMemo(
    () => ({
      1: { text: t('auth.orgManagement.status.enabled') },
      0: { text: t('auth.orgManagement.status.disabled') },
    }),
    [t],
  );

  const columns = useMemo<NebulaProColumns<OrgResp>[]>(() => [
    {
      title: t('auth.orgManagement.columns.name'),
      dataIndex: 'name',
      sorter: true,
    },
    {
      title: t('auth.orgManagement.columns.code'),
      dataIndex: 'code',
      sorter: true,
    },
    {
      title: t('auth.orgManagement.columns.type'),
      dataIndex: 'type',
      search: false,
      render: (_, record) => orgTypeLabels[record.type],
    },
    {
      title: t('auth.orgManagement.columns.status'),
      dataIndex: 'status',
      valueType: 'select',
      valueEnum: statusValueEnum,
      fieldProps: { 'aria-label': t('auth.orgManagement.columns.status') },
      render: (_, record) => (
        <Tag color={record.status === 1 ? 'success' : 'default'}>
          {record.status === 1 ? t('auth.orgManagement.status.enabled') : t('auth.orgManagement.status.disabled')}
        </Tag>
      ),
    },
    {
      title: t('auth.orgManagement.columns.actions'),
      key: 'action',
      valueType: 'option',
      search: false,
      render: (_, record) => [
        <Access key="edit" permission={AUTH_BUTTON_CODES.ORG_EDIT} fallback={null}>
          <Button type="link" icon={<EditOutlined />} onClick={() => onEdit(record)}>
            {t('auth.orgManagement.actions.edit')}
          </Button>
        </Access>,
        <Access key="delete" permission={AUTH_BUTTON_CODES.ORG_DELETE} fallback={null}>
          <Popconfirm
            title={`${t('auth.orgManagement.actions.delete')}?`}
            okText={t('auth.orgManagement.actions.delete')}
            cancelText={t('auth.orgManagement.actions.cancel')}
            onConfirm={() => void removeOrg(record)}
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              {t('auth.orgManagement.actions.delete')}
            </Button>
          </Popconfirm>
        </Access>,
      ],
    },
  ], [onEdit, orgTypeLabels, removeOrg, statusValueEnum, t]);

  return (
    <NebulaProTable<OrgResp, OrgQuery>
      actionRef={actionRef}
      columns={columns}
      options={TABLE_OPTIONS}
      request={requestOrgs}
      toolBarRender={() => (showCreateButton ? [
        <Access key="create" permission={AUTH_BUTTON_CODES.ORG_CREATE} fallback={null}>
          <Button type="primary" icon={<PlusOutlined />} onClick={onCreate}>
            {t('auth.orgManagement.actions.create')}
          </Button>
        </Access>,
      ] : [])}
    />
  );
});
