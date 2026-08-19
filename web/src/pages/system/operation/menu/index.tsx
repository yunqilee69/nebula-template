import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Form, Popconfirm, Tag } from 'antd';
import { useCallback, useMemo, useRef, useState } from 'react';
import type { Key } from 'react';
import { Access } from '@/components/access';
import { NebulaProTable } from '@/components/nebula-pro-table';
import type { NebulaPageReq, NebulaProColumns, NebulaProTableAction } from '@/components/nebula-pro-table';
import { AUTH_BUTTON_CODES } from '@/constants/auth-button-codes';
import { useNebulaI18n } from '@/hooks/use-nebula-i18n';
import { useNotice } from '@/hooks/use-notice';
import type { MenuComponentRegistry } from '@/route/types';
import { menuService as defaultMenuService } from '@/api/menu';
import type { MenuService } from '@/api/menu';
import type {
  CreateMenuReq,
  MenuDetailResp,
  MenuStatus,
  MenuTreeResp,
  UpdateMenuReq,
} from '@/types/menu';
import { ButtonManagementModal } from './button-management-modal';
import { MenuFormModal } from './menu-form-modal';
import type { MenuComponentOption, MenuFormMode, MenuFormValues, MenuParentOption } from './menu-form-modal';

export interface MenuManagementPageProps {
  menuService?: MenuService;
  componentRegistry?: MenuComponentRegistry;
  componentOptions?: MenuComponentOption[];
}

interface MenuSearchValues {
  name?: string;
  code?: string;
  status?: MenuStatus;
}

function normalizeOptionalText(value: string | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function formatDateTime(value: string | undefined) {
  if (!value) return '-';
  return value.replace('T', ' ');
}

function filterMenuTree(
  nodes: MenuTreeResp[],
  name?: string,
  code?: string,
  status?: MenuStatus,
): MenuTreeResp[] {
  const trimmedName = normalizeOptionalText(name);
  const trimmedCode = normalizeOptionalText(code);

  function matches(node: MenuTreeResp): boolean {
    if (trimmedName && !node.name.toLowerCase().includes(trimmedName.toLowerCase())) return false;
    if (trimmedCode && !node.code.toLowerCase().includes(trimmedCode.toLowerCase())) return false;
    if (status !== undefined && node.status !== status) return false;
    return true;
  }

  function filterNodes(items: MenuTreeResp[]): MenuTreeResp[] {
    const result: MenuTreeResp[] = [];
    for (const item of items) {
      const filteredChildren = item.children ? filterNodes(item.children) : undefined;
      if (matches(item)) {
        result.push({ ...item, children: filteredChildren });
      } else if (filteredChildren && filteredChildren.length > 0) {
        result.push({ ...item, children: filteredChildren });
      }
    }
    return result;
  }

  return filterNodes(nodes);
}

function collectParentRowKeys(nodes: MenuTreeResp[]): string[] {
  const keys: string[] = [];
  for (const node of nodes) {
    if (node.children && node.children.length > 0) {
      keys.push(node.id);
      keys.push(...collectParentRowKeys(node.children));
    }
  }
  return keys;
}

function createMenuComponentOptions(registry: MenuComponentRegistry | undefined): MenuComponentOption[] {
  if (!registry) return [];
  return Object.values(registry).map((item) => ({
    label: item.defaultName ?? item.component,
    value: item.component,
    defaultName: item.defaultName,
    defaultPath: item.defaultPath,
    defaultCode: item.defaultCode,
    defaultIcon: item.defaultIcon,
  }));
}

function createMenuParentOptions(
  nodes: MenuTreeResp[],
  rootLabel: string,
  disabledIds: Set<string>,
): MenuParentOption[] {
  function convert(items: MenuTreeResp[]): MenuParentOption[] {
    return items.map((item) => ({
      label: item.name,
      value: item.id,
      disabled: disabledIds.has(item.id),
      children: item.children && item.children.length > 0 ? convert(item.children) : undefined,
    }));
  }

  return [{ label: rootLabel, value: '0', children: convert(nodes) }];
}

function collectMenuSubtreeIds(nodes: MenuTreeResp[], menuId: string | undefined): Set<string> {
  if (!menuId) return new Set<string>();

  function collectIds(node: MenuTreeResp): string[] {
    return [node.id, ...(node.children ?? []).flatMap(collectIds)];
  }

  function findSubtreeIds(items: MenuTreeResp[]): string[] | undefined {
    for (const item of items) {
      if (item.id === menuId) return collectIds(item);
      const childIds = item.children ? findSubtreeIds(item.children) : undefined;
      if (childIds) return childIds;
    }
    return undefined;
  }

  return new Set(findSubtreeIds(nodes) ?? []);
}

function findMenuParentPath(nodes: MenuTreeResp[], parentId: string | undefined): string[] {
  if (!parentId || parentId === '0') return ['0'];

  function findPath(items: MenuTreeResp[], ancestors: string[]): string[] | undefined {
    for (const item of items) {
      const path = [...ancestors, item.id];
      if (item.id === parentId) return path;
      const childPath = item.children ? findPath(item.children, path) : undefined;
      if (childPath) return childPath;
    }
    return undefined;
  }

  return findPath(nodes, ['0']) ?? ['0'];
}

function getParentIdFromPath(parentPath: string[] | undefined): string {
  return parentPath && parentPath.length > 0 ? parentPath[parentPath.length - 1] : '0';
}

function isMenuType(type: string | undefined): boolean {
  return type === 'MENU' || type === 'menu';
}

function isExternalMenuType(type: string | undefined): boolean {
  return type === 'EXTERNAL';
}

function normalizeMenuType(type: string | undefined): string | undefined {
  return type?.toUpperCase();
}

export function MenuManagementPage({
  menuService: menuServiceProp,
  componentRegistry,
  componentOptions: componentOptionsProp,
}: MenuManagementPageProps) {
  const menuService = menuServiceProp ?? defaultMenuService;
  const actionRef = useRef<NebulaProTableAction | undefined>(undefined);
  const { t } = useNebulaI18n();
  const notice = useNotice();
  const [form] = Form.useForm<MenuFormValues>();
  const [modalOpen, setModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<MenuFormMode>('create');
  const [editingMenuId, setEditingMenuId] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [menuTree, setMenuTree] = useState<MenuTreeResp[]>([]);

  const [buttonModalOpen, setButtonModalOpen] = useState(false);
  const [selectedMenu, setSelectedMenu] = useState<MenuTreeResp>();

  const [expandedKeys, setExpandedKeys] = useState<readonly Key[]>([]);

  const componentOptions = useMemo(
    () => componentOptionsProp ?? createMenuComponentOptions(componentRegistry),
    [componentOptionsProp, componentRegistry],
  );

  const disabledParentIds = useMemo(
    () => collectMenuSubtreeIds(menuTree, editingMenuId),
    [menuTree, editingMenuId],
  );

  const parentOptions = useMemo(
    () => createMenuParentOptions(menuTree, t('auth.menuManagement.fields.rootMenu'), disabledParentIds),
    [disabledParentIds, menuTree, t],
  );

  const requestMenuTree = useCallback(
    async (params: MenuSearchValues & NebulaPageReq) => {
      const tree = await menuService.getMenuTree();
      setMenuTree(tree);
      const status = params.status === undefined ? undefined : Number(params.status) as MenuStatus;
      const filtered = filterMenuTree(tree, params.name, params.code, status);
      setExpandedKeys(collectParentRowKeys(filtered));
      return { data: filtered, total: filtered.length };
    },
    [menuService],
  );

  const handleRequestError = useCallback(() => {
    notice.error(t('auth.menuManagement.feedback.listLoadFailed'));
  }, [notice, t]);

  const handleExpandedRowsChange = useCallback((keys: readonly Key[]) => {
    setExpandedKeys(keys);
  }, []);

  const expandable = useMemo(
    () => ({
      expandedRowKeys: expandedKeys,
      onExpandedRowsChange: handleExpandedRowsChange,
    }),
    [expandedKeys, handleExpandedRowsChange],
  );

  const openCreateModal = useCallback(() => {
    setFormMode('create');
    setEditingMenuId(undefined);
    form.resetFields();
    form.setFieldsValue({
      parentPath: ['0'],
      type: 'MENU',
      sort: 0,
      status: 1,
      hidden: false,
      visibleInBreadcrumb: true,
      visibleInTab: true,
    });
    setModalOpen(true);
  }, [form]);

  const openUpdateModal = useCallback(
    async (record: MenuTreeResp) => {
      setFormMode('update');
      setEditingMenuId(record.id);
      form.resetFields();
      setModalOpen(true);
      setDetailLoading(true);
      try {
        const detail: MenuDetailResp = await menuService.getMenuById(record.id);
        form.setFieldsValue({
          parentPath: findMenuParentPath(menuTree, detail.parentId),
          name: detail.name,
          code: detail.code,
          type: detail.type,
          path: detail.path,
          icon: detail.icon,
          component: detail.component,
          sort: detail.sort ?? 0,
          status: detail.status,
          hidden: detail.hidden ?? false,
          externalUrl: detail.externalUrl,
          visibleInBreadcrumb: detail.visibleInBreadcrumb ?? true,
          visibleInTab: detail.visibleInTab ?? true,
          activeMenuPath: detail.activeMenuPath,
          remark: detail.remark,
        });
      } catch {
        notice.error(t('auth.menuManagement.feedback.detailLoadFailed'));
        setModalOpen(false);
      } finally {
        setDetailLoading(false);
      }
    },
    [form, menuService, menuTree, notice, t],
  );

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditingMenuId(undefined);
    form.resetFields();
  }, [form]);

  const submitMenu = useCallback(async () => {
    let values: MenuFormValues;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }

    const externalFlag = isExternalMenuType(values.type);
    const payload: CreateMenuReq = {
      parentId: getParentIdFromPath(values.parentPath),
      name: values.name.trim(),
      code: values.code.trim(),
      type: values.type,
      path: normalizeOptionalText(values.path),
      icon: normalizeOptionalText(values.icon),
      component: normalizeOptionalText(values.component),
      sort: values.sort,
      status: values.status,
      hidden: values.hidden,
      externalFlag,
      externalUrl: externalFlag ? normalizeOptionalText(values.externalUrl) : undefined,
      visibleInBreadcrumb: values.visibleInBreadcrumb,
      visibleInTab: values.visibleInTab,
      activeMenuPath: normalizeOptionalText(values.activeMenuPath),
      remark: normalizeOptionalText(values.remark),
    };

    setSubmitting(true);
    try {
      if (formMode === 'create') {
        await menuService.createMenu(payload);
        notice.success(t('auth.menuManagement.feedback.createSuccess'));
      } else if (editingMenuId) {
        const updatePayload: UpdateMenuReq = { id: editingMenuId, ...payload };
        await menuService.updateMenu(editingMenuId, updatePayload);
        notice.success(t('auth.menuManagement.feedback.updateSuccess'));
      }
      closeModal();
      await actionRef.current?.reload();
    } finally {
      setSubmitting(false);
    }
  }, [closeModal, editingMenuId, form, formMode, menuService, notice, t]);

  const removeMenu = useCallback(
    async (record: MenuTreeResp) => {
      await menuService.removeMenu(record.id);
      notice.success(t('auth.menuManagement.feedback.deleteSuccess'));
      await actionRef.current?.reload();
    },
    [notice, menuService, t],
  );

  const openButtonModal = useCallback((record: MenuTreeResp) => {
    setSelectedMenu(record);
    setButtonModalOpen(true);
  }, []);

  const closeButtonModal = useCallback(() => {
    setButtonModalOpen(false);
    setSelectedMenu(undefined);
  }, []);

  const menuStatusOptions = useMemo<Array<{ label: string; value: MenuStatus }>>(
    () => [
      { label: t('auth.menuManagement.status.enabled'), value: 1 },
      { label: t('auth.menuManagement.status.disabled'), value: 0 },
    ],
    [t],
  );

  const formatMenuType = useCallback(
    (type: string | undefined) => {
      switch (normalizeMenuType(type)) {
        case 'CATALOG':
          return t('auth.menuManagement.types.catalog');
        case 'MENU':
          return t('auth.menuManagement.types.menu');
        case 'IFRAME':
          return t('auth.menuManagement.types.iframe');
        case 'EXTERNAL':
          return t('auth.menuManagement.types.external');
        default:
          return type || '-';
      }
    },
    [t],
  );

  const statusValueEnum = useMemo(
    () => Object.fromEntries(menuStatusOptions.map((option) => [option.value, { text: option.label }])),
    [menuStatusOptions],
  );

  const columns = useMemo<NebulaProColumns<MenuTreeResp>[]>(() => [
    {
      title: t('auth.menuManagement.columns.name'),
      dataIndex: 'name',
      fixed: 'left',
      width: 180,
      sorter: true,
    },
    {
      title: t('auth.menuManagement.columns.code'),
      dataIndex: 'code',
      width: 180,
      sorter: true,
    },
    {
      title: t('auth.menuManagement.columns.type'),
      dataIndex: 'type',
      width: 100,
      search: false,
      render: (_, record) => formatMenuType(record.type),
    },
    {
      title: t('auth.menuManagement.columns.path'),
      dataIndex: 'path',
      width: 180,
      search: false,
    },
    {
      title: t('auth.menuManagement.columns.sort'),
      dataIndex: 'sort',
      width: 80,
      search: false,
      sorter: true,
    },
    {
      title: t('auth.menuManagement.columns.status'),
      dataIndex: 'status',
      width: 100,
      valueType: 'select',
      valueEnum: statusValueEnum,
      fieldProps: { 'aria-label': t('auth.menuManagement.fields.status') },
      render: (_, record) => (
        <Tag color={record.status === 1 ? 'success' : 'default'}>
          {record.status === 1 ? t('auth.menuManagement.status.enabled') : t('auth.menuManagement.status.disabled')}
        </Tag>
      ),
    },
    {
      title: t('auth.menuManagement.columns.createTime'),
      dataIndex: 'createTime',
      width: 180,
      search: false,
      sorter: true,
      render: (_, record) => formatDateTime(record.createTime),
    },
    {
      title: t('auth.menuManagement.columns.updateTime'),
      dataIndex: 'updateTime',
      width: 180,
      search: false,
      sorter: true,
      render: (_, record) => formatDateTime(record.updateTime),
    },
    {
      title: t('auth.menuManagement.columns.actions'),
      key: 'actions',
      fixed: 'right',
      width: 220,
      valueType: 'option',
      search: false,
      render: (_, record) => [
        <Access key="edit" permission={AUTH_BUTTON_CODES.MENU_EDIT} fallback={null}>
          <Button type="link" icon={<EditOutlined />} onClick={() => void openUpdateModal(record)}>
            {t('auth.menuManagement.actions.edit')}
          </Button>
        </Access>,
        <Access key="delete" permission={AUTH_BUTTON_CODES.MENU_DELETE} fallback={null}>
          <Popconfirm
            title={t('auth.menuManagement.confirm.deleteTitle')}
            okText={t('auth.menuManagement.actions.delete')}
            cancelText={t('auth.menuManagement.actions.cancel')}
            onConfirm={() => void removeMenu(record)}
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              {t('auth.menuManagement.actions.delete')}
            </Button>
          </Popconfirm>
        </Access>,
        isMenuType(record.type) ? (
          <Button key="buttons" type="link" onClick={() => openButtonModal(record)}>
            {t('auth.menuManagement.actions.manageButtons')}
          </Button>
        ) : null,
      ],
    },
  ], [formatMenuType, openButtonModal, openUpdateModal, removeMenu, statusValueEnum, t]);

  return (
    <>
      <NebulaProTable<MenuTreeResp, MenuSearchValues>
        actionRef={actionRef}
        columns={columns}
        pagination={false}
        expandable={expandable}
        request={requestMenuTree}
        onRequestError={handleRequestError}
        size="middle"
        scroll={{ x: 1200 }}
        toolBarRender={() => [
          <Access key="create" permission={AUTH_BUTTON_CODES.MENU_CREATE} fallback={null}>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>{t('auth.menuManagement.actions.create')}</Button>
          </Access>,
        ]}
      />

      <MenuFormModal
        form={form}
        mode={formMode}
        open={modalOpen}
        submitting={submitting}
        detailLoading={detailLoading}
        parentOptions={parentOptions}
        componentOptions={componentOptions}
        onSubmit={() => void submitMenu()}
        onCancel={closeModal}
      />

      <ButtonManagementModal
        open={buttonModalOpen}
        menu={selectedMenu}
        menuService={menuService}
        onCancel={closeButtonModal}
      />
    </>
  );
}
