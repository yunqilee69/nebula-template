import { Button, Drawer, Form, Input, Select, Space } from 'antd';
import { useCallback, useEffect, useId, useMemo } from 'react';
import { useNebulaI18n } from '@/hooks/use-nebula-i18n';
import type { CreateOrgReq, EnableStatus, OrgOptionResp, OrgType, UpdateOrgReq } from '@/types/auth-management';

export interface OrgDrawerFormValues {
  name: string;
  code: string;
  parentId?: string;
  type: OrgType;
  status: EnableStatus;
}

interface OrgFormDrawerProps {
  open: boolean;
  title: string;
  initialValues?: Partial<OrgDrawerFormValues>;
  submitting: boolean;
  orgs: OrgOptionResp[];
  onClose: () => void;
  onSubmit: (values: OrgDrawerFormValues) => void;
}

function useSafeHtmlId(prefix: string) {
  const reactId = useId();
  return useMemo(() => `${prefix}-${reactId.replace(/:/g, '')}`, [reactId]);
}

export function OrgFormDrawer({
  open,
  title,
  initialValues,
  submitting,
  orgs,
  onClose,
  onSubmit,
}: OrgFormDrawerProps) {
  const [form] = Form.useForm<OrgDrawerFormValues>();
  const { t } = useNebulaI18n();
  const titleId = useSafeHtmlId('org-form-drawer-title');
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
    <Drawer
      title={title}
      open={open}
      onClose={onClose}
      destroyOnHidden
      aria-labelledby={titleId}
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
      <span
        id={titleId}
        style={{
          position: 'absolute',
          width: 1,
          height: 1,
          overflow: 'hidden',
          clip: 'rect(0 0 0 0)',
          whiteSpace: 'nowrap',
        }}
      >
        {title}
      </span>
      <Form form={form} layout="vertical" onFinish={handleFinish} disabled={submitting}>
        <Form.Item
          name="name"
          label={t('auth.orgManagement.fields.name')}
          htmlFor="org-drawer-name"
          rules={[{ required: true, message: t('auth.orgManagement.validation.nameRequired') }]}
        >
          <Input id="org-drawer-name" placeholder={t('auth.orgManagement.placeholders.name')} />
        </Form.Item>
        <Form.Item
          name="code"
          label={t('auth.orgManagement.fields.code')}
          htmlFor="org-drawer-code"
          rules={[{ required: true, message: t('auth.orgManagement.validation.codeRequired') }]}
        >
          <Input id="org-drawer-code" placeholder={t('auth.orgManagement.placeholders.code')} />
        </Form.Item>
        <Form.Item name="parentId" label={t('auth.orgManagement.fields.parentId')} htmlFor="org-drawer-parentId">
          <Select
            id="org-drawer-parentId"
            allowClear
            placeholder={t('auth.orgManagement.placeholders.parentId')}
            options={orgs.map((org) => ({ label: org.name, value: org.id }))}
          />
        </Form.Item>
        <Form.Item
          name="type"
          label={t('auth.orgManagement.fields.type')}
          htmlFor="org-drawer-type"
          rules={[{ required: true, message: t('auth.orgManagement.validation.typeRequired') }]}
        >
          <Select id="org-drawer-type" placeholder={t('auth.orgManagement.placeholders.type')} options={orgTypeOptions} />
        </Form.Item>
        <Form.Item name="status" label={t('auth.orgManagement.fields.status')} htmlFor="org-drawer-status">
          <Select id="org-drawer-status" options={enableStatusOptions} />
        </Form.Item>
      </Form>
    </Drawer>
  );
}

export function buildCreatePayload(values: OrgDrawerFormValues): CreateOrgReq {
  return {
    name: values.name,
    code: values.code,
    parentId: values.parentId,
    type: values.type,
    status: values.status,
  };
}

export function buildUpdatePayload(id: string, values: OrgDrawerFormValues): UpdateOrgReq {
  return {
    id,
    name: values.name,
    code: values.code,
    parentId: values.parentId,
    type: values.type,
    status: values.status,
  };
}
