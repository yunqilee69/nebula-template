import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Popconfirm, Tag } from 'antd';
import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef } from 'react';
import { Access } from '@/components/access';
import { DictLabel, DictSelect } from '@/components/dict-select';
import { NebulaProTable } from '@/components/nebula-pro-table';
import type { NebulaPageReq, NebulaProColumns, NebulaProTableAction } from '@/components/nebula-pro-table';
import { AUTH_BUTTON_CODES } from '@/constants/auth-button-codes';
import { useNebulaI18n } from '@/hooks/use-nebula-i18n';
import { useNotice } from '@/hooks/use-notice';
import type { ApiPermissionService } from '@/api/api-permission';
import type { ApiPermissionStatus, ApiResp } from '@/types/api-permission';
import { PARAM_MODULE_DICT_CODE } from './api-form-modal';

export interface ApiTableHandle {
  reload: () => Promise<void>;
}

interface ApiTableProps {
  service: ApiPermissionService;
  onCreate: () => void;
  onEdit: (record: ApiResp) => void;
}

interface ApiQuery {
  name?: string;
  code?: string;
  module?: string;
  status?: ApiPermissionStatus;
}

function normalizeOptionalText(value: string | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function formatDateTime(value: string | undefined) {
  if (!value) return '-';
  return value.replace('T', ' ');
}

export const ApiTable = forwardRef<ApiTableHandle, ApiTableProps>(function ApiTable(
  { service, onCreate, onEdit },
  ref,
) {
  const actionRef = useRef<NebulaProTableAction | undefined>(undefined);
  const { t } = useNebulaI18n();
  const notice = useNotice();

  useImperativeHandle(ref, () => ({
    reload: () => actionRef.current?.reload() ?? Promise.resolve(),
  }));

  const removeApi = useCallback(
    async (record: ApiResp) => {
      try {
        await service.removeApi(record.id);
        notice.success(t('auth.apiManagement.feedback.deleteSuccess'));
        await actionRef.current?.reload();
      } catch (error: unknown) {
        notice.error(t('auth.apiManagement.feedback.deleteFailed'));
        console.error('Failed to delete api permission', error instanceof Error ? error.message : String(error));
      }
    },
    [service, notice, t],
  );

  const statusValueEnum = useMemo(
    () => ({
      1: { text: t('auth.apiManagement.status.enabled') },
      0: { text: t('auth.apiManagement.status.disabled') },
    }),
    [t],
  );

  const columns = useMemo<NebulaProColumns<ApiResp>[]>(() => [
    {
      title: t('auth.apiManagement.columns.name'),
      dataIndex: 'name',
      width: 180,
      sorter: true,
    },
    {
      title: t('auth.apiManagement.columns.code'),
      dataIndex: 'code',
      width: 220,
      sorter: true,
    },
    {
      title: t('auth.apiManagement.columns.module'),
      dataIndex: 'module',
      width: 140,
      render: (_, record) => (record.module
        ? <DictLabel dictCode={PARAM_MODULE_DICT_CODE} value={record.module} />
        : '-'),
      formItemRender: () => (
        <DictSelect
          dictCode={PARAM_MODULE_DICT_CODE}
          placeholder={t('auth.apiManagement.placeholders.module')}
          showDisabled={false}
        />
      ),
    },
    {
      title: t('auth.apiManagement.columns.remark'),
      dataIndex: 'remark',
      width: 240,
      search: false,
      ellipsis: true,
      render: (_, record) => record.remark ?? '-',
    },
    {
      title: t('auth.apiManagement.columns.status'),
      dataIndex: 'status',
      width: 100,
      valueType: 'select',
      valueEnum: statusValueEnum,
      fieldProps: { 'aria-label': t('auth.apiManagement.columns.status') },
      render: (_, record) => (
        <Tag color={record.status === 1 ? 'success' : 'default'}>
          {record.status === 1
            ? t('auth.apiManagement.status.enabled')
            : t('auth.apiManagement.status.disabled')}
        </Tag>
      ),
    },
    {
      title: t('auth.apiManagement.columns.createTime'),
      dataIndex: 'createTime',
      width: 180,
      search: false,
      sorter: true,
      render: (_, record) => formatDateTime(record.createTime),
    },
    {
      title: t('auth.apiManagement.columns.updateTime'),
      dataIndex: 'updateTime',
      width: 180,
      search: false,
      sorter: true,
      render: (_, record) => formatDateTime(record.updateTime),
    },
    {
      title: t('auth.apiManagement.columns.actions'),
      key: 'actions',
      fixed: 'right',
      width: 160,
      valueType: 'option',
      search: false,
      render: (_, record) => [
        <Access key="edit" permission={AUTH_BUTTON_CODES.API_EDIT} fallback={null}>
          <Button type="link" icon={<EditOutlined />} onClick={() => onEdit(record)}>
            {t('auth.apiManagement.actions.edit')}
          </Button>
        </Access>,
        <Access key="delete" permission={AUTH_BUTTON_CODES.API_DELETE} fallback={null}>
          <Popconfirm
            title={t('auth.apiManagement.confirm.deleteTitle')}
            okText={t('auth.apiManagement.actions.delete')}
            cancelText={t('auth.apiManagement.actions.cancel')}
            onConfirm={() => void removeApi(record)}
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              {t('auth.apiManagement.actions.delete')}
            </Button>
          </Popconfirm>
        </Access>,
      ],
    },
  ], [onEdit, removeApi, statusValueEnum, t]);

  const requestApis = useCallback(
    async (params: ApiQuery & NebulaPageReq) => {
      const apiName = normalizeOptionalText(params.name);
      const apiCode = normalizeOptionalText(params.code);
      const apiModule = normalizeOptionalText(params.module);

      const page = await service.pageApis({
        pageNum: params.pageNum,
        pageSize: params.pageSize,
        ...(params.orderName ? { orderName: params.orderName } : {}),
        ...(params.orderType ? { orderType: params.orderType } : {}),
        ...(apiName ? { name: apiName } : {}),
        ...(apiCode ? { code: apiCode } : {}),
        ...(apiModule ? { module: apiModule } : {}),
        ...(params.status !== undefined ? { status: Number(params.status) as ApiPermissionStatus } : {}),
      });

      return { data: page.data, total: page.total };
    },
    [service],
  );

  return (
    <NebulaProTable<ApiResp, ApiQuery>
      actionRef={actionRef}
      columns={columns}
      request={requestApis}
      onRequestError={() => notice.error(t('auth.apiManagement.feedback.listLoadFailed'))}
      size="middle"
      scroll={{ x: 1200 }}
      toolBarRender={() => [
        <Access key="create" permission={AUTH_BUTTON_CODES.API_CREATE} fallback={null}>
          <Button type="primary" icon={<PlusOutlined />} onClick={onCreate}>
            {t('auth.apiManagement.actions.create')}
          </Button>
        </Access>,
      ]}
    />
  );
});
