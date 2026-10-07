import { Form, Input, InputNumber, Modal, Select } from 'antd';
import type { FormInstance } from 'antd';
import { useMemo } from 'react';
import { DictSelect } from '@/components/dict-select';
import { useNebulaI18n } from '@/hooks/use-nebula-i18n';
import type { ApiPermissionStatus } from '@/types/api-permission';

/** 所属模块复用基础模块（param）已内置的字典，不另建字典。 */
export const PARAM_MODULE_DICT_CODE = 'param_module';

export interface ApiFormValues {
  code: string;
  name: string;
  module?: string;
  sort?: number;
  remark?: string;
  status?: ApiPermissionStatus;
}

interface ApiFormModalProps {
  form: FormInstance<ApiFormValues>;
  mode: 'create' | 'update';
  open: boolean;
  submitting: boolean;
  detailLoading: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}

export function ApiFormModal({
  form,
  mode,
  open,
  submitting,
  detailLoading,
  onSubmit,
  onCancel,
}: ApiFormModalProps) {
  const { t } = useNebulaI18n();

  const statusOptions: Array<{ label: string; value: ApiPermissionStatus }> = useMemo(
    () => [
      { label: t('auth.apiManagement.status.enabled'), value: 1 },
      { label: t('auth.apiManagement.status.disabled'), value: 0 },
    ],
    [t],
  );

  return (
    <Modal
      title={mode === 'create'
        ? t('auth.apiManagement.modal.createTitle')
        : t('auth.apiManagement.modal.editTitle')}
      open={open}
      confirmLoading={submitting}
      okText={t('auth.apiManagement.actions.save')}
      cancelText={t('auth.apiManagement.actions.cancel')}
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
          label={t('auth.apiManagement.fields.code')}
          extra={t('auth.apiManagement.fields.codeHint')}
          rules={[{ required: true, message: t('auth.apiManagement.validation.codeRequired') }]}
        >
          <Input placeholder={t('auth.apiManagement.placeholders.code')} />
        </Form.Item>
        <Form.Item
          name="name"
          label={t('auth.apiManagement.fields.name')}
          rules={[{ required: true, message: t('auth.apiManagement.validation.nameRequired') }]}
        >
          <Input placeholder={t('auth.apiManagement.placeholders.name')} />
        </Form.Item>
        <Form.Item name="module" label={t('auth.apiManagement.fields.module')}>
          <DictSelect
            dictCode={PARAM_MODULE_DICT_CODE}
            placeholder={t('auth.apiManagement.placeholders.module')}
            showDisabled={false}
          />
        </Form.Item>
        <Form.Item name="sort" label={t('auth.apiManagement.fields.sort')}>
          <InputNumber min={0} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="remark" label={t('auth.apiManagement.fields.remark')}>
          <Input.TextArea
            rows={3}
            maxLength={200}
            showCount
            placeholder={t('auth.apiManagement.placeholders.remark')}
          />
        </Form.Item>
        <Form.Item name="status" label={t('auth.apiManagement.fields.status')}>
          <Select options={statusOptions} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
