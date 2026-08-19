import { Button, Drawer, Form, Input, InputNumber, Space, Switch } from 'antd';
import { useId, useMemo, useRef } from 'react';
import type { FormInstance } from 'antd';
import type { OrgTreeResp, RoleOptionResp } from '@/types/auth-management';
import type { UserSelectProps } from '@/components/user-select';
import type { AnnouncementStatus } from '@/types/notify';
import { AnnouncementTargetField } from './announcement-target-field';
import {
  DEFAULT_ANNOUNCEMENT_VALUES,
  type AnnouncementFormValues,
} from './announcement-shared';

export type { AnnouncementFormValues } from './announcement-shared';

interface AnnouncementFormDrawerProps {
  readonly open: boolean;
  readonly mode: 'create' | 'edit';
  readonly form: FormInstance<AnnouncementFormValues>;
  readonly roles: RoleOptionResp[];
  readonly orgTree: OrgTreeResp[];
  readonly userService: NonNullable<UserSelectProps['service']>;
  readonly optionsLoading: boolean;
  readonly optionsError: boolean;
  readonly detailLoading: boolean;
  readonly submitting: boolean;
  readonly onRetryOptions: () => void;
  readonly onClose: () => void;
  readonly onSubmit: (values: AnnouncementFormValues, status: AnnouncementStatus) => void;
}

export function AnnouncementFormDrawer({
  open,
  mode,
  form,
  roles,
  orgTree,
  userService,
  optionsLoading,
  optionsError,
  detailLoading,
  submitting,
  onRetryOptions,
  onClose,
  onSubmit,
}: AnnouncementFormDrawerProps) {
  const title = mode === 'create' ? '新建公告' : '编辑公告';
  const submitStatusRef = useRef<AnnouncementStatus>(0);
  const reactId = useId();
  const titleId = useMemo(
    () => `announcement-form-drawer-title-${reactId.replace(/:/g, '')}`,
    [reactId],
  );

  return (
    <Drawer
      open={open}
      title={title}
      aria-labelledby={titleId}
      size="large"
      loading={detailLoading}
      destroyOnHidden
      onClose={onClose}
      footer={(
        <Space className="flex w-full justify-end">
          <Button aria-label="取消" onClick={onClose} disabled={submitting}>取消</Button>
          <Button
            aria-label="保存为草稿"
            loading={submitting && submitStatusRef.current === 0}
            disabled={submitting}
            onClick={() => {
              submitStatusRef.current = 0;
              form.submit();
            }}
          >
            保存为草稿
          </Button>
          <Button
            aria-label="保存并发布"
            type="primary"
            loading={submitting && submitStatusRef.current === 1}
            disabled={submitting}
            onClick={() => {
              submitStatusRef.current = 1;
              form.submit();
            }}
          >
            保存并发布
          </Button>
        </Space>
      )}
    >
      <span id={titleId} className="sr-only">{title}</span>
      <Form<AnnouncementFormValues>
        form={form}
        layout="vertical"
        initialValues={DEFAULT_ANNOUNCEMENT_VALUES}
        disabled={detailLoading || submitting}
        onFinish={values => onSubmit(values, submitStatusRef.current)}
      >
        <Form.Item
          name="title"
          label="公告标题"
          htmlFor="announcement-drawer-title"
          rules={[
            { required: true, message: '请输入公告标题' },
            { max: 200, message: '公告标题不能超过 200 个字符' },
          ]}
        >
          <Input id="announcement-drawer-title" placeholder="请输入公告标题" showCount maxLength={200} />
        </Form.Item>

        <Form.Item
          name="content"
          label="公告内容"
          htmlFor="announcement-drawer-content"
          rules={[{ required: true, message: '请输入公告内容' }]}
        >
          <Input.TextArea id="announcement-drawer-content" placeholder="请输入公告内容" rows={6} />
        </Form.Item>

        <div className="grid gap-4 md:grid-cols-2">
          <Form.Item name="sort" label="排序" htmlFor="announcement-drawer-sort" rules={[{ required: true }]}>
            <InputNumber id="announcement-drawer-sort" className="w-full" min={0} precision={0} />
          </Form.Item>

          <Form.Item name="publishTime" label="发布时间" htmlFor="announcement-drawer-publish-time">
            <Input id="announcement-drawer-publish-time" type="datetime-local" step="1" />
          </Form.Item>

          <Form.Item name="expireTime" label="过期时间" htmlFor="announcement-drawer-expire-time">
            <Input id="announcement-drawer-expire-time" type="datetime-local" step="1" />
          </Form.Item>

          <Form.Item name="pinned" label="置顶" htmlFor="announcement-drawer-pinned" valuePropName="checked">
            <Switch id="announcement-drawer-pinned" checkedChildren="是" unCheckedChildren="否" />
          </Form.Item>

          <Form.Item name="popup" label="弹窗展示" htmlFor="announcement-drawer-popup" valuePropName="checked">
            <Switch id="announcement-drawer-popup" checkedChildren="是" unCheckedChildren="否" />
          </Form.Item>
        </div>

        <AnnouncementTargetField
          form={form}
          roles={roles}
          orgTree={orgTree}
          userService={userService}
          optionsLoading={optionsLoading}
          optionsError={optionsError}
          onRetryOptions={onRetryOptions}
        />
      </Form>
    </Drawer>
  );
}
