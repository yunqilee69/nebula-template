import { Alert, Button, Flex, Form, Input, Radio, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthShell } from '@/layouts/auth-shell';
import { bindingService } from '@/api/person';
import { saveAuthTokens } from '@/utils/auth/token-session';
import { useAuthStore } from '@/stores/auth-store';
import { toCurrentUser } from '@/utils/auth/current-user';
import { authService } from '@/api/auth';
import type { CompleteBindingReq } from '@/types/auth';
import { clearBindingChallenge, readBindingChallenge } from '../binding-challenge';

interface BindingFormValues {
  action: 'CREATE_NEW' | 'BIND_EXISTING';
  username?: string;
  displayName?: string;
  password?: string;
  account?: string;
  credential?: string;
}

const reasonText: Record<string, string> = {
  NO_LINK: '当前租户账号尚未关联平台账号，完成关联后才能进入系统。',
  LINK_REVOKED: '平台账号关联已被解除，需要重新建立关联。',
  LINK_PENDING: '平台账号关联正在等待管理员审批。',
};

export function BindingPage() {
  const navigate = useNavigate();
  const setUser = useAuthStore((state) => state.setUser);
  const [challenge] = useState(() => readBindingChallenge());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form] = Form.useForm<BindingFormValues>();
  const action = Form.useWatch('action', form) ?? 'CREATE_NEW';

  useEffect(() => {
    if (!challenge) {
      navigate('/login', { replace: true });
    }
  }, [challenge, navigate]);

  const handleSubmit = async (values: BindingFormValues) => {
    if (!challenge?.bindingTicket) return;
    setSubmitting(true);
    setError(null);
    try {
      const payload: CompleteBindingReq = values.action === 'BIND_EXISTING'
        ? {
            bindingTicket: challenge.bindingTicket,
            action: values.action,
            account: values.account,
            credential: values.credential,
          }
        : {
            bindingTicket: challenge.bindingTicket,
            action: values.action,
            username: values.username,
            displayName: values.displayName,
            password: values.password,
          };
      const result = await bindingService.complete(payload);
      if (!result.accessToken) {
        setError('关联仍待管理员审批，请审批通过后重新登录。');
        return;
      }
      saveAuthTokens(result);
      clearBindingChallenge();
      const currentUser = await authService.getCurrentUser();
      setUser(toCurrentUser(currentUser));
      navigate('/', { replace: true });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '绑定失败，请稍后重试。');
    } finally {
      setSubmitting(false);
    }
  };

  if (!challenge) return null;

  if (challenge.pendingApproval || !challenge.bindingTicket) {
    return (
      <AuthShell>
        <Alert
          type="info"
          showIcon
          title="等待管理员审批"
          description="当前账号的平台账号关联申请已提交，管理员审批通过后即可登录。"
        />
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <Flex vertical gap={16}>
        <div>
          <Typography.Title level={3} style={{ marginBottom: 4 }}>关联平台账号</Typography.Title>
          <Typography.Text type="secondary">
            {reasonText[challenge.bindingReason] ?? '首次进入需要关联平台账号。'}
          </Typography.Text>
        </div>
        {error ? <Alert type="error" showIcon title={error} /> : null}
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            action: 'CREATE_NEW',
            username: challenge.proposedUsername,
            displayName: challenge.proposedDisplayName,
          }}
          onFinish={handleSubmit}
        >
          <Form.Item name="action" label="关联方式">
            <Radio.Group>
              <Radio.Button value="CREATE_NEW">创建新平台账号</Radio.Button>
              <Radio.Button value="BIND_EXISTING">绑定已有平台账号</Radio.Button>
            </Radio.Group>
          </Form.Item>
          {action === 'CREATE_NEW' ? (
            <>
              <Form.Item name="username" label="平台用户名" rules={[{ required: true, message: '请输入平台用户名' }]}>
                <Input autoComplete="username" />
              </Form.Item>
              <Form.Item name="displayName" label="显示名称">
                <Input />
              </Form.Item>
              <Form.Item name="password" label="平台密码" rules={[{ required: true, message: '请输入平台密码' }]}>
                <Input.Password autoComplete="new-password" />
              </Form.Item>
            </>
          ) : (
            <>
              <Form.Item name="account" label="已有平台用户名" rules={[{ required: true, message: '请输入平台用户名' }]}>
                <Input autoComplete="username" />
              </Form.Item>
              <Form.Item name="credential" label="平台密码" rules={[{ required: true, message: '请输入平台密码' }]}>
                <Input.Password autoComplete="current-password" />
              </Form.Item>
            </>
          )}
          <Button type="primary" htmlType="submit" loading={submitting} block>
            完成关联
          </Button>
        </Form>
      </Flex>
    </AuthShell>
  );
}
