import { Button, Form, Input, Modal, Select, Space } from 'antd';
import { useCallback, useEffect } from 'react';
import { useNebulaI18n } from '@/hooks/use-nebula-i18n';
import type { EnableStatus, OrgOptionResp, OrgType } from '@/types/auth-management';
import type { OrgDrawerFormValues } from './org-form-drawer';

interface OrgFormModalProps {
  open: boolean;
  title: string;
  initialValues?: Partial<OrgDrawerFormValues>;
  submitting: boolean;
  orgs: OrgOptionResp[];
  onClose: () => void;
  onSubmit: (values: OrgDrawerFormValues) => void;
}

export function OrgFormModal({
  open,
  title,
  initialValues,
  submitting,
  orgs,
  onClose,
  onSubmit,
}: OrgFormModalProps) {
  const [form] = Form.useForm<OrgDrawerFormValues>();
  const { t } = useNebulaI18n();
  const orgTypeOptions: Array<{ label: string; value: OrgType }> = [
    { label: t('auth.orgManagement.types.company'), value: 'COMPANY' },
    { label: t('auth.orgManagement.types.department'), value: 'DEPARTMENT' },
    { label: t('auth.orgManagement.types.team'), value: 'TEAM' },
  ];
  const enableStatusOptions: Array<{ label: string; value: EnableStatus }> = [
    { label: t('auth.orgManagement.status.enabled'), value: 1 },
    { label: t('auth.orgManagement.status.disabled'), value: 0 },
  ];

  useEffect(() => {
    if (open) {
      form.resetFields();
      if (initialValues) {
        form.setFieldsValue(initialValues);
      } else {
        form.setFieldsValue({ status: 1 });
      }
    }
  }, [open, form, initialValues]);

  const handleFinish = useCallback(
    (values: OrgDrawerFormValues) => {
      const payload: OrgDrawerFormValues = {
        name: values.name.trim(),
        code: values.code.trim(),
        parentId: values.parentId?.trim() || undefined,
        type: values.type,
        status: values.status,
      };
      onSubmit(payload);
    },
    [onSubmit],
  );

  return (
    <Modal
      title={title}
      open={open}
      onCancel={onClose}
      forceRender
      footer={
        <Space style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button onClick={onClose} disabled={submitting}>
            {t('auth.orgManagement.actions.cancel')}
          </Button>
          <Button type="primary" loading={submitting} onClick={() => form.submit()}>
            {t('auth.orgManagement.actions.save')}
          </Button>
        </Space>
      }
    >
      <Form form={form} layout="vertical" onFinish={handleFinish} disabled={submitting}>
        <Form.Item
          name="name"
          label={t('auth.orgManagement.fields.name')}
          htmlFor="org-modal-name"
          rules={[{ required: true, message: t('auth.orgManagement.validation.nameRequired') }]}
        >
          <Input id="org-modal-name" placeholder={t('auth.orgManagement.placeholders.name')} />
        </Form.Item>
        <Form.Item
          name="code"
          label={t('auth.orgManagement.fields.code')}
          htmlFor="org-modal-code"
          rules={[{ required: true, message: t('auth.orgManagement.validation.codeRequired') }]}
        >
          <Input id="org-modal-code" placeholder={t('auth.orgManagement.placeholders.code')} />
        </Form.Item>
        <Form.Item name="parentId" label={t('auth.orgManagement.fields.parentId')} htmlFor="org-modal-parentId">
          <Select
            id="org-modal-parentId"
            allowClear
            placeholder={t('auth.orgManagement.placeholders.parentId')}
            options={orgs.map((org) => ({ label: org.name, value: org.id }))}
          />
        </Form.Item>
        <Form.Item
          name="type"
          label={t('auth.orgManagement.fields.type')}
          htmlFor="org-modal-type"
          rules={[{ required: true, message: t('auth.orgManagement.validation.typeRequired') }]}
        >
          <Select id="org-modal-type" placeholder={t('auth.orgManagement.placeholders.type')} options={orgTypeOptions} />
        </Form.Item>
        <Form.Item name="status" label={t('auth.orgManagement.fields.status')} htmlFor="org-modal-status">
          <Select id="org-modal-status" options={enableStatusOptions} />
        </Form.Item>
      </Form>
    </Modal>
  );
}