import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Form, Popconfirm, Typography } from 'antd';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Access } from '@/components/access';
import { DictLabel, DictSelect } from '@/components/dict-select';
import { NebulaProTable } from '@/components/nebula-pro-table';
import type { NebulaProColumns, NebulaProTableAction } from '@/components/nebula-pro-table';
import { useNotice } from '@/hooks/use-notice';
import { notifyService as defaultNotifyService } from '@/services/notify';
import type { NotifyChannelTargetResp } from '@/types/notify';
import { ChannelTargetFormModal } from './channel-target-form-modal';
import {
  buildNotifyChannelTargetPageReq,
  DEFAULT_CHANNEL_TARGET_TYPE,
  NOTIFY_CHANNEL_TYPE,
  toChannelTargetFormValues,
  toCreateNotifyChannelTargetReq,
  toUpdateNotifyChannelTargetReq,
} from './channel-target-page-helpers';
import type {
  ChannelTargetFormState,
  ChannelTargetFormValues,
  ChannelTargetTableQuery,
  NotifyChannelTargetService,
} from './channel-target-page-helpers';

interface ChannelTargetManagementPageProps {
  readonly service?: NotifyChannelTargetService;
}

export function ChannelTargetManagementPage({
  service = defaultNotifyService,
}: ChannelTargetManagementPageProps) {
  const actionRef = useRef<NebulaProTableAction | undefined>(undefined);
  const [form] = Form.useForm<ChannelTargetFormValues>();
  const notice = useNotice();
  const [formState, setFormState] = useState<ChannelTargetFormState>({ mode: 'create' });
  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  const requestTargets = useCallback(
    (params: ChannelTargetTableQuery & { readonly pageNum: number; readonly pageSize: number }) => (
      service.pageNotifyChannelTargets(buildNotifyChannelTargetPageReq(params))
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
    form.setFieldsValue({ channelType: DEFAULT_CHANNEL_TARGET_TYPE });
    setFormOpen(true);
  }, [form]);

  const openEditForm = useCallback(async (record: NotifyChannelTargetResp) => {
    setFormState({ mode: 'update', targetId: record.id });
    form.resetFields();
    setFormOpen(true);
    setDetailLoading(true);
    try {
      const detail = await service.getNotifyChannelTarget(record.id);
      form.setFieldsValue(toChannelTargetFormValues(detail));
    } catch (error: unknown) {
      if (error instanceof Error) {
        notice.error('加载渠道目标详情失败');
        setFormOpen(false);
        setFormState({ mode: 'create' });
        return;
      }
      throw error;
    } finally {
      setDetailLoading(false);
    }
  }, [form, notice, service]);

  const submitTarget = useCallback(async () => {
    const values = await form.validateFields();
    setSubmitting(true);
    try {
      switch (formState.mode) {
        case 'create':
          await service.createNotifyChannelTarget(toCreateNotifyChannelTargetReq(values));
          notice.success('渠道目标创建成功');
          break;
        case 'update':
          await service.updateNotifyChannelTarget(formState.targetId, toUpdateNotifyChannelTargetReq(values));
          notice.success('渠道目标更新成功');
          break;
      }
      closeForm();
      await actionRef.current?.reload();
    } catch (error: unknown) {
      if (error instanceof Error) {
        notice.error(formState.mode === 'create' ? '创建渠道目标失败' : '更新渠道目标失败');
        return;
      }
      throw error;
    } finally {
      setSubmitting(false);
    }
  }, [closeForm, form, formState, notice, service]);

  const removeTarget = useCallback(async (record: NotifyChannelTargetResp) => {
    try {
      await service.deleteNotifyChannelTarget(record.id);
      notice.success('渠道目标删除成功');
      await actionRef.current?.reload();
    } catch (error: unknown) {
      if (error instanceof Error) {
        notice.error('删除渠道目标失败');
        return;
      }
      throw error;
    }
  }, [notice, service]);

  const columns = useMemo<NebulaProColumns<NotifyChannelTargetResp>[]>(() => [
    {
      title: '目标名称',
      dataIndex: 'targetName',
      fixed: 'left',
      width: 180,
      sorter: true,
      fieldProps: { 'aria-label': '目标名称', placeholder: '请输入目标名称' },
    },
    {
      title: '通知渠道',
      dataIndex: 'channelType',
      width: 160,
      formItemRender: () => (
        <DictSelect dictCode={NOTIFY_CHANNEL_TYPE} aria-label="通知渠道" placeholder="请选择通知渠道" showDisabled={false} />
      ),
      render: (_, record) => <DictLabel dictCode={NOTIFY_CHANNEL_TYPE} value={record.channelType} />,
    },
    {
      title: '目标地址',
      dataIndex: 'endpointUrl',
      width: 300,
      search: false,
      render: (_, record) => (
        <Typography.Text copyable={{ text: record.endpointUrl }} ellipsis={{ tooltip: record.endpointUrl }}>
          {record.endpointUrl}
        </Typography.Text>
      ),
    },
    { title: '备注', dataIndex: 'remark', width: 220, search: false, ellipsis: true },
    { title: '创建时间', dataIndex: 'createTime', width: 170, valueType: 'dateTime', search: false, sorter: true },
    { title: '更新时间', dataIndex: 'updateTime', width: 170, valueType: 'dateTime', search: false, sorter: true },
    {
      title: '操作',
      key: 'actions',
      fixed: 'right',
      width: 180,
      valueType: 'option',
      search: false,
      render: (_, record) => [
        <Access key="edit" permission="NOTIFY_CHANNEL_TARGET_EDIT" fallback={null}>
          <Button type="link" icon={<EditOutlined />} aria-label={`编辑 ${record.targetName}`} onClick={() => void openEditForm(record)}>
            编辑
          </Button>
        </Access>,
        <Access key="delete" permission="NOTIFY_CHANNEL_TARGET_DELETE" fallback={null}>
          <Popconfirm
            title="确定删除该渠道目标吗？"
            okText="删除"
            cancelText="取消"
            onConfirm={() => void removeTarget(record)}
          >
            <Button type="link" danger icon={<DeleteOutlined />} aria-label={`删除 ${record.targetName}`}>
              删除
            </Button>
          </Popconfirm>
        </Access>,
      ],
    },
  ], [openEditForm, removeTarget]);

  return (
    <>
      <NebulaProTable<NotifyChannelTargetResp, ChannelTargetTableQuery>
        actionRef={actionRef}
        columns={columns}
        request={requestTargets}
        rowKey="id"
        onRequestError={() => notice.error('加载渠道目标列表失败')}
        size="middle"
        scroll={{ x: 1200 }}
        toolBarRender={() => [
          <Access key="create" permission="NOTIFY_CHANNEL_TARGET_CREATE" fallback={null}>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreateForm}>
              新增渠道目标
            </Button>
          </Access>,
        ]}
      />
      <ChannelTargetFormModal
        form={form}
        formState={formState}
        open={formOpen}
        submitting={submitting}
        detailLoading={detailLoading}
        onSubmit={() => void submitTarget()}
        onCancel={closeForm}
      />
    </>
  );
}

export default ChannelTargetManagementPage;
