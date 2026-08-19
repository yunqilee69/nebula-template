import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Popconfirm, Tag } from 'antd';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { Access } from '@/components/access';
import { NebulaProTable } from '@/components/nebula-pro-table';
import type { NebulaPageReq, NebulaProColumns, NebulaProTableAction } from '@/components/nebula-pro-table';
import { AUTH_BUTTON_CODES } from '@/constants/auth-button-codes';
import { useNebulaI18n } from '@/hooks/use-nebula-i18n';
import { useNotice } from '@/hooks/use-notice';
import type { MenuService } from '@/api/menu';
import type { ButtonResp, ButtonStatus } from '@/types/menu';

export interface ButtonTableHandle {
  reload: () => Promise<void>;
}

interface ButtonTableProps {
  service: MenuService;
  menuId?: string;
  onCreate: () => void;
  onEdit: (record: ButtonResp) => void;
}

interface ButtonQuery {
  name?: string;
  code?: string;
  status?: ButtonStatus;
}

function normalizeOptionalText(value: string | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function formatDateTime(value: string | undefined) {
  if (!value) return '-';
  return value.replace('T', ' ');
}

export const ButtonTable = forwardRef<ButtonTableHandle, ButtonTableProps>(function ButtonTable(
  { service, menuId, onCreate, onEdit },
  ref,
) {
  const actionRef = useRef<NebulaProTableAction | undefined>(undefined);
  const didMountRef = useRef(false);
  const { t } = useNebulaI18n();
  const notice = useNotice();

  useImperativeHandle(ref, () => ({
    reload: () => actionRef.current?.reload() ?? Promise.resolve(),
  }));

  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    void actionRef.current?.reload();
  }, [menuId]);

  const requestButtons = useCallback(
    async (params: ButtonQuery & NebulaPageReq) => {
      if (!menuId) {
        return { data: [], total: 0 };
      }

      const buttonName = normalizeOptionalText(params.name);
      const buttonCode = normalizeOptionalText(params.code);

      const page = await service.pageButtons({
        pageNum: params.pageNum,
        pageSize: params.pageSize,
        menuId,
        ...(params.orderName ? { orderName: params.orderName } : {}),
        ...(params.orderType ? { orderType: params.orderType } : {}),
        ...(buttonName ? { name: buttonName } : {}),
        ...(buttonCode ? { code: buttonCode } : {}),
        ...(params.status !== undefined ? { status: Number(params.status) as ButtonStatus } : {}),
      });

      return { data: page.data, total: page.total };
    },
    [menuId, service],
  );

  const removeButton = useCallback(
    async (record: ButtonResp) => {
      try {
        await service.removeButton(record.id);
        notice.success(t('auth.buttonManagement.feedback.deleteSuccess'));
        await actionRef.current?.reload();
      } catch (error: unknown) {
        notice.error(t('auth.buttonManagement.feedback.deleteFailed'));
        const msg = error instanceof Error ? error.message : String(error);
        console.error('Failed to delete button', msg);
      }
    },
    [service, notice, t],
  );

  const statusValueEnum = useMemo(
    () => ({
      1: { text: t('auth.buttonManagement.status.enabled') },
      0: { text: t('auth.buttonManagement.status.disabled') },
    }),
    [t],
  );

  const columns = useMemo<NebulaProColumns<ButtonResp>[]>(() => [
    {
      title: t('auth.buttonManagement.columns.name'),
      dataIndex: 'name',
      width: 180,
      sorter: true,
    },
    {
      title: t('auth.buttonManagement.columns.code'),
      dataIndex: 'code',
      width: 180,
      sorter: true,
    },
    {
      title: t('auth.buttonManagement.columns.status'),
      dataIndex: 'status',
      width: 100,
      valueType: 'select',
      valueEnum: statusValueEnum,
      fieldProps: { 'aria-label': t('auth.buttonManagement.columns.status') },
      render: (_, record) => (
        <Tag color={record.status === 1 ? 'success' : 'default'}>
          {record.status === 1
            ? t('auth.buttonManagement.status.enabled')
            : t('auth.buttonManagement.status.disabled')}
        </Tag>
      ),
    },
    {
      title: t('auth.buttonManagement.columns.createTime'),
      dataIndex: 'createTime',
      width: 180,
      search: false,
      sorter: true,
      render: (_, record) => formatDateTime(record.createTime),
    },
    {
      title: t('auth.buttonManagement.columns.updateTime'),
      dataIndex: 'updateTime',
      width: 180,
      search: false,
      sorter: true,
      render: (_, record) => formatDateTime(record.updateTime),
    },
    {
      title: t('auth.buttonManagement.columns.actions'),
      key: 'actions',
      fixed: 'right',
      width: 160,
      valueType: 'option',
      search: false,
      render: (_, record) => [
        <Access key="edit" permission={AUTH_BUTTON_CODES.BUTTON_EDIT} fallback={null}>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => onEdit(record)}
          >
            {t('auth.buttonManagement.actions.edit')}
          </Button>
        </Access>,
        <Access key="delete" permission={AUTH_BUTTON_CODES.BUTTON_DELETE} fallback={null}>
          <Popconfirm
            title={t('auth.buttonManagement.confirm.deleteTitle')}
            okText={t('auth.buttonManagement.actions.delete')}
            cancelText={t('auth.buttonManagement.actions.cancel')}
            onConfirm={() => void removeButton(record)}
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              {t('auth.buttonManagement.actions.delete')}
            </Button>
          </Popconfirm>
        </Access>,
      ],
    },
  ], [onEdit, removeButton, statusValueEnum, t]);

  return (
    <NebulaProTable<ButtonResp, ButtonQuery>
      actionRef={actionRef}
      columns={columns}
      request={requestButtons}
      onRequestError={() =>
        notice.error(t('auth.buttonManagement.feedback.listLoadFailed'))
      }
      size="middle"
      scroll={{ x: 800 }}
      toolBarRender={() => [
        <Access key="create" permission={AUTH_BUTTON_CODES.BUTTON_CREATE} fallback={null}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            disabled={!menuId}
            onClick={onCreate}
          >
            {t('auth.buttonManagement.actions.create')}
          </Button>
        </Access>,
      ]}
    />
  );
});
