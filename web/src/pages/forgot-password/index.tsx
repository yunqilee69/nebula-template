import { Alert, Button, Flex, Form, Input, Result, Steps, Typography } from 'antd';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthShell } from '@/layouts/auth-shell';
import { useNebulaLoginBadge } from '@/providers/login-badge-provider';
import { useAuthStore } from '@/stores/auth-store';
import { toCurrentUser } from '@/utils/auth/current-user';
import { saveAuthTokens } from '@/utils/auth/token-session';

interface IdentityFormValues {
  identity: string;
}

interface VerifyCodeFormValues {
  code: string;
}

interface ChangePasswordFormValues {
  newPassword: string;
  confirmPassword: string;
}

export function ForgotPasswordPage() {
  const loginBadge = useNebulaLoginBadge();
  const navigate = useNavigate();
  const setUser = useAuthStore((state) => state.setUser);
  const [currentStep, setCurrentStep] = useState(0);
  const [identity, setIdentity] = useState('');
  const [passwordChangeToken, setPasswordChangeToken] = useState('');
  const [expiresInSeconds, setExpiresInSeconds] = useState<number | null>(null);
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  if (!loginBadge.authService) {
    return (
      <AuthShell>
        <Alert type="info" title="修改密码功能未启用" description="请在 NebulaProvider 的 loginBadge 中配置认证服务。" showIcon />
      </AuthShell>
    );
  }

  const authService = loginBadge.authService;

  const handleSendCode = async (values: IdentityFormValues) => {
    setSendingCode(true);
    try {
      await authService.sendForgotPasswordCode({ identity: values.identity });
      setIdentity(values.identity);
      setCurrentStep(1);
    } finally {
      setSendingCode(false);
    }
  };

  const handleVerifyCode = async (values: VerifyCodeFormValues) => {
    setVerifyingCode(true);
    try {
      const result = await authService.verifyForgotPasswordCode({ identity, code: values.code });
      setPasswordChangeToken(result.passwordChangeToken);
      setExpiresInSeconds(result.expiresInSeconds);
      setCurrentStep(2);
    } finally {
      setVerifyingCode(false);
    }
  };

  const handleChangePassword = async ({ confirmPassword, ...values }: ChangePasswordFormValues) => {
    setChangingPassword(true);
    try {
      const loginResp = await authService.changeForgottenPassword({
        passwordChangeToken,
        newPassword: values.newPassword,
      });
      saveAuthTokens(loginResp);
      if (loginBadge.onLoginSuccess) {
        await loginBadge.onLoginSuccess(loginResp);
      } else {
        const currentUser = await authService.getCurrentUser();
        setUser(toCurrentUser(currentUser));
        navigate('/');
      }
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <AuthShell>
      <Flex vertical gap={24}>
        <div>
          <Typography.Title level={4} className="mb-2 text-center">
            修改密码
          </Typography.Title>
          <Typography.Paragraph type="secondary" className="mb-0 text-center">
            通过已绑定手机号或邮箱完成身份验证后设置新密码
          </Typography.Paragraph>
        </div>

        <Steps
          current={currentStep}
          size="small"
          items={[
            { title: '身份验证' },
            { title: '校验验证码' },
            { title: '修改密码' },
          ]}
        />

        {currentStep === 0 && (
          <Form<IdentityFormValues> layout="vertical" onFinish={handleSendCode}>
            <Form.Item label="手机号或邮箱" name="identity" rules={[{ required: true, message: '请输入已绑定手机号或邮箱' }]}>
              <Input autoComplete="username" />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={sendingCode} block>
                发送验证码
              </Button>
            </Form.Item>
          </Form>
        )}

        {currentStep === 1 && (
          <Form<VerifyCodeFormValues> layout="vertical" onFinish={handleVerifyCode}>
            <Result status="info" title="验证码已发送" subTitle={`请查看 ${identity} 收到的验证码。`} className="py-0" />
            <Form.Item label="验证码" name="code" rules={[{ required: true, message: '请输入验证码' }]}>
              <Input autoComplete="one-time-code" />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={verifyingCode} block>
                校验验证码
              </Button>
            </Form.Item>
          </Form>
        )}

        {currentStep === 2 && (
          <Form<ChangePasswordFormValues> layout="vertical" onFinish={handleChangePassword}>
            {expiresInSeconds !== null && (
              <Alert type="info" showIcon title={`密码修改令牌将在 ${expiresInSeconds} 秒后失效，请尽快完成修改。`} />
            )}
            <Form.Item label="新密码" name="newPassword" rules={[{ required: true, message: '请输入新密码' }]}> 
              <Input.Password autoComplete="new-password" />
            </Form.Item>
            <Form.Item
              label="确认新密码"
              name="confirmPassword"
              dependencies={["newPassword"]}
              rules={[
                { required: true, message: '请再次输入新密码' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('newPassword') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('两次密码不一致'));
                  },
                }),
              ]}
            >
              <Input.Password autoComplete="new-password" />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={changingPassword} block>
                修改密码
              </Button>
            </Form.Item>
          </Form>
        )}

        <Flex justify="center">
          <Typography.Text type="secondary">
            已想起密码？
            <Link to={loginBadge.loginPath}>返回登录</Link>
          </Typography.Text>
        </Flex>
      </Flex>
    </AuthShell>
  );
}
