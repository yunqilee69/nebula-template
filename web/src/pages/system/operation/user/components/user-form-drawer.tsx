import { Button, Drawer, Form, Input, Select, Space } from 'antd';
import { useCallback, useEffect, useId, useMemo } from 'react';
import { useNebulaI18n } from '@/hooks/use-nebula-i18n';
import type { OrgOptionResp, RoleOptionResp } from '@/types/auth-management';
import { createEnableStatusOptions, normalizeOptionalText, type UserDrawerFormValues } from './user-page-shared';

type UserFormMode = 'create' | 'update';

interface UserFormDrawerProps {
  open: boolean;
  title: string;
  mode: UserFormMode;
  initialValues?: Partial<UserDrawerFormValues>;
  submitting: boolean;
  roles: RoleOptionResp[];
  orgs: OrgOptionResp[];
  onClose: () => void;
  onSubmit: (values: UserDrawerFormValues) => void;
}

function useSafeHtmlId(prefix: string) {
  const reactId = useId();
  return useMemo(() => `${prefix}-${reactId.replace(/:/g, '')}`, [reactId]);
}

export function UserFormDrawer({
  open,
  title,
  mode,
  initialValues,
  submitting,
  roles,
  orgs,
  onClose,
  onSubmit,
}: UserFormDrawerProps) {
  const [form] = Form.useForm<UserDrawerFormValues>();
  const { t } = useNebulaI18n();
  const statusOptions = useMemo(() => createEnableStatusOptions(t), [t]);

  /*
   * Override the drawer panel's aria-labelledby because @rc-component/util's
   * useId returns a static "test-id" in test mode, colliding with other
   * AntD components (e.g. pagination). This provides a unique, React-safe
   * reference that resolves to the correct title element.
   */
  const titleId = useSafeHtmlId('user-form-drawer-title');

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
    (values: UserDrawerFormValues) => {
      const username = normalizeOptionalText(values.username);
      const password = mode === 'create' ? normalizeOptionalText(values.password) : undefined;
      const payload: UserDrawerFormValues = {
        username: username ?? '',
        password,
        nickname: normalizeOptionalText(values.nickname),
        email: normalizeOptionalText(values.email),
        phone: normalizeOptionalText(values.phone),
        status: values.status,
        roleIds: values.roleIds,
        orgIds: values.orgIds,
      };
      onSubmit(payload);
    },
    [mode, onSubmit],
  );

  return (
    <Drawer
      title={title}
      open={open}
      onClose={onClose}
      aria-labelledby={titleId}
      footer={
        <Space style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button onClick={onClose} disabled={submitting}>
            {t('auth.userManagement.actions.cancel')}
          </Button>
          <Button type="primary" loading={submitting} onClick={() => form.submit()}>
            {t('auth.userManagement.actions.save')}
          </Button>
        </Space>
      }
    >
      <span id={titleId} style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' }}>
        {title}
      </span>
      <Form form={form} layout="vertical" onFinish={handleFinish} disabled={submitting}>
        <Form.Item name="username" label={t('auth.userManagement.fields.username')} htmlFor="drawer-username" rules={[{ required: true, message: t('auth.userManagement.validation.usernameRequired') }]}>
          <Input id="drawer-username" placeholder={t('auth.userManagement.placeholders.username')} />
        </Form.Item>
        {mode === 'create' && (
          <Form.Item name="password" label={t('auth.userManagement.fields.password')} htmlFor="drawer-password" rules={[{ required: true, message: t('auth.userManagement.validation.passwordRequired') }]}>
            <Input.Password id="drawer-password" placeholder={t('auth.userManagement.placeholders.password')} />
          </Form.Item>
        )}
        <Form.Item name="nickname" label={t('auth.userManagement.fields.nickname')} htmlFor="drawer-nickname">
          <Input id="drawer-nickname" placeholder={t('auth.userManagement.placeholders.nickname')} />
        </Form.Item>
        <Form.Item name="email" label={t('auth.userManagement.fields.email')} htmlFor="drawer-email">
          <Input id="drawer-email" placeholder={t('auth.userManagement.placeholders.email')} />
        </Form.Item>
        <Form.Item name="phone" label={t('auth.userManagement.fields.phone')} htmlFor="drawer-phone">
          <Input id="drawer-phone" placeholder={t('auth.userManagement.placeholders.phone')} />
        </Form.Item>
        <Form.Item name="roleIds" label={t('auth.userManagement.fields.roles')} htmlFor="drawer-roleIds">
          <Select
            id="drawer-roleIds"
            mode="multiple"
            placeholder={t('auth.userManagement.placeholders.roles')}
            options={roles.map((r) => ({ label: r.name, value: r.id }))}
          />
        </Form.Item>
        <Form.Item name="orgIds" label={t('auth.userManagement.fields.orgs')} htmlFor="drawer-orgIds">
          <Select
            id="drawer-orgIds"
            mode="multiple"
            placeholder={t('auth.userManagement.placeholders.orgs')}
            options={orgs.map((o) => ({ label: o.name, value: o.id }))}
          />
        </Form.Item>
        <Form.Item name="status" label={t('auth.userManagement.fields.status')} htmlFor="drawer-status">
          <Select id="drawer-status" options={statusOptions} />
        </Form.Item>
      </Form>
    </Drawer>
  );
}
