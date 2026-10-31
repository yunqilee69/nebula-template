import { ApartmentOutlined } from '@ant-design/icons';
import { Alert, Button, Flex, Form, Input, Typography } from 'antd';

interface TenantCodeGateProps {
  errorMessage?: string;
  onSubmit: (tenantCode: string) => void;
}

interface TenantCodeFormValues {
  tenantCode: string;
}

/**
 * 企业代码入口。
 *
 * <p>裸域名（如 `localhost:5173`）没有租户子域名，后端无法确定租户时返回 19001/19002；
 * 此时不展示登录表单，先让用户输入企业代码并持久化。</p>
 */
export function TenantCodeGate({ errorMessage, onSubmit }: TenantCodeGateProps) {
  const [form] = Form.useForm<TenantCodeFormValues>();

  return (
    <Flex vertical gap={16}>
      <Flex vertical gap={4}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          输入企业代码
        </Typography.Title>
        <Typography.Text type="secondary">
          当前访问地址未绑定企业，请输入管理员提供的企业代码后继续。
        </Typography.Text>
      </Flex>

      {errorMessage ? <Alert type="error" showIcon title={errorMessage} /> : null}

      <Form form={form} layout="vertical" onFinish={({ tenantCode }) => onSubmit(tenantCode)}>
        <Form.Item
          label="企业代码"
          name="tenantCode"
          rules={[{ required: true, message: '请输入企业代码' }]}
        >
          <Input
            autoFocus
            autoComplete="organization"
            placeholder="例如 acme"
            prefix={<ApartmentOutlined />}
          />
        </Form.Item>
        <Button type="primary" htmlType="submit" block>
          进入企业
        </Button>
      </Form>
    </Flex>
  );
}
