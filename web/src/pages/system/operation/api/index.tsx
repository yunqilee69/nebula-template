import { Tabs, Form } from 'antd';
import { useCallback, useRef, useState } from 'react';
import { useNebulaI18n } from '@/hooks/use-nebula-i18n';
import { useNotice } from '@/hooks/use-notice';
import { apiPermissionService as defaultApiPermissionService } from '@/api/api-permission';
import type { ApiPermissionService } from '@/api/api-permission';
import type { ApiDetailResp, ApiResp, CreateApiReq, UpdateApiReq } from '@/types/api-permission';
import { ApiFormModal, type ApiFormValues } from './components/api-form-modal';
import { ApiReconciliationPanel } from './components/api-reconciliation-panel';
import { ApiTable, type ApiTableHandle } from './components/api-table';

export interface ApiManagementPageProps {
  service?: ApiPermissionService;
}

export function ApiManagementPage({ service: serviceProp }: ApiManagementPageProps) {
  const service = serviceProp ?? defaultApiPermissionService;
  const { t } = useNebulaI18n();
  const notice = useNotice();
  const [form] = Form.useForm<ApiFormValues>();

  const tableRef = useRef<ApiTableHandle>(null);
  const [dataVersion, setDataVersion] = useState(0);

  const [formModalOpen, setFormModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'update'>('create');
  const [editingApiId, setEditingApiId] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  const openCreateModal = useCallback(() => {
    setFormMode('create');
    setEditingApiId(undefined);
    form.resetFields();
    form.setFieldsValue({ status: 1, sort: 0 });
    setFormModalOpen(true);
  }, [form]);

  const openEditModal = useCallback(
    async (record: ApiResp) => {
      setFormMode('update');
      setEditingApiId(record.id);
      form.resetFields();
      setFormModalOpen(true);
      setDetailLoading(true);
      try {
        const detail: ApiDetailResp = await service.getApiById(record.id);
        form.setFieldsValue({
          code: detail.code,
          name: detail.name,
          module: detail.module,
          sort: detail.sort,
          remark: detail.remark,
          status: detail.status,
        });
      } catch {
        notice.error(t('auth.apiManagement.feedback.detailLoadFailed'));
        setFormModalOpen(false);
      } finally {
        setDetailLoading(false);
      }
    },
    [form, service, notice, t],
  );

  const closeFormModal = useCallback(() => {
    setFormModalOpen(false);
    setEditingApiId(undefined);
    form.resetFields();
  }, [form]);

  const submitForm = useCallback(async () => {
    const values = await form.validateFields();

    setSubmitting(true);
    try {
      if (formMode === 'create') {
        const payload: CreateApiReq = {
          code: values.code.trim(),
          name: values.name.trim(),
          module: values.module,
          sort: values.sort,
          remark: values.remark?.trim(),
          status: values.status,
        };
        await service.createApi(payload);
        notice.success(t('auth.apiManagement.feedback.createSuccess'));
      } else if (editingApiId) {
        const payload: UpdateApiReq = {
          id: editingApiId,
          code: values.code.trim(),
          name: values.name.trim(),
          module: values.module,
          sort: values.sort,
          remark: values.remark?.trim(),
          status: values.status,
        };
        await service.updateApi(editingApiId, payload);
        notice.success(t('auth.apiManagement.feedback.updateSuccess'));
      }
      closeFormModal();
      // 登记数据变化会影响对账结果，递增版本触发对账页刷新。
      setDataVersion((version) => version + 1);
      await tableRef.current?.reload();
    } finally {
      setSubmitting(false);
    }
  }, [closeFormModal, editingApiId, form, formMode, service, notice, t]);

  return (
    <>
      <Tabs
        items={[
          {
            key: 'list',
            label: t('auth.apiManagement.tabs.list'),
            children: (
              <ApiTable
                ref={tableRef}
                service={service}
                onCreate={openCreateModal}
                onEdit={(record) => void openEditModal(record)}
              />
            ),
          },
          {
            key: 'reconciliation',
            label: t('auth.apiManagement.tabs.reconciliation'),
            children: <ApiReconciliationPanel service={service} version={dataVersion} />,
          },
        ]}
      />

      <ApiFormModal
        form={form}
        mode={formMode}
        open={formModalOpen}
        submitting={submitting}
        detailLoading={detailLoading}
        onSubmit={() => void submitForm()}
        onCancel={closeFormModal}
      />
    </>
  );
}

export default ApiManagementPage;
