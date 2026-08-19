import { Form, Input, InputNumber, Modal, Select } from 'antd';
import type { FormInstance } from 'antd';
import { useMemo } from 'react';
import { useNebulaI18n } from '@/hooks/use-nebula-i18n';
import type { ButtonStatus, ButtonType } from '@/types/menu';

export interface ButtonFormValues {
  code: string;
  name: string;
  type?: ButtonType;
  sort?: number;
  status?: ButtonStatus;
}

interface ButtonFormModalProps {
  form: FormInstance<ButtonFormValues>;
  mode: 'create' | 'update';
  open: boolean;
  submitting: boolean;
  detailLoading: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}

export function ButtonFormModal({
  form,
  mode,
  open,
  submitting,
  detailLoading,
  onSubmit,
  onCancel,
}: ButtonFormModalProps) {
  const { t } = useNebulaI18n();

  const modalTitle =
    mode === 'create'
      ? t('auth.buttonManagement.modal.createTitle')
      : t('auth.buttonManagement.modal.editTitle');

  const statusOptions: Array<{ label: string; value: ButtonStatus }> = [
    { label: t('auth.buttonManagement.status.enabled'), value: 1 },
    { label: t('auth.buttonManagement.status.disabled'), value: 0 },
  ];

  const buttonTypeOptions: Array<{ label: string; value: ButtonType }> = useMemo(
    () => [
      { label: t('auth.buttonManagement.buttonTypes.add'), value: 'add' },
      { label: t('auth.buttonManagement.buttonTypes.edit'), value: 'edit' },
      { label: t('auth.buttonManagement.buttonTypes.delete'), value: 'delete' },
      { label: t('auth.buttonManagement.buttonTypes.export'), value: 'export' },
    ],
    [t],
  );

  return (
    <Modal
      title={modalTitle}
      open={open}
      confirmLoading={submitting}
      okText={t('auth.buttonManagement.actions.save')}
      cancelText={t('auth.buttonManagement.actions.cancel')}
      onOk={onSubmit}
      onCancel={onCancel}
    >
      <Form
        form={form}
        layout="vertical"
        disabled={detailLoading}
        initialValues={{ status: 1, sort: 0 }}
      >
        <Form.Item
          name="code"
          label={t('auth.buttonManagement.fields.code')}
          rules={[
            { required: true, message: t('auth.buttonManagement.validation.codeRequired') },
          ]}
        >
          <Input placeholder={t('auth.buttonManagement.placeholders.code')} />
        </Form.Item>
        <Form.Item
          name="name"
          label={t('auth.buttonManagement.fields.name')}
          rules={[
            { required: true, message: t('auth.buttonManagement.validation.nameRequired') },
          ]}
        >
          <Input placeholder={t('auth.buttonManagement.placeholders.name')} />
        </Form.Item>
        <Form.Item name="type" label={t('auth.buttonManagement.fields.type')}>
          <Select
            allowClear
            options={buttonTypeOptions}
            placeholder={t('auth.buttonManagement.placeholders.type')}
          />
        </Form.Item>
        <Form.Item name="sort" label={t('auth.buttonManagement.fields.sort')}>
          <InputNumber min={0} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="status" label={t('auth.buttonManagement.fields.status')}>
          <Select options={statusOptions} />
        </Form.Item>
      </Form>
    </Modal>
  );
}