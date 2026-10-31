import { Alert, App, Col, Form, Input, Modal, Row } from 'antd';
import { useEffect, useState } from 'react';
import { tenantApi } from '@/api/tenants';
import type { Tenant } from '@/types';

interface TenantFormValues {
  code: string;
  name: string;
  subdomain?: string;
  logo?: string;
  contactEmail?: string;
  shortName?: string;
  contactPhone?: string;
  website?: string;
  address?: string;
  industry?: string;
  description?: string;
  locale?: string;
  timezone?: string;
  adminUsername?: string;
  adminPassword?: string;
  adminNickname?: string;
  adminEmail?: string;
  adminPhone?: string;
}

interface TenantFormModalProps {
  open: boolean;
  tenant: Tenant | null;
  onCancel: () => void;
  onSuccess: (tenant: Tenant, mode: 'create' | 'edit') => void;
}

const codePattern = /^[a-z][a-z0-9-]{1,31}$/;
const subdomainPattern = /^[a-z][a-z0-9-]*$/;

export function TenantFormModal({ open, tenant, onCancel, onSuccess }: TenantFormModalProps) {
  const { message } = App.useApp();
  const [form] = Form.useForm<TenantFormValues>();
  const [submitting, setSubmitting] = useState(false);
  const editing = Boolean(tenant);

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    if (tenant) {
      form.setFieldsValue({
        name: tenant.name,
        contactEmail: tenant.contactEmail,
        shortName: tenant.shortName,
        contactPhone: tenant.contactPhone,
        website: tenant.website,
        address: tenant.address,
        industry: tenant.industry,
        description: tenant.description,
        locale: tenant.locale,
        timezone: tenant.timezone,
      });
    }
  }, [form, open, tenant]);

  const submit = async () => {
    const values = await form.validateFields();
    setSubmitting(true);
    try {
      if (tenant) {
        const updated = await tenantApi.update(tenant.id, {
          name: values.name,
          logo: tenant.logo,
          contactEmail: values.contactEmail || undefined,
          shortName: values.shortName || undefined,
          contactPhone: values.contactPhone || undefined,
          website: values.website || undefined,
          address: values.address || undefined,
          industry: values.industry || undefined,
          description: values.description || undefined,
          locale: values.locale || undefined,
          timezone: values.timezone || undefined,
          branding: tenant.branding,
          settingsJson: tenant.settingsJson,
        });
        message.success('企业信息已更新');
        onSuccess(updated, 'edit');
      } else {
        const created = await tenantApi.create({
          code: values.code,
          name: values.name,
          subdomain: values.subdomain || undefined,
          logo: values.logo || undefined,
          contactEmail: values.contactEmail || undefined,
          shortName: values.shortName || undefined,
          contactPhone: values.contactPhone || undefined,
          website: values.website || undefined,
          address: values.address || undefined,
          industry: values.industry || undefined,
          description: values.description || undefined,
          locale: values.locale || undefined,
          timezone: values.timezone || undefined,
          adminUsername: values.adminUsername || undefined,
          adminPassword: values.adminPassword || undefined,
          adminNickname: values.adminNickname || undefined,
          adminEmail: values.adminEmail || undefined,
          adminPhone: values.adminPhone || undefined,
        });
        message.success('企业已创建');
        onSuccess(created, 'create');
      }
    } catch (error) {
      message.error(error instanceof Error ? error.message : '保存企业失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={editing ? `编辑企业 · ${tenant?.name}` : '创建企业'}
      open={open}
      width={680}
      confirmLoading={submitting}
      okText={editing ? '保存' : '创建企业'}
      onOk={() => void submit()}
      onCancel={onCancel}
      destroyOnHidden
    >
      {editing ? null : (
        <Alert
          className="control-form-hint"
          type="info"
          showIcon
          title="新企业会复制系统模板"
          description="组织、角色、菜单和权限从系统租户整体复制。默认管理员为 admin / 123456，首次登录后需绑定平台账号，请在交付前修改默认密码。"
        />
      )}

      <Form form={form} layout="vertical">
        {editing ? null : (
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="code"
                label="企业代码"
                tooltip="公开、不可变，同时作为默认子域名的前缀"
                rules={[
                  { required: true, message: '请输入企业代码' },
                  { pattern: codePattern, message: '以小写字母开头，2-32 位小写字母、数字或连字符' },
                ]}
              >
                <Input placeholder="acme" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="name"
                label="企业名称"
                rules={[{ required: true, message: '请输入企业名称' }]}
              >
                <Input placeholder="Acme Inc." />
              </Form.Item>
            </Col>
          </Row>
        )}

        {editing ? (
          <Form.Item
            name="name"
            label="企业名称"
            rules={[{ required: true, message: '请输入企业名称' }]}
          >
            <Input placeholder="Acme Inc." />
          </Form.Item>
        ) : null}

        {editing ? null : (
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="subdomain"
                label="子域名"
                tooltip="可只填单个标签，后端会按已配置的基础域补全"
                rules={[{ pattern: subdomainPattern, message: '以小写字母开头，仅含小写字母、数字和连字符' }]}
              >
                <Input placeholder="留空则不自动分配" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="contactEmail" label="联系邮箱" rules={[{ type: 'email', message: '邮箱格式不正确' }]}>
                <Input placeholder="admin@acme.com" />
              </Form.Item>
            </Col>
          </Row>
        )}

        {editing ? (
          <Form.Item name="contactEmail" label="联系邮箱" rules={[{ type: 'email', message: '邮箱格式不正确' }]}>
            <Input placeholder="admin@acme.com" />
          </Form.Item>
        ) : null}

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="shortName" label="企业简称">
              <Input maxLength={64} placeholder="Acme" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="contactPhone" label="联系电话">
              <Input maxLength={32} placeholder="+86 138 0000 0000" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="website"
              label="官网地址"
              rules={[{ pattern: /^https?:\/\//, message: '官网地址必须以 http:// 或 https:// 开头' }]}
            >
              <Input maxLength={200} placeholder="https://www.acme.com" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="industry" label="所属行业">
              <Input maxLength={100} placeholder="互联网/软件服务" />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item name="address" label="联系地址">
              <Input maxLength={255} placeholder="所在省市与详细地址" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="locale" label="默认语言">
              <Input maxLength={16} placeholder="zh-CN" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="timezone" label="默认时区">
              <Input maxLength={64} placeholder="Asia/Shanghai" />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item name="description" label="企业简介">
              <Input.TextArea rows={3} maxLength={1000} showCount placeholder="一句话介绍企业" />
            </Form.Item>
          </Col>
        </Row>

        {editing ? null : (
          <>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="adminUsername"
                  label="租户管理员用户名"
                  tooltip="留空使用模板默认账号 admin"
                >
                  <Input placeholder="admin" autoComplete="off" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="adminPassword"
                  label="租户管理员密码"
                  dependencies={['adminUsername']}
                  tooltip="留空使用模板默认密码 123456"
                  rules={[
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        const adminUsername = getFieldValue('adminUsername');
                        if (adminUsername && adminUsername !== 'admin' && !value) {
                          return Promise.reject(new Error('修改管理员用户名时必须同时设置密码'));
                        }
                        return Promise.resolve();
                      },
                    }),
                  ]}
                >
                  <Input.Password placeholder="123456" autoComplete="new-password" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="adminNickname" label="管理员昵称">
                  <Input placeholder="Administrator" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="adminEmail" label="管理员邮箱" rules={[{ type: 'email', message: '邮箱格式不正确' }]}>
                  <Input />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="adminPhone" label="管理员手机号">
                  <Input />
                </Form.Item>
              </Col>
            </Row>
          </>
        )}
      </Form>
    </Modal>
  );
}
