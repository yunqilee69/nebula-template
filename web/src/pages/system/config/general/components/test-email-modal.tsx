import { Form, Input, Modal } from 'antd';
import type { FormInstance } from 'antd';

export interface TestEmailFormValues {
  readonly receiver: string;
  readonly subject: string;
  readonly content: string;
}

export interface TestEmailModalProps {
  readonly open: boolean;
  readonly loading: boolean;
  readonly form: FormInstance<TestEmailFormValues>;
  readonly onSubmit: () => void;
  readonly onCancel: () => void;
}

export function TestEmailModal({ open, loading, form, onSubmit, onCancel }: TestEmailModalProps) {
  return (
    <Modal
      title="测试邮件配置"
      open={open}
      confirmLoading={loading}
      okText="发送测试邮件"
      cancelText="取消"
      onOk={onSubmit}
      onCancel={onCancel}
      destroyOnHidden
    >
      <Form<TestEmailFormValues>
        form={form}
        layout="vertical"
        requiredMark={false}
      >
        <Form.Item
          name="receiver"
          label="收件人"
          rules={[
            { required: true, message: '请输入收件人邮箱' },
            { type: 'email', message: '请输入有效的邮箱地址' },
          ]}
        >
          <Input placeholder="admin@example.com" />
        </Form.Item>
        <Form.Item
          name="subject"
          label="主题"
          rules={[{ required: true, message: '请输入邮件主题' }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          name="content"
          label="内容"
          rules={[{ required: true, message: '请输入邮件内容' }]}
        >
          <Input.TextArea rows={5} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
