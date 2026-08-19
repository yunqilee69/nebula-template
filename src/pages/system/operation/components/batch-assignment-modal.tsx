import { Button, Flex, Form, Modal, Select, Typography } from 'antd';
import { useEffect, useMemo } from 'react';
import { useNebulaI18n } from '@/hooks/use-nebula-i18n';
import type { BatchUpdateUserAssignmentsReq, OrgOptionResp, RoleOptionResp } from '@/types/auth-management';

export type BatchAssignmentMode = 'roles' | 'orgs' | 'both';

interface BatchAssignmentModalProps {
  readonly open: boolean;
  readonly selectedUserIds: readonly string[];
  readonly selectedUserNames?: readonly string[];
  readonly roles: readonly RoleOptionResp[];
  readonly orgs: readonly OrgOptionResp[];
  readonly submitting: boolean;
  readonly mode?: BatchAssignmentMode;
  readonly onSubmit: (data: BatchUpdateUserAssignmentsReq) => Promise<void>;
  readonly onCancel: () => void;
}

interface BatchAssignmentFormValues {
  readonly roleIds?: string[];
  readonly orgIds?: string[];
}

interface FormValidationError {
  readonly errorFields: unknown;
}

function isFormValidationError(error: unknown): error is FormValidationError {
  return typeof error === 'object' && error !== null && 'errorFields' in error;
}

function resolveAssignmentIds(selectedIds: readonly string[] | undefined) {
  if (selectedIds && selectedIds.length > 0) return selectedIds;
  return null;
}

export function BatchAssignmentModal({
  open,
  selectedUserIds,
  selectedUserNames = [],
  roles,
  orgs,
  submitting,
  mode = 'both',
  onSubmit,
  onCancel,
}: BatchAssignmentModalProps) {
  const { t } = useNebulaI18n();
  const [form] = Form.useForm<BatchAssignmentFormValues>();

  useEffect(() => {
    if (open) {
      form.resetFields();
    }
  }, [form, open]);

  const roleOptions = useMemo(() => roles.map((role) => ({ label: role.name, value: role.id })), [roles]);
  const orgOptions = useMemo(() => orgs.map((org) => ({ label: org.name, value: org.id })), [orgs]);
  const showRoles = mode !== 'orgs';
  const showOrgs = mode !== 'roles';
  const selectedUsersText = t('auth.assignment.selectedUsers').replace('{count}', String(selectedUserIds.length));
  const selectedUserNamesText = selectedUserNames.join('、');

  async function submit() {
    let values: BatchAssignmentFormValues;
    try {
      values = await form.validateFields();
    } catch (error: unknown) {
      if (isFormValidationError(error)) return;
      throw error;
    }
    await onSubmit({
      userIds: selectedUserIds,
      roleIds: showRoles ? resolveAssignmentIds(values.roleIds) : null,
      orgIds: showOrgs ? resolveAssignmentIds(values.orgIds) : null,
      operation: 'ADD',
    });
  }

  return (
    <Modal
      open={open}
      title={t('auth.assignment.title')}
      onCancel={onCancel}
      destroyOnHidden
      footer={[
        <Button key="cancel" onClick={onCancel} disabled={submitting}>
          {t('auth.userManagement.actions.cancel')}
        </Button>,
        <Button key="submit" type="primary" loading={submitting} onClick={() => void submit()}>
          {t('auth.assignment.actions.assign')}
        </Button>,
      ]}
    >
      <Flex vertical gap="middle" style={{ width: '100%' }}>
        <Typography.Text type="secondary">
          {selectedUserNamesText ? `${selectedUsersText}: ${selectedUserNamesText}` : selectedUsersText}
        </Typography.Text>
        <Form form={form} layout="vertical" disabled={submitting}>
          {showRoles && (
            <Form.Item
              name="roleIds"
              label={t('auth.assignment.fields.roles')}
              extra={mode === 'roles' ? undefined : t('auth.assignment.hints.noRoleChange')}
              rules={mode === 'roles' ? [{ required: true, message: t('auth.assignment.validation.rolesRequired') }] : undefined}
            >
              <Select mode="multiple" allowClear options={roleOptions} placeholder={t('auth.assignment.placeholders.roles')} />
            </Form.Item>
          )}
          {showOrgs && (
            <Form.Item name="orgIds" label={t('auth.assignment.fields.orgs')} extra={t('auth.assignment.hints.noOrgChange')}>
              <Select mode="multiple" allowClear options={orgOptions} placeholder={t('auth.assignment.placeholders.orgs')} />
            </Form.Item>
          )}
        </Form>
      </Flex>
    </Modal>
  );
}
