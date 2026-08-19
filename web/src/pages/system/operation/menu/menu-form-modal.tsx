import { useCallback, useMemo } from 'react';
import { Cascader, Checkbox, Col, Form, Input, InputNumber, Modal, Row, Select, Switch } from 'antd';
import type { FormInstance } from 'antd';
import { useNebulaI18n } from '@/hooks/use-nebula-i18n';
import type { MenuStatus, MenuType } from '@/types/menu';

export interface MenuFormValues {
  parentPath: string[];
  code: string;
  name: string;
  path?: string;
  icon?: string;
  component?: string;
  type: MenuType;
  sort: number;
  status: MenuStatus;
  hidden: boolean;
  externalUrl?: string;
  visibleInBreadcrumb: boolean;
  visibleInTab: boolean;
  activeMenuPath?: string;
  remark?: string;
}

export interface MenuComponentOption {
  label: string;
  value: string;
  defaultName?: string;
  defaultPath?: string;
  defaultCode?: string;
  defaultIcon?: string;
}

export interface MenuParentOption {
  label: string;
  value: string;
  disabled?: boolean;
  children?: MenuParentOption[];
}

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export type MenuFormMode = 'create' | 'update';

export interface MenuFormModalProps {
  form: FormInstance<MenuFormValues>;
  mode: MenuFormMode;
  open: boolean;
  submitting: boolean;
  detailLoading: boolean;
  parentOptions: MenuParentOption[];
  componentOptions?: MenuComponentOption[];
  onSubmit: () => void;
  onCancel: () => void;
}

export function MenuFormModal({
  form,
  mode,
  open,
  submitting,
  detailLoading,
  parentOptions,
  componentOptions = [],
  onSubmit,
  onCancel,
}: MenuFormModalProps) {
  const { t } = useNebulaI18n();
  const modalTitle =
    mode === 'create'
      ? t('auth.menuManagement.modal.createTitle')
      : t('auth.menuManagement.modal.editTitle');

  const statusOptions: Array<{ label: string; value: MenuStatus }> = [
    { label: t('auth.menuManagement.status.enabled'), value: 1 },
    { label: t('auth.menuManagement.status.disabled'), value: 0 },
  ];

  const menuTypeOptions = useMemo<
    Array<{ label: string; value: MenuType }>
  >(() => [
    { label: t('auth.menuManagement.types.catalog'), value: 'CATALOG' },
    { label: t('auth.menuManagement.types.menu'), value: 'MENU' },
    { label: t('auth.menuManagement.types.iframe'), value: 'IFRAME' },
    { label: t('auth.menuManagement.types.external'), value: 'EXTERNAL' },
  ], [t]);

  const typeValue = Form.useWatch('type', form);
  const isExternalType = typeValue === 'EXTERNAL';

  const fillEmptyField = useCallback(
    (field: keyof MenuFormValues, value: string | undefined) => {
      if (!value) return;
      const currentValue = form.getFieldValue(field);
      if (typeof currentValue === 'string' && currentValue.trim()) return;
      if (currentValue !== undefined && currentValue !== null && currentValue !== '') return;
      form.setFieldValue(field, value);
    },
    [form],
  );

  const handleComponentChange = useCallback(
    (value: string | undefined) => {
      const option = componentOptions.find((item) => item.value === value);
      if (!option) return;
      fillEmptyField('name', option.defaultName);
      fillEmptyField('code', option.defaultCode);
      fillEmptyField('path', option.defaultPath);
      fillEmptyField('icon', option.defaultIcon);
    },
    [componentOptions, fillEmptyField],
  );

  return (
    <Modal
      title={modalTitle}
      open={open}
      width={860}
      confirmLoading={submitting}
      okText={t('auth.menuManagement.actions.save')}
      cancelText={t('auth.menuManagement.actions.cancel')}
      onOk={onSubmit}
      onCancel={onCancel}
    >
      <Form
        form={form}
        layout="vertical"
        disabled={detailLoading}
        initialValues={{
          parentPath: ['0'],
          type: 'MENU',
          sort: 0,
          status: 1,
          hidden: false,
          visibleInBreadcrumb: true,
          visibleInTab: true,
        }}
      >
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="parentPath"
              label={t('auth.menuManagement.fields.parentId')}
            >
              <Cascader
                changeOnSelect
                showSearch
                options={parentOptions}
                placeholder={t('auth.menuManagement.placeholders.parentId')}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="type"
              label={t('auth.menuManagement.fields.type')}
              rules={[{ required: true, message: t('auth.menuManagement.validation.typeRequired') }]}
            >
              <Select
                options={menuTypeOptions}
                placeholder={t('auth.menuManagement.placeholders.type')}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="component"
              label={t('auth.menuManagement.fields.component')}
            >
              <Select
                allowClear
                showSearch
                options={componentOptions}
                optionFilterProp="label"
                placeholder={t('auth.menuManagement.placeholders.component')}
                onSelect={handleComponentChange}
                filterOption={(input, option) => {
                  const label = typeof option?.label === 'string' ? option.label : '';
                  const value = typeof option?.value === 'string' ? option.value : '';
                  return `${label} ${value}`.toLowerCase().includes(input.toLowerCase());
                }}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="name"
              label={t('auth.menuManagement.fields.name')}
              rules={[
                { required: true, message: t('auth.menuManagement.validation.nameRequired') },
                { min: 2, max: 20, message: t('auth.menuManagement.validation.nameLength') },
              ]}
            >
              <Input placeholder={t('auth.menuManagement.placeholders.name')} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="code"
              label={t('auth.menuManagement.fields.code')}
              rules={[
                { required: true, message: t('auth.menuManagement.validation.codeRequired') },
                { min: 2, max: 30, message: t('auth.menuManagement.validation.codeLength') },
              ]}
            >
              <Input placeholder={t('auth.menuManagement.placeholders.code')} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="path"
              label={t('auth.menuManagement.fields.path')}
            >
              <Input placeholder={t('auth.menuManagement.placeholders.path')} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="icon"
              label={t('auth.menuManagement.fields.icon')}
            >
              <Input placeholder={t('auth.menuManagement.placeholders.icon')} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="sort"
              label={t('auth.menuManagement.fields.sort')}
            >
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="status"
              label={t('auth.menuManagement.fields.status')}
              rules={[{ required: true, message: t('auth.menuManagement.validation.statusRequired') }]}
            >
              <Select options={statusOptions} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="hidden"
              label={t('auth.menuManagement.fields.hidden')}
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="visibleInBreadcrumb"
              label={t('auth.menuManagement.fields.visibleInBreadcrumb')}
              valuePropName="checked"
            >
              <Checkbox />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="visibleInTab"
              label={t('auth.menuManagement.fields.visibleInTab')}
              valuePropName="checked"
            >
              <Checkbox />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="activeMenuPath"
              label={t('auth.menuManagement.fields.activeMenuPath')}
            >
              <Input />
            </Form.Item>
          </Col>
          {isExternalType && (
            <Col span={24}>
              <Form.Item
                name="externalUrl"
                label={t('auth.menuManagement.fields.externalUrl')}
                rules={[
                  { required: true, message: t('auth.menuManagement.validation.externalUrlRequired') },
                  {
                    validator: (_, value: string | undefined) => {
                      if (!value || isValidHttpUrl(value)) return Promise.resolve();
                      return Promise.reject(new Error(t('auth.menuManagement.validation.externalUrlFormat')));
                    },
                  },
                ]}
              >
                <Input placeholder={t('auth.menuManagement.placeholders.externalUrl')} />
              </Form.Item>
            </Col>
          )}
          <Col span={24}>
            <Form.Item
              name="remark"
              label={t('auth.menuManagement.fields.remark')}
            >
              <Input.TextArea rows={3} placeholder={t('auth.menuManagement.placeholders.remark')} />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
}
