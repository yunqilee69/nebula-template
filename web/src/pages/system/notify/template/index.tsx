import { PlusOutlined, SendOutlined } from '@ant-design/icons';
import { Button, Drawer, Form } from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AuthManagementService } from '@/api/auth-management';
import { authManagementService as defaultAuthManagementService } from '@/api/auth-management';
import { Access } from '@/components/access';
import { NebulaProTable } from '@/components/nebula-pro-table';
import type { NebulaProTableAction } from '@/components/nebula-pro-table';
import { useNotice } from '@/hooks/use-notice';
import { NotificationSendPanel } from '@/pages/system/notify/components/notification-send-panel';
import { toNotifyCategoryOptions } from '@/pages/system/notify/notify-category-options';
import type { NotifyCategoryOption } from '@/pages/system/notify/notify-category-options';
import { notifyService as defaultNotifyService } from '@/services/notify';
import type { NotifyTemplateDetailResp, NotifyTemplateResp } from '@/types/notify';
import { TemplateDetailModal } from './template-detail-modal';
import { TemplateFormModal } from './template-form-modal';
import {
  buildNotifyTemplatePageReq,
  toCreateNotifyTemplateReq,
  toNotifyTemplateFormValues,
  toUpdateNotifyTemplateReq,
} from './template-page-helpers';
import { createTemplateColumns } from './template-table-columns';
import type {
  NotifyTemplateFormState,
  NotifyTemplateFormValues,
  NotifyTemplateService,
  NotifyTemplateTableQuery,
} from './template-page-helpers';

interface TemplateManagementPageProps {
  readonly service?: NotifyTemplateService;
  readonly authService?: Pick<AuthManagementService, 'getOrgTree' | 'listRoles' | 'pageUsers'>;
}

export function TemplateManagementPage({
  service = defaultNotifyService,
  authService = defaultAuthManagementService,
}: TemplateManagementPageProps) {
  const actionRef = useRef<NebulaProTableAction | undefined>(undefined);
  const [form] = Form.useForm<NotifyTemplateFormValues>();
  const notice = useNotice();
  const [formState, setFormState] = useState<NotifyTemplateFormState>({ mode: 'create' });
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<NotifyTemplateDetailResp>();
  const [detailLoading, setDetailLoading] = useState(false);
  const [sendDrawerOpen, setSendDrawerOpen] = useState(false);
  const [sendTemplateId, setSendTemplateId] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [categoryOptions, setCategoryOptions] = useState<readonly NotifyCategoryOption[]>([]);

  useEffect(() => {
    let cancelled = false;
    void service.listNotifyCategories()
      .then((categories) => {
        if (!cancelled) setCategoryOptions(toNotifyCategoryOptions(categories));
      })
      .catch((error: unknown) => {
        // 类别列表只影响展示与下拉，拉取失败时退回「按 code 原样显示」，不阻塞模板页
        console.error('Failed to load notify categories', error instanceof Error ? error.message : String(error));
      });
    return () => {
      cancelled = true;
    };
  }, [service]);

  const requestTemplates = useCallback(
    (params: NotifyTemplateTableQuery & { readonly pageNum: number; readonly pageSize: number }) => (
      service.pageNotifyTemplates(buildNotifyTemplatePageReq(params))
    ),
    [service],
  );

  const closeForm = useCallback(() => {
    setFormOpen(false);
    setFormState({ mode: 'create' });
    form.resetFields();
  }, [form]);

  const openCreateForm = useCallback(() => {
    setFormState({ mode: 'create' });
    // resetFields 会回到表单 initialValues，其中已带出全部渠道的空变体
    form.resetFields();
    setFormOpen(true);
  }, [form]);

  const openEditForm = useCallback(async (record: NotifyTemplateResp) => {
    setFormState({ mode: 'update', templateId: record.id });
    form.resetFields();
    setFormOpen(true);
    setDetailLoading(true);
    try {
      const nextDetail = await service.getNotifyTemplate(record.id);
      form.setFieldsValue(toNotifyTemplateFormValues(nextDetail));
    } catch (error: unknown) {
      if (error instanceof Error) {
        notice.error('加载通知模板详情失败');
        closeForm();
        return;
      }
      throw error;
    } finally {
      setDetailLoading(false);
    }
  }, [closeForm, form, notice, service]);

  const openDetail = useCallback(async (record: NotifyTemplateResp) => {
    setDetail(undefined);
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      setDetail(await service.getNotifyTemplate(record.id));
    } catch (error: unknown) {
      if (error instanceof Error) {
        notice.error('加载通知模板详情失败');
        setDetailOpen(false);
        return;
      }
      throw error;
    } finally {
      setDetailLoading(false);
    }
  }, [notice, service]);

  const openSendDrawer = useCallback((record?: NotifyTemplateResp) => {
    setSendTemplateId(record?.id);
    setSendDrawerOpen(true);
  }, []);

  const closeSendDrawer = useCallback(() => {
    setSendDrawerOpen(false);
    setSendTemplateId(undefined);
  }, []);

  const submitTemplate = useCallback(async () => {
    const values = await form.validateFields();
    setSubmitting(true);
    try {
      switch (formState.mode) {
        case 'create':
          await service.createNotifyTemplate(toCreateNotifyTemplateReq(values));
          notice.success('通知模板创建成功');
          break;
        case 'update':
          await service.updateNotifyTemplate(formState.templateId, toUpdateNotifyTemplateReq(values));
          notice.success('通知模板更新成功');
          break;
      }
      closeForm();
      await actionRef.current?.reload();
    } catch (error: unknown) {
      if (error instanceof Error) {
        notice.error(formState.mode === 'create' ? '创建通知模板失败' : '更新通知模板失败');
        return;
      }
      throw error;
    } finally {
      setSubmitting(false);
    }
  }, [closeForm, form, formState, notice, service]);

  const removeTemplate = useCallback(async (record: NotifyTemplateResp) => {
    try {
      await service.deleteNotifyTemplate(record.id);
      notice.success('通知模板删除成功');
      await actionRef.current?.reload();
    } catch (error: unknown) {
      if (error instanceof Error) {
        notice.error('删除通知模板失败');
        return;
      }
      throw error;
    }
  }, [notice, service]);

  const columns = useMemo(() => createTemplateColumns({ openDetail, openEditForm, removeTemplate, categoryOptions }), [
    categoryOptions,
    openDetail,
    openEditForm,
    removeTemplate,
  ]);

  return (
    <>
      <NebulaProTable<NotifyTemplateResp, NotifyTemplateTableQuery>
        actionRef={actionRef}
        columns={columns}
        request={requestTemplates}
        onRequestError={() => notice.error('加载通知模板列表失败')}
        size="middle"
        scroll={{ x: 'max-content' }}
        toolBarRender={() => [
          <Access key="send" permission="NOTIFY_SEND" fallback={null}>
            <Button icon={<SendOutlined />} onClick={() => openSendDrawer()}>
              发送通知
            </Button>
          </Access>,
          <Access key="create" permission="NOTIFY_TEMPLATE_MANAGE" fallback={null}>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreateForm}>
              新增模板
            </Button>
          </Access>,
        ]}
      />
      <TemplateFormModal
        form={form}
        formState={formState}
        open={formOpen}
        submitting={submitting}
        detailLoading={detailLoading}
        categoryOptions={categoryOptions}
        onSubmit={() => void submitTemplate()}
        onCancel={closeForm}
      />
      <TemplateDetailModal
        open={detailOpen}
        loading={detailLoading}
        detail={detail}
        categoryOptions={categoryOptions}
        onCancel={() => setDetailOpen(false)}
      />
      <Drawer
        title="发送通知"
        open={sendDrawerOpen}
        size="large"
        destroyOnHidden
        onClose={closeSendDrawer}
      >
        {sendDrawerOpen ? (
          <NotificationSendPanel
            notifyService={service}
            authService={authService}
            initialTemplateId={sendTemplateId}
            showCard={false}
          />
        ) : null}
      </Drawer>
    </>
  );
}

export default TemplateManagementPage;
