import { Form, Input, InputNumber, Modal, Select, Switch } from 'antd';
import type { FormInstance } from 'antd';
import { assertNever, dictI18n, useDictItemI18n } from './dict-item-modal.helpers';
import type { DictItemFormState, DictItemFormValues, DictItemSelectOption } from './dict-item-modal.helpers';

interface DictItemFormModalProps {
  readonly form: FormInstance<DictItemFormValues>;
  readonly formState: DictItemFormState;
  readonly open: boolean;
  readonly submitting: boolean;
  readonly parentOptions: DictItemSelectOption[];
  readonly onSubmit: () => void;
  readonly onCancel: () => void;
}

function getFormTitle(mode: DictItemFormState['mode'], t: ReturnType<typeof useDictItemI18n>) {
  switch (mode) {
    case 'create':
      return t(dictI18n.modal.createItemTitle);
    case 'update':
      return t(dictI18n.modal.editItemTitle);
    default:
      return assertNever(mode);
  }
}

export function DictItemFormModal({
  form,
  formState,
  open,
  submitting,
  parentOptions,
  onSubmit,
  onCancel,
}: DictItemFormModalProps) {
  const t = useDictItemI18n();

  return (
    <Modal
      title={getFormTitle(formState.mode, t)}
      open={open}
      confirmLoading={submitting}
      okText={t(dictI18n.actions.save)}
      cancelText={t(dictI18n.actions.cancel)}
      onOk={onSubmit}
      onCancel={onCancel}
    >
      <Form form={form} layout="vertical" disabled={submitting} initialValues={{ enabled: true, sort: 0 }}>
        <Form.Item name="parentId" label={t(dictI18n.fields.parentId)}>
          <Select allowClear options={parentOptions} placeholder={t(dictI18n.placeholders.parentId)} />
        </Form.Item>
        <Form.Item name="name" label={t(dictI18n.fields.name)} rules={[{ required: true, message: t(dictI18n.validation.nameRequired) }]}>
          <Input placeholder={t(dictI18n.placeholders.name)} />
        </Form.Item>
        <Form.Item
          name="itemValue"
          label={t(dictI18n.fields.itemValue)}
          rules={[{ required: true, message: t(dictI18n.validation.itemValueRequired) }]}
        >
          <Input placeholder={t(dictI18n.placeholders.itemValue)} />
        </Form.Item>
        <Form.Item name="sort" label={t(dictI18n.fields.sort)}>
          <InputNumber min={0} className="w-full" />
        </Form.Item>
        <Form.Item name="enabled" label={t(dictI18n.fields.status)} valuePropName="checked">
          <Switch checkedChildren={t(dictI18n.status.enabled)} unCheckedChildren={t(dictI18n.status.disabled)} />
        </Form.Item>
        <Form.Item name="tagColor" label={t(dictI18n.fields.tagColor)}>
          <Input placeholder={t(dictI18n.placeholders.tagColor)} />
        </Form.Item>
        <Form.Item name="remark" label={t(dictI18n.fields.remark)}>
          <Input.TextArea rows={3} placeholder={t(dictI18n.placeholders.remark)} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
