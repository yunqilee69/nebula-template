import { Alert, Button, Flex, Form, Input, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AuthShell } from '@/layouts/auth-shell';
import { personService } from '@/api/person';
import { applyTenantCodeFromUrl } from '@/utils/tenant/tenant-host';

interface AcceptInvitationFormValues {
  token: string;
  username: string;
  password: string;
  displayName?: string;
}

export function AcceptInvitationPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [form] = Form.useForm<AcceptInvitationFormValues>();

  // 裸域名下的邀请链接会带 ?tenantCode=，接受邀请前先保存，保证业务请求落到正确租户。
  useEffect(() => {
    applyTenantCodeFromUrl();
  }, []);

  const handleSubmit = async (values: AcceptInvitationFormValues) => {
    setSubmitting(true);
    setError(null);
    try {
      await personService.acceptTenantInvitation(values);
      setAccepted(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '接受邀请失败，请稍后重试。');
    } finally {
      setSubmitting(false);
    }
  };

  if (accepted) {
    return (
      <AuthShell>
        <Flex vertical gap={16}>
          <Alert
            type="success"
            showIcon
            title="邀请已接受"
            description="账号已创建。首次登录需要关联平台账号，请使用刚设置的租户用户名和密码登录。"
          />
          <Button type="primary" block onClick={() => navigate('/login', { replace: true })}>
            前往登录
          </Button>
        </Flex>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <Flex vertical gap={16}>
        <div>
          <Typography.Title level={3} style={{ marginBottom: 4 }}>接受企业邀请</Typography.Title>
          <Typography.Text type="secondary">
            邀请令牌由企业管理员线下交付，接受后将创建你在该企业的账号。
          </Typography.Text>
        </div>
        {error ? <Alert type="error" showIcon title={error} /> : null}
        <Form
          form={form}
          layout="vertical"
          initialValues={{ token: searchParams.get('token') ?? '' }}
          onFinish={handleSubmit}
        >
          <Form.Item name="token" label="邀请令牌" rules={[{ required: true, message: '请输入邀请令牌' }]}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="username" label="企业用户名" rules={[{ required: true, message: '请输入企业用户名' }]}>
            <Input autoComplete="username" />
          </Form.Item>
          <Form.Item name="displayName" label="显示名称">
            <Input />
          </Form.Item>
          <Form.Item name="password" label="登录密码" rules={[{ required: true, message: '请输入登录密码' }]}>
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={submitting} block>
            接受邀请
          </Button>
        </Form>
      </Flex>
    </AuthShell>
  );
}
