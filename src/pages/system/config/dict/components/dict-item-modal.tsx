import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Form, Modal, Popconfirm, Tag } from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NebulaProTable } from '@/components/nebula-pro-table';
import type { NebulaProColumns, NebulaProTableAction } from '@/components/nebula-pro-table';
import { useNotice } from '@/hooks/use-notice';
import { dictService } from '@/services/dict';
import type { DictService } from '@/services/dict';
import type { DictItemDetailResp } from '@/types/dict';
import { DictItemFormModal } from './dict-item-form-modal';
import {
  assertNever,
  buildDictItemTablePageReq,
  dictI18n,
  flattenDictItemOptions,
  toCreateDictItemReq,
  toUpdateDictItemReq,
  useDictItemI18n,
} from './dict-item-modal.helpers';
import type { DictItemFormState, DictItemFormValues, DictItemSelectOption, DictItemTableQuery } from './dict-item-modal.helpers';

export type { DictItemFormValues, DictItemTableQuery } from './dict-item-modal.helpers';
export { buildDictItemTablePageReq, toCreateDictItemReq, toUpdateDictItemReq } from './dict-item-modal.helpers';

export interface DictItemModalProps {
  readonly open: boolean;
  readonly dictCode?: string;
  readonly dictName?: string;
  readonly service?: DictService;
  readonly onCancel: () => void;
}

export function DictItemModal({ open, dictCode, dictName, service = dictService, onCancel }: DictItemModalProps) {
  const actionRef = useRef<NebulaProTableAction | undefined>(undefined);
  const [form] = Form.useForm<DictItemFormValues>();
  const t = useDictItemI18n();
  const notice = useNotice();
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [formState, setFormState] = useState<DictItemFormState>({ mode: 'create' });
  const [submitting, setSubmitting] = useState(false);
  const [parentOptions, setParentOptions] = useState<DictItemSelectOption[]>([]);

  useEffect(() => {
    if (!open || !dictCode) {
      setParentOptions([]);
      return;
    }

    let active = true;
    void service.listItemsByCode(dictCode).then((items) => {
      if (active) setParentOptions(flattenDictItemOptions(items));
    }).catch((error: unknown) => {
      if (error instanceof Error) {
        notice.error(t(dictI18n.feedback.itemOptionsLoadFailed));
        return;
      }
      throw error;
    });

    return () => {
      active = false;
    };
  }, [dictCode, notice, open, service, t]);

  useEffect(() => {
    if (open) return;
    setFormModalOpen(false);
    setFormState({ mode: 'create' });
    form.resetFields();
  }, [form, open]);

  const enabledOptions = useMemo(
    () => [
      { label: t(dictI18n.status.enabled), value: true },
      { label: t(dictI18n.status.disabled), value: false },
    ],
    [t],
  );

  const enabledValueEnum = useMemo(
    () => ({
      true: { text: t(dictI18n.status.enabled) },
      false: { text: t(dictI18n.status.disabled) },
    }),
    [t],
  );

  const parentNameById = useMemo(() => new Map(parentOptions.map((option) => [option.value, option.label])), [parentOptions]);
  const formParentOptions = useMemo(
    () => (formState.mode === 'update' ? parentOptions.filter((option) => option.value !== formState.itemId) : parentOptions),
    [formState, parentOptions],
  );

  const requestItems = useCallback(
    (params: DictItemTableQuery) => {
      if (!dictCode) return Promise.resolve({ data: [], total: 0 });
      return service.pageItems(buildDictItemTablePageReq({ ...params, dictCode }));
    },
    [dictCode, service],
  );

  const openCreateForm = useCallback(() => {
    setFormState({ mode: 'create' });
    form.resetFields();
    form.setFieldsValue({ enabled: true, sort: 0 });
    setFormModalOpen(true);
  }, [form]);

  const openEditForm = useCallback(
    (record: DictItemDetailResp) => {
      setFormState({ mode: 'update', itemId: record.id });
      form.resetFields();
      form.setFieldsValue({
        name: record.name,
        parentId: record.parentId,
        itemValue: record.itemValue,
        sort: record.sort,
        enabled: record.enabled,
        tagColor: record.tagColor,
        remark: record.remark,
      });
      setFormModalOpen(true);
    },
    [form],
  );

  const closeFormModal = useCallback(() => {
    setFormModalOpen(false);
    setFormState({ mode: 'create' });
    form.resetFields();
  }, [form]);

  const submitItem = useCallback(async () => {
    if (!dictCode) return;
    const values = await form.validateFields();
    setSubmitting(true);
    try {
      switch (formState.mode) {
        case 'create':
          await service.createItem(toCreateDictItemReq(dictCode, values));
          notice.success(t(dictI18n.feedback.itemCreateSuccess));
          break;
        case 'update':
          await service.updateItem(formState.itemId, toUpdateDictItemReq(values));
          notice.success(t(dictI18n.feedback.itemUpdateSuccess));
          break;
        default:
          assertNever(formState);
      }
      closeFormModal();
      await actionRef.current?.reload();
      setParentOptions(flattenDictItemOptions(await service.listItemsByCode(dictCode)));
    } finally {
      setSubmitting(false);
    }
  }, [closeFormModal, dictCode, form, formState, notice, service, t]);

  const removeItem = useCallback(
    async (record: DictItemDetailResp) => {
      await service.deleteItem(record.id);
      notice.success(t(dictI18n.feedback.itemDeleteSuccess));
      await actionRef.current?.reload();
      if (dictCode) setParentOptions(flattenDictItemOptions(await service.listItemsByCode(dictCode)));
    },
    [dictCode, notice, service, t],
  );

  const columns = useMemo<NebulaProColumns<DictItemDetailResp>[]>(() => [
    { title: t(dictI18n.columns.code), dataIndex: 'dictCode', search: false, width: 140 },
    { title: t(dictI18n.columns.name), dataIndex: 'name', sorter: true, width: 160 },
    {
      title: t(dictI18n.columns.itemValue),
      dataIndex: 'itemValue',
      search: false,
      width: 160,
      render: (_, record) => (record.tagColor ? <Tag color={record.tagColor}>{record.itemValue}</Tag> : record.itemValue),
    },
    {
      title: t(dictI18n.columns.parentId),
      dataIndex: 'parentId',
      valueType: 'select',
      fieldProps: { allowClear: true, options: parentOptions },
      width: 180,
      render: (_, record) => record.parentId ? parentNameById.get(record.parentId) ?? record.parentId : '-',
    },
    { title: t(dictI18n.columns.sort), dataIndex: 'sort', search: false, sorter: true, width: 100 },
    {
      title: t(dictI18n.columns.status),
      dataIndex: 'enabled',
      valueType: 'select',
      valueEnum: enabledValueEnum,
      fieldProps: { 'aria-label': t(dictI18n.columns.status), options: enabledOptions },
      width: 120,
      render: (_, record) => <Tag color={record.enabled ? 'success' : 'default'}>{record.enabled ? t(dictI18n.status.enabled) : t(dictI18n.status.disabled)}</Tag>,
    },
    {
      title: t(dictI18n.columns.actions),
      key: 'actions',
      valueType: 'option',
      search: false,
      width: 160,
      render: (_, record) => [
        <Button key="edit" type="link" icon={<EditOutlined />} onClick={() => openEditForm(record)}>
          {t(dictI18n.actions.edit)}
        </Button>,
        <Popconfirm key="delete" title={t(dictI18n.confirm.itemDeleteTitle)} okText={t(dictI18n.actions.delete)} cancelText={t(dictI18n.actions.cancel)} onConfirm={() => void removeItem(record)}>
          <Button type="link" danger icon={<DeleteOutlined />}>{t(dictI18n.actions.delete)}</Button>
        </Popconfirm>,
      ],
    },
  ], [enabledOptions, enabledValueEnum, openEditForm, parentNameById, parentOptions, removeItem, t]);

  if (!dictCode) return null;

  return (
    <Modal title={dictName ? `${t(dictI18n.modal.itemTitle)} - ${dictName}` : t(dictI18n.modal.itemTitle)} open={open} onCancel={onCancel} footer={null} width={960} destroyOnHidden>
      <NebulaProTable<DictItemDetailResp, DictItemTableQuery>
        actionRef={actionRef}
        columns={columns}
        request={requestItems}
        onRequestError={() => notice.error(t(dictI18n.feedback.itemListLoadFailed))}
        size="middle"
        scroll={{ x: 920 }}
        toolBarRender={() => [<Button key="create" type="primary" icon={<PlusOutlined />} onClick={openCreateForm}>{t(dictI18n.actions.createItem)}</Button>]}
      />
      <DictItemFormModal form={form} formState={formState} open={formModalOpen} submitting={submitting} parentOptions={formParentOptions} onSubmit={() => void submitItem()} onCancel={closeFormModal} />
    </Modal>
  );
}
