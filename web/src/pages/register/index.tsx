import { Alert, Button, Flex, Form, Input, Spin, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useNebulaLoginBadge } from '@/providers/login-badge-provider';
import type { AuthInitResp, RegisterReq } from '@/types/auth';
import { AuthShell } from '@/layouts/auth-shell';

interface RegisterFormValues extends RegisterReq {
  confirmPassword: string;
}

const authConfigErrorDescription = '请稍后重试，或联系管理员检查认证配置。';

export function RegisterPage() {
  const loginBadge = useNebulaLoginBadge();
  const navigate = useNavigate();
  const [config, setConfig] = useState<AuthInitResp | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loginBadge.authService) {
      setConfigLoading(false);
      return;
    }

    let cancelled = false;
    loginBadge.authService
      .getAuthConfig()
      .then((resp) => {
        if (!cancelled) {
          setConfig(resp);
          setConfigLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setConfigError(authConfigErrorDescription);
          setConfigLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [loginBadge.authService]);

  if (configLoading) {
    return (
      <AuthShell>
        <Flex justify="center" className="p-6">
          <Spin description="加载中">
            <div />
          </Spin>
        </Flex>
      </AuthShell>
    );
  }

  if (!loginBadge.authService) {
    return (
      <AuthShell>
        <Alert type="info" title="注册功能未启用" description="请使用项目提供的注册入口，或在 NebulaProvider 的 loginBadge 中配置认证服务。" showIcon />
      </AuthShell>
    );
  }

  if (configError) {
    return (
      <AuthShell>
        <Alert type="error" title="加载认证配置失败" description={configError} showIcon />
      </AuthShell>
    );
  }

  if (config?.usernameRegisterAllowed === false) {
    return (
      <AuthShell>
        <Alert type="warning" title="暂不开放注册" description="当前系统未开放账号注册，请联系管理员开通账号。" showIcon />
      </AuthShell>
    );
  }

  const handleSubmit = async ({ confirmPassword, ...values }: RegisterFormValues) => {
    setSubmitting(true);
    try {
      await loginBadge.authService?.register(values);
      if (loginBadge.onRegisterSuccess) {
        await loginBadge.onRegisterSuccess();
        return;
      }

      navigate(loginBadge.loginPath);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell>
      <Form<RegisterFormValues> layout="vertical" onFinish={handleSubmit}>
        <Form.Item label="用户名" name="username" rules={[{ required: true, message: '请输入用户名' }]}>
          <Input />
        </Form.Item>
        <Form.Item
          label="密码"
          name="password"
          rules={[
            { required: true, message: '请输入密码' },
            ...(config?.usernamePasswordMinLength
              ? [{ min: config.usernamePasswordMinLength, message: `密码长度不能少于${config.usernamePasswordMinLength}位` }]
              : []),
            ...(config?.usernamePasswordMaxLength
              ? [{ max: config.usernamePasswordMaxLength, message: `密码长度不能超过${config.usernamePasswordMaxLength}位` }]
              : []),
          ]}
        >
          <Input.Password />
        </Form.Item>
        <Form.Item
          label="确认密码"
          name="confirmPassword"
          dependencies={["password"]}
          rules={[
            { required: true, message: '请再次输入密码' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('password') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error('两次密码不一致'));
              },
            }),
          ]}
        >
          <Input.Password />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={submitting} block>
            注册
          </Button>
        </Form.Item>
      </Form>

      {loginBadge.loginPath && (
        <Flex justify="center" className="mt-4">
          <Typography.Text type="secondary">
            已有账号？
            <Link to={loginBadge.loginPath}>立即登录</Link>
          </Typography.Text>
        </Flex>
      )}
    </AuthShell>
  );
}
