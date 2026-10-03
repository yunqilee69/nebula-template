import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Form, Popconfirm, Select, Space, Tag, Tooltip } from 'antd';
import { useCallback, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Access } from '@/components/access';
import { HelpIcon } from '@/components/help-icon';
import { NebulaProTable } from '@/components/nebula-pro-table';
import type { NebulaProColumns, NebulaProTableAction } from '@/components/nebula-pro-table';
import { useNotice } from '@/hooks/use-notice';
import { notifyService as defaultNotifyService } from '@/services/notify';
import type { NotifyCategoryResp } from '@/types/notify';
import { CategoryFormModal } from './category-form-modal';
import {
  buildNotifyCategoryPageReq,
  NOTIFY_USER_CHANNEL_OPTIONS,
  toCreateNotifyCategoryReq,
  toNotifyCategoryFormValues,
  toUpdateNotifyCategoryReq,
} from './category-page-helpers';
import type {
  CategoryFormState,
  CategoryFormValues,
  CategoryTableQuery,
  NotifyCategoryService,
} from './category-page-helpers';

interface CategoryManagementPageProps {
  readonly service?: NotifyCategoryService;
}

const CHANNEL_LABELS: Readonly<Record<string, string>> = Object.fromEntries(
  NOTIFY_USER_CHANNEL_OPTIONS.map((option) => [option.value, option.label]),
);

function channelLabel(channel: string): string {
  return CHANNEL_LABELS[channel] ?? channel;
}

/** 列头文案 + 说明图标；表格列无法使用 Form.Item 的 tooltip，故用共享组件。 */
function columnTitle(text: string, help: string): ReactNode {
  return (
    <Space size={2}>
      <span>{text}</span>
      <HelpIcon ariaLabel={`查看${text}说明`} title={help} />
    </Space>
  );
}

export function CategoryManagementPage({
  service = defaultNotifyService,
}: CategoryManagementPageProps) {
  const actionRef = useRef<NebulaProTableAction | undefined>(undefined);
  const [form] = Form.useForm<CategoryFormValues>();
  const notice = useNotice();
  const [formState, setFormState] = useState<CategoryFormState>({ mode: 'create' });
  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  const requestCategories = useCallback(
    (params: CategoryTableQuery & { readonly pageNum: number; readonly pageSize: number }) => (
      service.pageNotifyCategories(buildNotifyCategoryPageReq(params))
    ),
    [service],
  );

  const closeForm = useCallback(() => {
    if (submitting) return;
    setFormOpen(false);
    setFormState({ mode: 'create' });
    form.resetFields();
  }, [form, submitting]);

  const openCreateForm = useCallback(() => {
    setFormState({ mode: 'create' });
    form.resetFields();
    form.setFieldsValue({
      mandatory: false,
      defaultEnabled: true,
      enabled: true,
      allowedChannels: ['SITE'],
      sort: undefined,
    });
    setFormOpen(true);
  }, [form]);

  const openEditForm = useCallback(async (record: NotifyCategoryResp) => {
    setFormState({ mode: 'update', categoryId: record.id, builtin: record.builtin === true });
    form.resetFields();
    setFormOpen(true);
    setDetailLoading(true);
    try {
      const detail = await service.getNotifyCategory(record.id);
      form.setFieldsValue(toNotifyCategoryFormValues(detail));
    } catch (error: unknown) {
      if (error instanceof Error) {
        notice.error('加载通知类别详情失败');
        setFormOpen(false);
        setFormState({ mode: 'create' });
        return;
      }
      throw error;
    } finally {
      setDetailLoading(false);
    }
  }, [form, notice, service]);

  const submitCategory = useCallback(async () => {
    const values = await form.validateFields();
    setSubmitting(true);
    try {
      switch (formState.mode) {
        case 'create':
          await service.createNotifyCategory(toCreateNotifyCategoryReq(values));
          notice.success('通知类别创建成功');
          break;
        case 'update':
          await service.updateNotifyCategory(formState.categoryId, toUpdateNotifyCategoryReq(values));
          notice.success('通知类别更新成功');
          break;
      }
      closeForm();
      await actionRef.current?.reload();
    } catch (error: unknown) {
      if (error instanceof Error) {
        notice.error(formState.mode === 'create' ? '创建通知类别失败' : '更新通知类别失败');
        return;
      }
      throw error;
    } finally {
      setSubmitting(false);
    }
  }, [closeForm, form, formState, notice, service]);

  const removeCategory = useCallback(async (record: NotifyCategoryResp) => {
    try {
      await service.deleteNotifyCategory(record.id);
      notice.success('通知类别删除成功');
      await actionRef.current?.reload();
    } catch (error: unknown) {
      if (error instanceof Error) {
        notice.error('删除通知类别失败');
        return;
      }
      throw error;
    }
  }, [notice, service]);

  const columns = useMemo<NebulaProColumns<NotifyCategoryResp>[]>(() => [
    {
      title: '类别编码',
      dataIndex: 'code',
      fixed: 'left',
      width: 180,
      sorter: true,
      fieldProps: { 'aria-label': '类别编码', placeholder: '请输入类别编码' },
      render: (_, record) => (
        <Space size={4}>
          <span>{record.code}</span>
          {record.builtin ? <Tag color="blue">内置</Tag> : null}
        </Space>
      ),
    },
    {
      title: '类别名称',
      dataIndex: 'name',
      width: 160,
      sorter: true,
      fieldProps: { 'aria-label': '类别名称', placeholder: '请输入类别名称' },
    },
    {
      title: columnTitle('允许渠道', '类别只在这些渠道上参与用户偏好判定并发送；不在名单内的渠道一律不发送，也不出现在消息设置页。'),
      dataIndex: 'allowedChannels',
      width: 200,
      search: false,
      render: (_, record) => (
        (record.allowedChannels ?? []).length > 0
          ? (record.allowedChannels ?? []).map((channel) => <Tag key={channel}>{channelLabel(channel)}</Tag>)
          : '-'
      ),
    },
    {
      title: columnTitle('强制类别', '开启后忽略用户偏好、始终放行，消息设置页整组置灰不可关闭；仅账号安全类提醒应开启。'),
      dataIndex: 'mandatory',
      width: 100,
      search: false,
      render: (_, record) => (record.mandatory ? <Tag color="warning">强制</Tag> : '-'),
    },
    {
      title: columnTitle('默认开启', '用户尚未保存过该类别开关时的初始值；用户保存过之后以用户自己的设置为准。'),
      dataIndex: 'defaultEnabled',
      width: 100,
      search: false,
      render: (_, record) => (record.defaultEnabled === false ? '否' : '是'),
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      width: 110,
      formItemRender: () => (
        <Select
          allowClear
          aria-label="状态"
          placeholder="请选择状态"
          options={[{ label: '启用', value: true }, { label: '停用', value: false }]}
        />
      ),
      render: (_, record) => (record.enabled === false
        ? <Tag>停用</Tag>
        : <Tag color="success">启用</Tag>),
    },
    { title: columnTitle('排序号', '决定消息设置页与类别列表的展示顺序；值越小越靠前，留空按默认 100 处理。'), dataIndex: 'sort', width: 90, search: false, sorter: true },
    { title: '类别说明', dataIndex: 'description', width: 220, search: false, ellipsis: true },
    { title: '创建时间', dataIndex: 'createTime', width: 170, valueType: 'dateTime', search: false, sorter: true },
    {
      title: '操作',
      key: 'actions',
      fixed: 'right',
      width: 180,
      valueType: 'option',
      search: false,
      render: (_, record) => [
        <Access key="edit" permission="NOTIFY_CATEGORY_EDIT" fallback={null}>
          <Button type="link" icon={<EditOutlined />} aria-label={`编辑 ${record.code}`} onClick={() => void openEditForm(record)}>
            编辑
          </Button>
        </Access>,
        record.builtin ? (
          <Access key="delete" permission="NOTIFY_CATEGORY_DELETE" fallback={null}>
            <Tooltip key="builtin-delete" title="内置类别不可删除，可改为停用">
              <Button type="link" danger disabled icon={<DeleteOutlined />} aria-label={`删除 ${record.code}`}>
                删除
              </Button>
            </Tooltip>
          </Access>
        ) : (
          <Access key="delete" permission="NOTIFY_CATEGORY_DELETE" fallback={null}>
            <Popconfirm
              title="确定删除该通知类别吗？"
              description="被模板引用的类别无法删除，可先调整模板或改为停用。"
              okText="删除"
              cancelText="取消"
              onConfirm={() => void removeCategory(record)}
            >
              <Button type="link" danger icon={<DeleteOutlined />} aria-label={`删除 ${record.code}`}>
                删除
              </Button>
            </Popconfirm>
          </Access>
        ),
      ],
    },
  ], [openEditForm, removeCategory]);

  return (
    <>
      <NebulaProTable<NotifyCategoryResp, CategoryTableQuery>
        actionRef={actionRef}
        columns={columns}
        request={requestCategories}
        rowKey="id"
        onRequestError={() => notice.error('加载通知类别列表失败')}
        size="middle"
        scroll={{ x: 1400 }}
        toolBarRender={() => [
          <Access key="create" permission="NOTIFY_CATEGORY_CREATE" fallback={null}>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreateForm}>
              新增通知类别
            </Button>
          </Access>,
        ]}
      />
      <CategoryFormModal
        form={form}
        formState={formState}
        open={formOpen}
        submitting={submitting}
        detailLoading={detailLoading}
        onSubmit={() => void submitCategory()}
        onCancel={closeForm}
      />
    </>
  );
}

export default CategoryManagementPage;
