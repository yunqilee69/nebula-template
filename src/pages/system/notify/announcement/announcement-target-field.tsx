import { Alert, Button, Flex, Form, Segmented, Select, Space, Spin, Tag, Typography } from 'antd';
import { useState } from 'react';
import { OrgTree } from '@/components/org-tree';
import { UserSelect, type UserSelectProps } from '@/components/user-select';
import type { OrgTreeResp, RoleOptionResp, UserResp } from '@/types/auth-management';
import type { AnnouncementTargetType } from '@/types/notify';
import type { FormInstance } from 'antd';
import {
  ANNOUNCEMENT_TARGET_OPTIONS,
  type AnnouncementFormValues,
} from './announcement-shared';

interface AnnouncementTargetFieldProps {
  readonly form: FormInstance<AnnouncementFormValues>;
  readonly roles: RoleOptionResp[];
  readonly orgTree: OrgTreeResp[];
  readonly userService: NonNullable<UserSelectProps['service']>;
  readonly optionsLoading: boolean;
  readonly optionsError: boolean;
  readonly onRetryOptions: () => void;
}

interface TargetValueBridgeProps {
  readonly value?: readonly string[];
  readonly onChange?: (value: readonly string[]) => void;
}

function TargetValueBridge(_: TargetValueBridgeProps) {
  return null;
}

function isTargetType(value: string | number): value is AnnouncementTargetType {
  return value === 'ALL' || value === 'USER' || value === 'ROLE' || value === 'ORG';
}

export function AnnouncementTargetField({
  form,
  roles,
  orgTree,
  userService,
  optionsLoading,
  optionsError,
  onRetryOptions,
}: AnnouncementTargetFieldProps) {
  const targetType = Form.useWatch('targetType', form) ?? 'ALL';
  const targetValues = Form.useWatch('targetValues', form) ?? [];
  const [userSelectOpen, setUserSelectOpen] = useState(false);
  const [userNames, setUserNames] = useState<ReadonlyMap<string, string>>(new Map());

  const setTargetValues = (values: readonly string[]) => {
    form.setFieldValue('targetValues', values);
    void form.validateFields(['targetValues']);
  };

  const handleTargetTypeChange = (value: string | number) => {
    if (!isTargetType(value)) return;
    form.setFieldsValue({ targetType: value, targetValues: [] });
    setUserNames(new Map());
  };

  const handleUsersChange = (value: string | string[] | undefined, users: UserResp[]) => {
    const values = Array.isArray(value) ? value : value ? [value] : [];
    setTargetValues(values);
    setUserNames(new Map(users.map(user => [user.id, user.nickname ?? user.username])));
  };

  const toggleOrg = (orgId: string) => {
    setTargetValues(targetValues.includes(orgId)
      ? targetValues.filter(value => value !== orgId)
      : [...targetValues, orgId]);
  };

  const requiresTarget = targetType !== 'ALL';

  return (
    <>
      <Form.Item name="targetType" label="发送范围" htmlFor="announcement-drawer-target-type" rules={[{ required: true }]}>
        <Segmented id="announcement-drawer-target-type" block options={ANNOUNCEMENT_TARGET_OPTIONS} onChange={handleTargetTypeChange} />
      </Form.Item>

      <Form.Item
        name="targetValues"
        hidden
        rules={requiresTarget ? [{ required: true, message: '请选择至少一个发送目标' }] : []}
      >
        <TargetValueBridge />
      </Form.Item>

      {optionsError ? (
        <Alert
          type="error"
          showIcon
          title="目标选项加载失败"
          action={<Button size="small" onClick={onRetryOptions}>重试</Button>}
        />
      ) : null}

      {targetType === 'USER' ? (
        <Form.Item label="目标用户" required>
          <Flex vertical gap="small">
            <Button onClick={() => setUserSelectOpen(true)}>选择用户</Button>
            {targetValues.length > 0 ? (
              <Space wrap>
                {targetValues.map(userId => (
                  <Tag key={userId} closable onClose={() => setTargetValues(targetValues.filter(value => value !== userId))}>
                    {userNames.get(userId) ?? userId}
                  </Tag>
                ))}
              </Space>
            ) : <Typography.Text type="secondary">暂未选择用户</Typography.Text>}
            <UserSelect
              open={userSelectOpen}
              mode="multiple"
              value={[...targetValues]}
              treeData={orgTree}
              roles={roles}
              onChange={handleUsersChange}
              onClose={() => setUserSelectOpen(false)}
              service={userService}
            />
          </Flex>
        </Form.Item>
      ) : null}

      {targetType === 'ROLE' ? (
        <Form.Item label="目标角色" htmlFor="announcement-target-roles" required>
          <Spin spinning={optionsLoading}>
            <Select
              id="announcement-target-roles"
              mode="multiple"
              value={[...targetValues]}
              options={roles.map(role => ({ label: role.name, value: role.id }))}
              placeholder="请选择角色"
              onChange={setTargetValues}
            />
          </Spin>
        </Form.Item>
      ) : null}

      {targetType === 'ORG' ? (
        <Form.Item label="目标组织" required>
          <Spin spinning={optionsLoading}>
            <OrgTree
              dataSource={orgTree}
              selectedKey={targetValues.at(-1)}
              extra={<Tag>已选择 {targetValues.length} 个组织</Tag>}
              onSelect={toggleOrg}
            />
          </Spin>
        </Form.Item>
      ) : null}
    </>
  );
}
