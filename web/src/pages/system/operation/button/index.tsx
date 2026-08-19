import { Flex, Form } from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNebulaI18n } from '@/hooks/use-nebula-i18n';
import { useNotice } from '@/hooks/use-notice';
import { menuService as defaultMenuService, type MenuService } from '@/api/menu';
import type { ButtonDetailResp, ButtonResp, CreateButtonReq, MenuTreeResp, UpdateButtonReq } from '@/types/menu';
import { ButtonFormModal, type ButtonFormValues } from './components/button-form-modal';
import { ButtonTable, type ButtonTableHandle } from './components/button-table';
import { MenuTreePanel } from './components/menu-tree-panel';

export interface ButtonManagementPageProps {
  service?: MenuService;
}

export function ButtonManagementPage({ service: serviceProp }: ButtonManagementPageProps) {
  const service = serviceProp ?? defaultMenuService;
  const { t } = useNebulaI18n();
  const notice = useNotice();
  const [form] = Form.useForm<ButtonFormValues>();

  const tableRef = useRef<ButtonTableHandle>(null);

  const [tree, setTree] = useState<MenuTreeResp[]>([]);
  const [selectedMenuId, setSelectedMenuId] = useState<string>();

  const [formModalOpen, setFormModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'update'>('create');
  const [editingButtonId, setEditingButtonId] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    service.getMenuTree().then(
      (data) => {
        if (!cancelled) setTree(data);
      },
      (error: unknown) => {
        if (!cancelled) {
          notice.error(t('auth.buttonManagement.feedback.treeLoadFailed'));
          console.error('Failed to load menu tree', error instanceof Error ? error.message : String(error));
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, [service, notice, t]);

  const handleMenuSelect = useCallback((menuId: string) => {
    setSelectedMenuId(menuId);
  }, []);

  const openCreateModal = useCallback(() => {
    setFormMode('create');
    setEditingButtonId(undefined);
    form.resetFields();
    form.setFieldsValue({ status: 1, sort: 0 });
    setFormModalOpen(true);
  }, [form]);

  const openEditModal = useCallback(
    async (record: ButtonResp) => {
      setFormMode('update');
      setEditingButtonId(record.id);
      form.resetFields();
      setFormModalOpen(true);
      setDetailLoading(true);
      try {
        const detail: ButtonDetailResp = await service.getButtonById(record.id);
        form.setFieldsValue({
          code: detail.code,
          name: detail.name,
          type: detail.type,
          sort: detail.sort,
          status: detail.status,
        });
      } catch {
        notice.error(t('auth.buttonManagement.feedback.detailLoadFailed'));
        setFormModalOpen(false);
      } finally {
        setDetailLoading(false);
      }
    },
    [form, service, notice, t],
  );

  const closeFormModal = useCallback(() => {
    setFormModalOpen(false);
    setEditingButtonId(undefined);
    form.resetFields();
  }, [form]);

  const submitForm = useCallback(async () => {
    if (!selectedMenuId) return;

    const values = await form.validateFields();

    setSubmitting(true);
    try {
      if (formMode === 'create') {
        const payload: CreateButtonReq = {
          menuId: selectedMenuId,
          code: values.code.trim(),
          name: values.name.trim(),
          type: values.type,
          sort: values.sort,
          status: values.status,
        };
        await service.createButton(payload);
        notice.success(t('auth.buttonManagement.feedback.createSuccess'));
      } else if (editingButtonId) {
        const payload: UpdateButtonReq = {
          id: editingButtonId,
          code: values.code.trim(),
          name: values.name.trim(),
          type: values.type,
          sort: values.sort,
          status: values.status,
        };
        await service.updateButton(editingButtonId, payload);
        notice.success(t('auth.buttonManagement.feedback.updateSuccess'));
      }
      closeFormModal();
      await tableRef.current?.reload();
    } finally {
      setSubmitting(false);
    }
  }, [closeFormModal, editingButtonId, form, formMode, selectedMenuId, service, notice, t]);

  return (
    <>
      <Flex gap={16} style={{ height: '100%', minHeight: 0, overflow: 'hidden' }}>
        <div style={{ flex: '0 0 280px', minHeight: 0, overflow: 'hidden' }}>
          <MenuTreePanel
            tree={tree}
            selectedKey={selectedMenuId}
            onSelect={handleMenuSelect}
          />
        </div>
        <div style={{ flex: 1, minWidth: 0, minHeight: 0 }}>
          <ButtonTable
            ref={tableRef}
            service={service}
            menuId={selectedMenuId}
            onCreate={openCreateModal}
            onEdit={(record) => void openEditModal(record)}
          />
        </div>
      </Flex>

      <ButtonFormModal
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

export default ButtonManagementPage;
