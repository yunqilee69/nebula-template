import { LockOutlined, SafetyCertificateOutlined, UserOutlined } from '@ant-design/icons';
import { Alert, Button, Form, Input, Typography } from 'antd';
import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/auth-context';
import type { LoginRequest } from '@/types';

export function LoginPage() {
  const { status, user, login } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status === 'booting') {
    return (
      <div className="control-boot">
        <span className="control-boot__pulse" />
        <Typography.Text type="secondary">正在校验控制台会话…</Typography.Text>
      </div>
    );
  }

  if (status === 'authenticated' && user) {
    return <Navigate to="/" replace />;
  }

  const submit = async (values: LoginRequest) => {
    setSubmitting(true);
    setError(null);
    try {
      await login(values);
      navigate('/', { replace: true });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '登录失败，请稍后重试。');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="control-login">
      <section className="control-login__brand">
        <div className="control-login__brand-inner">
          <div className="control-login__mark">N</div>
          <Typography.Title level={1} className="control-login__title">
            NEBULA
            <span>多租户控制平台</span>
          </Typography.Title>
          <Typography.Paragraph className="control-login__subtitle">
            面向平台运营的独立控制面，负责全局用户与企业生命周期管理。
            与租户数据平面完全分离，只有超级管理员可以进入。
          </Typography.Paragraph>
          <ul className="control-login__points">
            <li>企业创建、停用、域名与成员邀请</li>
            <li>全局平台账号与关联企业查询</li>
            <li>控制面会话独立存储，不共享租户令牌</li>
          </ul>
        </div>
      </section>

      <section className="control-login__panel">
        <div className="control-login__form">
          <div className="control-login__form-heading">
            <SafetyCertificateOutlined className="control-login__form-icon" />
            <div>
              <Typography.Title level={2}>超级管理员登录</Typography.Title>
              <Typography.Text type="secondary">使用平台账号中的超级管理员账号登录控制台</Typography.Text>
            </div>
          </div>

          {error ? <Alert type="error" showIcon title={error} className="control-login__alert" /> : null}

          <Form<LoginRequest> layout="vertical" size="large" onFinish={submit} autoComplete="off">
            <Form.Item
              name="username"
              label="账号"
              rules={[{ required: true, message: '请输入超级管理员账号' }]}
            >
              <Input prefix={<UserOutlined />} placeholder="superadmin" autoComplete="username" />
            </Form.Item>
            <Form.Item
              name="password"
              label="密码"
              rules={[{ required: true, message: '请输入密码' }]}
            >
              <Input.Password prefix={<LockOutlined />} placeholder="请输入密码" autoComplete="current-password" />
            </Form.Item>
            <Button type="primary" htmlType="submit" block loading={submitting}>
              进入控制台
            </Button>
          </Form>

          <Typography.Paragraph type="secondary" className="control-login__hint">
            控制平面仅支持账号 + 密码登录；邮箱和手机号只作为全局用户信息字段，不提供验证码登录。
            控制台只接受具备超级管理员身份的平台账号，不依赖任何租户。
          </Typography.Paragraph>
        </div>
      </section>
    </div>
  );
}
