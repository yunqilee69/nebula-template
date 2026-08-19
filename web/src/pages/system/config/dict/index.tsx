import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Popconfirm } from 'antd';
import { useCallback, useMemo, useRef, useState } from 'react';
import { NebulaProTable } from '@/components/nebula-pro-table';
import type { NebulaProColumns, NebulaProTableAction } from '@/components/nebula-pro-table';
import { useNotice } from '@/hooks/use-notice';
import { dictService as defaultDictService } from '@/services/dict';
import type { DictService } from '@/services/dict';
import type { DictTypeDetailResp } from '@/types/dict';
import { buildDictTypePageReq } from './dict-page-params';
import type { DictTypeQuery } from './dict-page-params';
import { DictTypeFormModal } from './dict-type-form-modal';
import { assertNever, dictTypeI18n, toCreateDictTypeReq, toUpdateDictTypeReq, useDictTypeI18n } from './dict-type-page.helpers';
import type { DictTypeFormState, DictTypeFormValues, DictTypeTableQuery } from './dict-type-page.helpers';
import { DictItemModal } from './components/dict-item-modal';

export interface DictManagementPageProps {
  readonly service?: DictService;
  readonly defaultPageSize?: number;
}

export function DictManagementPage({ service = defaultDictService, defaultPageSize = 10 }: DictManagementPageProps) {
  const actionRef = useRef<NebulaProTableAction | undefined>(undefined);
  const t = useDictTypeI18n();
  const notice = useNotice();
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [formState, setFormState] = useState<DictTypeFormState>({ mode: 'create' });
  const [formInitialValues, setFormInitialValues] = useState<Partial<DictTypeFormValues>>();
  const [submitting, setSubmitting] = useState(false);
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<DictTypeDetailResp>();

  const requestTypes = useCallback(
    (params: DictTypeTableQuery) => service.pageTypes(buildDictTypePageReq(params)),
    [service],
  );

  const openCreateModal = useCallback(() => {
    setFormState({ mode: 'create' });
    setFormInitialValues(undefined);
    setFormModalOpen(true);
  }, []);

  const openEditModal = useCallback(
    (record: DictTypeDetailResp) => {
      setFormState({ mode: 'update', typeId: record.id });
      setFormInitialValues({ code: record.code, name: record.name, remark: record.remark });
      setFormModalOpen(true);
    },
    [],
  );

  const closeFormModal = useCallback(() => {
    setFormModalOpen(false);
    setFormState({ mode: 'create' });
    setFormInitialValues(undefined);
  }, []);

  const submitType = useCallback(async (values: DictTypeFormValues) => {
    setSubmitting(true);
    try {
      switch (formState.mode) {
        case 'create':
          await service.createType(toCreateDictTypeReq(values));
          notice.success(t(dictTypeI18n.feedback.typeCreateSuccess));
          break;
        case 'update':
          await service.updateType(formState.typeId, toUpdateDictTypeReq(values));
          notice.success(t(dictTypeI18n.feedback.typeUpdateSuccess));
          break;
        default:
          assertNever(formState);
      }
      closeFormModal();
      await actionRef.current?.reload();
    } finally {
      setSubmitting(false);
    }
  }, [closeFormModal, formState, notice, service, t]);

  const removeType = useCallback(
    async (record: DictTypeDetailResp) => {
      await service.deleteType(record.id);
      notice.success(t(dictTypeI18n.feedback.typeDeleteSuccess));
      await actionRef.current?.reload();
    },
    [notice, service, t],
  );

  const openItemModal = useCallback((record: DictTypeDetailResp) => {
    setSelectedType(record);
    setItemModalOpen(true);
  }, []);

  const closeItemModal = useCallback(() => {
    setItemModalOpen(false);
    setSelectedType(undefined);
  }, []);

  const columns = useMemo<NebulaProColumns<DictTypeDetailResp>[]>(() => [
    { title: t(dictTypeI18n.columns.code), dataIndex: 'code', sorter: true, width: 180 },
    { title: t(dictTypeI18n.columns.name), dataIndex: 'name', sorter: true, width: 180 },
    { title: t(dictTypeI18n.columns.remark), dataIndex: 'remark', search: false, width: 260, ellipsis: true },
    {
      title: t(dictTypeI18n.columns.actions),
      key: 'actions',
      valueType: 'option',
      search: false,
      width: 220,
      render: (_, record) => [
        <Button key="items" type="link" onClick={() => openItemModal(record)}>
          {t(dictTypeI18n.actions.items)}
        </Button>,
        <Button key="edit" type="link" icon={<EditOutlined />} onClick={() => openEditModal(record)}>
          {t(dictTypeI18n.actions.edit)}
        </Button>,
        <Popconfirm
          key="delete"
          title={t(dictTypeI18n.confirm.typeDeleteTitle)}
          okText={t(dictTypeI18n.actions.delete)}
          cancelText={t(dictTypeI18n.actions.cancel)}
          onConfirm={() => void removeType(record)}
        >
          <Button type="link" danger icon={<DeleteOutlined />}>
            {t(dictTypeI18n.actions.delete)}
          </Button>
        </Popconfirm>,
      ],
    },
  ], [openEditModal, openItemModal, removeType, t]);

  return (
    <>
      <NebulaProTable<DictTypeDetailResp, DictTypeQuery>
        actionRef={actionRef}
        columns={columns}
        pagination={{ defaultPageSize }}
        request={requestTypes}
        onRequestError={() => notice.error(t(dictTypeI18n.feedback.typeListLoadFailed))}
        size="middle"
        toolBarRender={() => [
          <Button key="create" type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
            {t(dictTypeI18n.actions.createType)}
          </Button>,
        ]}
      />

      <DictTypeFormModal
        formState={formState}
        initialValues={formInitialValues}
        open={formModalOpen}
        submitting={submitting}
        onSubmit={(values) => void submitType(values)}
        onCancel={closeFormModal}
      />

      {selectedType ? (
        <DictItemModal
          open={itemModalOpen}
          dictCode={selectedType.code}
          dictName={selectedType.name}
          service={service}
          onCancel={closeItemModal}
        />
      ) : null}
    </>
  );
}

export default DictManagementPage;
