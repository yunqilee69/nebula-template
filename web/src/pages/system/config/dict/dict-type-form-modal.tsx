import { Form, Input, Modal } from 'antd';
import { useCallback, useEffect } from 'react';
import { dictTypeI18n, getTypeFormTitle, useDictTypeI18n } from './dict-type-page.helpers';
import type { DictTypeFormState, DictTypeFormValues } from './dict-type-page.helpers';

interface DictTypeFormModalProps {
  readonly formState: DictTypeFormState;
  readonly initialValues?: Partial<DictTypeFormValues>;
  readonly open: boolean;
  readonly submitting: boolean;
  readonly onSubmit: (values: DictTypeFormValues) => void;
  readonly onCancel: () => void;
}

export function DictTypeFormModal({
  formState,
  initialValues,
  open,
  submitting,
  onSubmit,
  onCancel,
}: DictTypeFormModalProps) {
  const [form] = Form.useForm<DictTypeFormValues>();
  const t = useDictTypeI18n();

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    if (initialValues) form.setFieldsValue(initialValues);
  }, [form, initialValues, open]);

  const submitForm = useCallback(async () => {
    const values = await form.validateFields();
    onSubmit(values);
  }, [form, onSubmit]);

  return (
    <Modal
      title={getTypeFormTitle(formState, t)}
      open={open}
      confirmLoading={submitting}
      okText={t(dictTypeI18n.actions.save)}
      cancelText={t(dictTypeI18n.actions.cancel)}
      forceRender
      onOk={() => void submitForm()}
      onCancel={onCancel}
    >
      <Form form={form} name="dict-type-form" layout="vertical" disabled={submitting}>
        <Form.Item name="code" label={t(dictTypeI18n.fields.code)} rules={[{ required: true, message: t(dictTypeI18n.validation.codeRequired) }]}>
          <Input disabled={formState.mode === 'update'} placeholder={t(dictTypeI18n.placeholders.code)} />
        </Form.Item>
        <Form.Item name="name" label={t(dictTypeI18n.fields.name)} rules={[{ required: true, message: t(dictTypeI18n.validation.nameRequired) }]}>
          <Input placeholder={t(dictTypeI18n.placeholders.name)} />
        </Form.Item>
        <Form.Item name="remark" label={t(dictTypeI18n.fields.remark)}>
          <Input.TextArea rows={3} placeholder={t(dictTypeI18n.placeholders.remark)} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
