import { App, Avatar, Button, Card, Descriptions, Divider, Flex, Form, Input, Tag, Typography, theme as antdTheme } from 'antd';
import { useState } from 'react';
import { personService } from '@/api/person';
import { personStatusMeta } from '@/pages/tenant-config/person-management/person-status';
import type { PersonSummary } from '@/types/auth';

interface ProfilePanelProps {
  person: PersonSummary;
  onUpdated: (person: PersonSummary) => void;
}

export function ProfilePanel({ person, onUpdated }: ProfilePanelProps) {
  const { message } = App.useApp();
  const { token } = antdTheme.useToken();
  const [form] = Form.useForm<{ displayName: string }>();
  const [saving, setSaving] = useState(false);
  const displayName = person.displayName || person.username;

  const submit = async (values: { displayName: string }) => {
    setSaving(true);
    try {
      const updated = await personService.updateProfile(values);
      onUpdated(updated);
      message.success('资料已更新');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <Flex vertical gap={token.marginLG}>
        <Flex align="center" gap={token.marginMD} wrap>
          <Avatar size={64} style={{ background: token.colorPrimary, flexShrink: 0 }}>
            {displayName.slice(0, 1).toUpperCase()}
          </Avatar>
          <div>
            <Flex align="center" gap={token.marginSM} wrap>
              <Typography.Title level={4} style={{ margin: 0 }}>{displayName}</Typography.Title>
              <Typography.Text type="secondary">{person.username}</Typography.Text>
              {person.platformAdmin ? <Tag color="blue">平台管理员</Tag> : null}
            </Flex>
            <Typography.Paragraph type="secondary" style={{ margin: `${token.marginXXS}px 0 0` }}>
              平台账号是跨企业的全局身份，用于关联你在各企业的账号；企业内的权限和角色仍由各企业独立管理。
            </Typography.Paragraph>
          </div>
        </Flex>

        <Descriptions bordered column={{ xs: 1, sm: 2 }}>
          <Descriptions.Item label="平台用户名">{person.username}</Descriptions.Item>
          <Descriptions.Item label="显示名称">{person.displayName || '-'}</Descriptions.Item>
          <Descriptions.Item label="账号 ID">
            <Typography.Text copyable code style={{ wordBreak: 'break-all' }}>{person.id}</Typography.Text>
          </Descriptions.Item>
          <Descriptions.Item label="账号状态">
            <Tag color={personStatusMeta(person.status).color}>{personStatusMeta(person.status).label}</Tag>
          </Descriptions.Item>
        </Descriptions>

        <Divider style={{ margin: 0 }} />

        <div>
          <Typography.Title level={5} style={{ marginTop: 0 }}>编辑资料</Typography.Title>
          <Form
            key={person.displayName ?? ''}
            form={form}
            layout="inline"
            initialValues={{ displayName: person.displayName }}
            onFinish={submit}
          >
            <Form.Item name="displayName" label="显示名称" rules={[{ required: true, message: '请输入显示名称' }]}>
              <Input placeholder="展示给其他成员的名称" style={{ width: 280 }} />
            </Form.Item>
            <Button type="primary" htmlType="submit" autoInsertSpace={false} loading={saving}>保存</Button>
          </Form>
        </div>
      </Flex>
    </Card>
  );
}
