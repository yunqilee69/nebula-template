import { App, Alert, Form, Input, Modal, Space, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { tenantApi } from '@/api/tenants';
import { buildTenantEntryUrl } from '@/lib/tenant-entry';
import type { Tenant } from '@/types';

interface InviteMemberModalProps {
  tenant: Tenant | null;
  open: boolean;
  onClose: () => void;
}

interface InviteFormValues {
  email?: string;
  phone?: string;
}

export function InviteMemberModal({ tenant, open, onClose }: InviteMemberModalProps) {
  const { message } = App.useApp();
  const [form] = Form.useForm<InviteFormValues>();
  const [submitting, setSubmitting] = useState(false);
  const [invitationToken, setInvitationToken] = useState('');

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    setInvitationToken('');
  }, [form, open]);

  const submit = async () => {
    if (!tenant) return;
    const values = await form.validateFields();
    if (!values.email && !values.phone) {
      message.warning('请至少填写邀请邮箱或手机号');
      return;
    }

    setSubmitting(true);
    try {
      const created = await tenantApi.createInvitation(tenant.id, values);
      setInvitationToken(created.token ?? '');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '生成邀请失败');
    } finally {
      setSubmitting(false);
    }
  };

  const close = () => {
    setInvitationToken('');
    form.resetFields();
    onClose();
  };

  const entryUrl = tenant ? buildTenantEntryUrl(tenant.code) : null;
  const inviteUrl = entryUrl && invitationToken
    ? `${entryUrl.replace(/\/$/, '')}/invitations/accept?token=${encodeURIComponent(invitationToken)}`
    : '';

  return (
    <Modal
      title={`邀请成员${tenant ? ` · ${tenant.name}` : ''}`}
      open={open}
      confirmLoading={submitting}
      okText={invitationToken ? '关闭' : '生成邀请'}
      onOk={() => {
        if (invitationToken) {
          close();
          return;
        }
        void submit();
      }}
      onCancel={close}
      destroyOnHidden
    >
      {invitationToken ? (
        <Alert
          type="success"
          showIcon
          title="邀请已生成"
          description={(
            <Space direction="vertical" style={{ width: '100%' }} size={8}>
              <Typography.Text>令牌 7 天内有效，仅在本次展示，请通过可信渠道交付给受邀人：</Typography.Text>
              <Typography.Paragraph copyable={{ text: invitationToken }} style={{ wordBreak: 'break-all', marginBottom: 0 }}>
                {invitationToken}
              </Typography.Paragraph>
              {inviteUrl ? (
                <>
                  <Typography.Text>邀请链接：</Typography.Text>
                  <Typography.Paragraph copyable={{ text: inviteUrl }} style={{ wordBreak: 'break-all', marginBottom: 0 }}>
                    {inviteUrl}
                  </Typography.Paragraph>
                </>
              ) : (
                <Typography.Text type="secondary">
                  未配置企业入口地址模板，令牌交付后请让受邀人前往对应企业入口完成接受。
                </Typography.Text>
              )}
            </Space>
          )}
        />
      ) : (
        <Form form={form} layout="vertical">
          <Form.Item label="受邀人" required>
            <Typography.Text type="secondary">至少填写邮箱或手机号其中一项。</Typography.Text>
          </Form.Item>
          <Form.Item name="email" label="邮箱" rules={[{ type: 'email', message: '邮箱格式不正确' }]}>
            <Input placeholder="member@acme.com" />
          </Form.Item>
          <Form.Item name="phone" label="手机号">
            <Input placeholder="手机号" />
          </Form.Item>
        </Form>
      )}
    </Modal>
  );
}
