import { App, Button, Card, Form, Input } from 'antd';
import { personService } from '@/api/person';

export function SecurityPanel() {
  const { message } = App.useApp();
  const [passwordForm] = Form.useForm();

  return (
    <Card title="账号安全">
      <Form
        form={passwordForm}
        layout="vertical"
        style={{ maxWidth: 420 }}
        onFinish={async (values) => {
          await personService.changePassword({ oldPassword: values.oldPassword, newPassword: values.newPassword });
          passwordForm.resetFields();
          message.success('密码已修改');
        }}
      >
        <Form.Item name="oldPassword" label="当前密码" rules={[{ required: true, message: '请输入当前密码' }]}>
          <Input.Password autoComplete="current-password" />
        </Form.Item>
        <Form.Item name="newPassword" label="新密码" rules={[{ required: true, message: '请输入新密码' }]}>
          <Input.Password autoComplete="new-password" />
        </Form.Item>
        <Form.Item
          name="confirmPassword"
          label="确认新密码"
          dependencies={['newPassword']}
          rules={[
            { required: true, message: '请再次输入新密码' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('newPassword') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error('两次输入的新密码不一致'));
              },
            }),
          ]}
        >
          <Input.Password autoComplete="new-password" />
        </Form.Item>
        <Button type="primary" htmlType="submit">修改密码</Button>
      </Form>
    </Card>
  );
}
