import { Alert, Button, Form, Input, Modal, Select, Space, Typography } from 'antd';
import { useEffect } from 'react';
import type { CreateTenantInvitationReq } from '@/api/auth-management';
import { useNebulaI18n } from '@/hooks/use-nebula-i18n';
import type { TenantInvitation } from '@/types/auth';
import type { OrgOptionResp, RoleOptionResp } from '@/types/auth-management';
import { buildInvitationUrl, getTenantCode } from '@/utils/tenant/tenant-host';

interface InviteMemberModalProps {
  open: boolean;
  roles: RoleOptionResp[];
  orgs: OrgOptionResp[];
  submitting: boolean;
  invitation: TenantInvitation | null;
  onCancel: () => void;
  onSubmit: (values: CreateTenantInvitationReq) => void;
}

/**
 * 邀请成员。
 *
 * <p>邀请只创建租户内账号，不创建平台账号；被邀请人首次登录时仍按多租户规则绑定平台账号。</p>
 */
export function InviteMemberModal({
  open,
  roles,
  orgs,
  submitting,
  invitation,
  onCancel,
  onSubmit,
}: InviteMemberModalProps) {
  const { t } = useNebulaI18n();
  const [form] = Form.useForm<CreateTenantInvitationReq>();

  useEffect(() => {
    if (open && !invitation) {
      form.resetFields();
    }
  }, [form, invitation, open]);

  const invitationUrl = invitation?.token
    ? buildInvitationUrl(invitation.token, getTenantCode() ?? '')
    : '';

  return (
    <Modal
      open={open}
      title={t('auth.userManagement.invite.title')}
      okButtonProps={{ style: { display: 'none' } }}
      cancelText={t('auth.userManagement.invite.close')}
      onCancel={onCancel}
      forceRender
      destroyOnHidden
    >
      {invitation ? (
        <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
          <Alert type="success" showIcon title={t('auth.userManagement.feedback.inviteSuccess')} />
          <Typography.Text type="secondary">{t('auth.userManagement.invite.tokenHint')}</Typography.Text>
          <div>
            <Typography.Text strong>{t('auth.userManagement.invite.tokenLabel')}</Typography.Text>
            <Typography.Paragraph copyable={{ text: invitation.token ?? '' }} style={{ marginBottom: 8, wordBreak: 'break-all' }}>
              {invitation.token}
            </Typography.Paragraph>
            <Typography.Text strong>{t('auth.userManagement.invite.linkLabel')}</Typography.Text>
            <Typography.Paragraph copyable={{ text: invitationUrl }} style={{ marginBottom: 0, wordBreak: 'break-all' }}>
              {invitationUrl}
            </Typography.Paragraph>
          </div>
        </Space>
      ) : (
        <Form<CreateTenantInvitationReq> form={form} layout="vertical" onFinish={onSubmit}>
          <Typography.Paragraph type="secondary">
            {t('auth.userManagement.invite.description')}
          </Typography.Paragraph>
          <Form.Item
            label={t('auth.userManagement.fields.email')}
            name="email"
            rules={[
              { type: 'email', message: t('auth.userManagement.invite.emailInvalid') },
              ({ getFieldValue }) => ({
                validator: (_, value: string | undefined) =>
                  value || getFieldValue('phone')
                    ? Promise.resolve()
                    : Promise.reject(new Error(t('auth.userManagement.invite.emailOrPhoneRequired'))),
              }),
            ]}
          >
            <Input placeholder={t('auth.userManagement.placeholders.email')} />
          </Form.Item>
          <Form.Item
            label={t('auth.userManagement.fields.phone')}
            name="phone"
            rules={[
              ({ getFieldValue }) => ({
                validator: (_, value: string | undefined) =>
                  value || getFieldValue('email')
                    ? Promise.resolve()
                    : Promise.reject(new Error(t('auth.userManagement.invite.emailOrPhoneRequired'))),
              }),
            ]}
          >
            <Input placeholder={t('auth.userManagement.placeholders.phone')} />
          </Form.Item>
          <Form.Item label={t('auth.userManagement.fields.roles')} name="roleId">
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder={t('auth.userManagement.placeholders.roles')}
              options={roles.map((role) => ({ value: role.id, label: role.name }))}
            />
          </Form.Item>
          <Form.Item label={t('auth.userManagement.fields.orgs')} name="orgId">
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder={t('auth.userManagement.placeholders.orgs')}
              options={orgs.map((org) => ({ value: org.id, label: org.name }))}
            />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={submitting} block>
            {t('auth.userManagement.invite.submit')}
          </Button>
        </Form>
      )}
    </Modal>
  );
}
