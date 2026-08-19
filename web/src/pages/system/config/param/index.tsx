import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Form, Popconfirm } from 'antd';
import { useCallback, useMemo, useRef, useState } from 'react';
import { DictLabel } from '@/components/dict-select';
import { useDictItems } from '@/components/dict-select';
import { NebulaProTable } from '@/components/nebula-pro-table';
import type { NebulaProColumns, NebulaProTableAction } from '@/components/nebula-pro-table';
import { useNebulaI18n } from '@/hooks/use-nebula-i18n';
import { useNotice } from '@/hooks/use-notice';
import { paramService as defaultParamService } from '@/services/param';
import type { ParamService } from '@/services/param';
import { DataType, type SystemParamResp } from '@/types/param';
import { ParamFormModal } from './param-form-modal';
import {
  PARAM_DATA_TYPE_VALUES,
  getParamRevealKey,
  paramI18n,
  toCreateParamReq,
  toParamFormValues,
  toUpdateParamReq,
} from './param-page-helpers';
import type { ParamFormState, ParamFormValues } from './param-page-helpers';
import { buildParamPageReq } from './param-page-shared';
import type { ParamTableParams } from './param-page-shared';
import { useParamValueRenderer } from './param-value-reveal';

const PARAM_MODULE_DICT_CODE = 'param_module';

function useParamPageI18n(): (key: string) => string {
  const { t } = useNebulaI18n();
  return useCallback((key: string) => String(Reflect.apply(t, undefined, [key])), [t]);
}

export function ParamManagementPage({ service = defaultParamService }: { readonly service?: ParamService }) {
  const actionRef = useRef<NebulaProTableAction | undefined>(undefined);
  const [form] = Form.useForm<ParamFormValues>();
  const translate = useParamPageI18n();
  const notice = useNotice();
  const [formState, setFormState] = useState<ParamFormState>({ mode: 'create' });
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  const dataTypeOptions = useMemo(
    () => PARAM_DATA_TYPE_VALUES.map((value) => ({ label: translate(paramI18n.dataTypes[value]), value })),
    [translate],
  );
  const dataTypeValueEnum = useMemo(
    () => Object.fromEntries(dataTypeOptions.map((option) => [option.value, { text: option.label }])),
    [dataTypeOptions],
  );

  const { options: moduleOptions } = useDictItems(PARAM_MODULE_DICT_CODE);
  const moduleSelectOptions = useMemo(
    () => moduleOptions.map((opt) => ({ label: opt.label, value: opt.value, disabled: opt.disabled })),
    [moduleOptions],
  );

  const requestParams = useCallback(
    (params: ParamTableParams) => service.pageParams(buildParamPageReq(params)),
    [service],
  );

  const openCreateModal = useCallback(() => {
    setFormState({ mode: 'create' });
    form.resetFields();
    form.setFieldsValue({
      dataType: DataType.STRING,
    });
    setModalOpen(true);
  }, [form]);

  const openEditModal = useCallback(
    async (record: SystemParamResp) => {
      if (!record.id) return;
      setFormState({ mode: 'update', paramId: record.id });
      form.resetFields();
      setModalOpen(true);
      setDetailLoading(true);
      try {
        const detail = await service.getParam(record.id);
        form.setFieldsValue(toParamFormValues(detail));
      } catch (error: unknown) {
        if (error instanceof Error) {
          notice.error(translate(paramI18n.feedback.detailLoadFailed));
          setModalOpen(false);
          return;
        }
        throw error;
      } finally {
        setDetailLoading(false);
      }
    },
    [form, notice, service, translate],
  );

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setFormState({ mode: 'create' });
    form.resetFields();
  }, [form]);

  const submitParam = useCallback(async () => {
    const values = await form.validateFields();
    setSubmitting(true);
    try {
      switch (formState.mode) {
        case 'create':
          await service.createParam(toCreateParamReq(values));
          notice.success(translate(paramI18n.feedback.createSuccess));
          break;
        case 'update':
          await service.updateParam(formState.paramId, toUpdateParamReq(values));
          notice.success(translate(paramI18n.feedback.updateSuccess));
          break;
      }
      closeModal();
      await actionRef.current?.reload();
    } finally {
      setSubmitting(false);
    }
  }, [closeModal, form, formState, notice, service, translate]);

  const removeParam = useCallback(
    async (record: SystemParamResp) => {
      if (!record.id) return;
      await service.deleteParam(record.id);
      notice.success(translate(paramI18n.feedback.deleteSuccess));
      await actionRef.current?.reload();
    },
    [notice, service, translate],
  );
  const renderParamValue = useParamValueRenderer({ service, notice, translate });

  const columns = useMemo<NebulaProColumns<SystemParamResp>[]>(() => [
    {
      title: translate(paramI18n.columns.moduleCode),
      dataIndex: 'moduleCode',
      fixed: 'left',
      width: 160,
      valueType: 'select',
      fieldProps: {
        allowClear: true,
        showSearch: true,
        optionFilterProp: 'label',
        options: moduleSelectOptions,
        placeholder: translate(paramI18n.placeholders.moduleCode),
      },
      render: (_, record) => {
        if (!record.moduleCode) return '-';
        return <DictLabel dictCode={PARAM_MODULE_DICT_CODE} value={record.moduleCode} />;
      },
    },
    { title: translate(paramI18n.columns.paramKey), dataIndex: 'paramKey', fixed: 'left', width: 220, sorter: true },
    { title: translate(paramI18n.columns.paramName), dataIndex: 'paramName', width: 180, sorter: true },
    {
      title: translate(paramI18n.columns.paramValue),
      key: 'paramValue',
      width: 240,
      search: false,
      render: (_, record) => renderParamValue(record),
    },
    {
      title: translate(paramI18n.columns.dataType),
      dataIndex: 'dataType',
      width: 140,
      valueType: 'select',
      valueEnum: dataTypeValueEnum,
      fieldProps: { allowClear: true, options: dataTypeOptions, 'aria-label': translate(paramI18n.fields.dataType) },
    },
    {
      title: translate(paramI18n.columns.actions),
      key: 'actions',
      fixed: 'right',
      width: 180,
      valueType: 'option',
      search: false,
      render: (_, record) => [
        <Button key="edit" type="link" icon={<EditOutlined />} disabled={!record.id} onClick={() => void openEditModal(record)}>
          {translate(paramI18n.actions.edit)}
        </Button>,
        <Popconfirm
          key="delete"
          title={translate(paramI18n.confirm.deleteTitle)}
          okText={translate(paramI18n.actions.delete)}
          cancelText={translate(paramI18n.actions.cancel)}
          disabled={!record.id}
          onConfirm={() => void removeParam(record)}
        >
          <Button type="link" danger icon={<DeleteOutlined />} disabled={!record.id}>
            {translate(paramI18n.actions.delete)}
          </Button>
        </Popconfirm>,
      ],
    },
  ], [dataTypeOptions, dataTypeValueEnum, moduleSelectOptions, openEditModal, removeParam, renderParamValue, translate]);

  return (
    <>
      <NebulaProTable<SystemParamResp, ParamTableParams>
        actionRef={actionRef}
        columns={columns}
        request={requestParams}
        rowKey={(record) => getParamRevealKey(record) ?? record.paramName ?? record.moduleCode ?? ''}
        onRequestError={() => notice.error(translate(paramI18n.feedback.listLoadFailed))}
        size="middle"
        scroll={{ x: 1120 }}
        toolBarRender={() => [
          <Button key="create" type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
            {translate(paramI18n.actions.create)}
          </Button>,
        ]}
      />
      <ParamFormModal
        form={form}
        mode={formState.mode}
        open={modalOpen}
        submitting={submitting}
        detailLoading={detailLoading}
        translate={translate}
        onSubmit={() => void submitParam()}
        onCancel={closeModal}
      />
    </>
  );
}

export default ParamManagementPage;
