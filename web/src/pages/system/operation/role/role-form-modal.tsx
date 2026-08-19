import { Form, Input, Modal, Switch } from 'antd';
import type { FormInstance } from 'antd';
import { useNebulaI18n } from '@/hooks/use-nebula-i18n';
import type { RoleStatus } from '@/types/role';

export interface RoleFormValues {
  name: string;
  code: string;
  description?: string;
  status: RoleStatus;
}

export type RoleFormMode = 'create' | 'update';

export interface RoleFormModalProps {
  form: FormInstance<RoleFormValues>;
  mode: RoleFormMode;
  open: boolean;
  submitting: boolean;
  detailLoading: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}

export function RoleFormModal({
  form,
  mode,
  open,
  submitting,
  detailLoading,
  onSubmit,
  onCancel,
}: RoleFormModalProps) {
  const { t } = useNebulaI18n();
  const modalTitle = mode === 'create' ? t('auth.roleManagement.modal.createTitle') : t('auth.roleManagement.modal.editTitle');

  return (
    <Modal
      title={modalTitle}
      open={open}
      confirmLoading={submitting}
      okText={t('auth.roleManagement.actions.save')}
      cancelText={t('auth.roleManagement.actions.cancel')}
      onOk={onSubmit}
      onCancel={onCancel}
    >
      <Form form={form} layout="vertical" disabled={detailLoading} initialValues={{ status: 1 }}>
        <Form.Item name="name" label={t('auth.roleManagement.fields.name')} rules={[{ required: true, message: t('auth.roleManagement.validation.nameRequired') }, { min: 2, max: 20, message: t('auth.roleManagement.validation.nameLength') }]}>
          <Input placeholder={t('auth.roleManagement.placeholders.formName')} />
        </Form.Item>
        <Form.Item name="code" label={t('auth.roleManagement.fields.code')} rules={[{ required: true, message: t('auth.roleManagement.validation.codeRequired') }, { min: 2, max: 30, message: t('auth.roleManagement.validation.codeLength') }]}>
          <Input placeholder={t('auth.roleManagement.placeholders.formCode')} />
        </Form.Item>
        <Form.Item
          name="status"
          label={t('auth.roleManagement.fields.status')}
          getValueProps={(value: RoleStatus | undefined) => ({ checked: value === 1 })}
          getValueFromEvent={(checked: boolean) => (checked ? 1 : 0)}
        >
          <Switch
            checkedChildren={t('auth.roleManagement.status.enabled')}
            unCheckedChildren={t('auth.roleManagement.status.disabled')}
          />
        </Form.Item>
        <Form.Item name="description" label={t('auth.roleManagement.fields.description')}>
          <Input.TextArea rows={3} placeholder={t('auth.roleManagement.placeholders.description')} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
