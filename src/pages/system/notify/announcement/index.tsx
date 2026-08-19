import { Form } from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';
import { authManagementService, type AuthManagementService } from '@/api/auth-management';
import type { NebulaProTableAction } from '@/components/nebula-pro-table';
import { useNotice } from '@/hooks/use-notice';
import { notifyService, type NotifyService } from '@/services/notify';
import type { OrgTreeResp, RoleOptionResp } from '@/types/auth-management';
import type { AnnouncementResp, AnnouncementStatus } from '@/types/notify';
import { AnnouncementFormDrawer } from './announcement-form-drawer';
import { AnnouncementTable } from './announcement-table';
import {
  DEFAULT_ANNOUNCEMENT_VALUES,
  type AnnouncementFormValues,
  toAnnouncementFormValues,
  toAnnouncementRequest,
} from './announcement-shared';

interface AnnouncementManagementPageProps {
  readonly service?: NotifyService;
  readonly authService?: AuthManagementService;
}

export function AnnouncementManagementPage({
  service = notifyService,
  authService = authManagementService,
}: AnnouncementManagementPageProps) {
  const notice = useNotice();
  const [form] = Form.useForm<AnnouncementFormValues>();
  const actionRef = useRef<NebulaProTableAction | undefined>(undefined);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit'>('create');
  const [editingId, setEditingId] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [roles, setRoles] = useState<RoleOptionResp[]>([]);
  const [orgTree, setOrgTree] = useState<OrgTreeResp[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [optionsError, setOptionsError] = useState(false);

  const loadOptions = useCallback(async () => {
    setOptionsLoading(true);
    setOptionsError(false);
    try {
      const [roleOptions, organizationTree] = await Promise.all([
        authService.listRoles(),
        authService.getOrgTree(),
      ]);
      setRoles(roleOptions);
      setOrgTree(organizationTree);
    } catch (error: unknown) {
      if (!(error instanceof Error)) throw error;
      setOptionsError(true);
      notice.error('发送目标加载失败');
    } finally {
      setOptionsLoading(false);
    }
  }, [authService, notice]);

  useEffect(() => {
    void loadOptions();
  }, [loadOptions]);

  const closeDrawer = () => {
    if (submitting) return;
    setDrawerOpen(false);
    setEditingId(undefined);
    form.resetFields();
  };

  const openCreate = () => {
    setDrawerMode('create');
    setEditingId(undefined);
    form.setFieldsValue(DEFAULT_ANNOUNCEMENT_VALUES);
    setDrawerOpen(true);
  };

  const openEdit = async (announcement: AnnouncementResp) => {
    setDrawerMode('edit');
    setEditingId(announcement.id);
    setDrawerOpen(true);
    setDetailLoading(true);
    form.resetFields();
    try {
      const detail = await service.getAnnouncement(announcement.id);
      form.setFieldsValue(toAnnouncementFormValues(detail));
    } catch (error: unknown) {
      if (!(error instanceof Error)) throw error;
      notice.error('公告详情加载失败');
      setDrawerOpen(false);
      setEditingId(undefined);
    } finally {
      setDetailLoading(false);
    }
  };

  const submitAnnouncement = async (values: AnnouncementFormValues, status: AnnouncementStatus) => {
    setSubmitting(true);
    try {
      const request = toAnnouncementRequest(values, status);
      if (drawerMode === 'edit' && editingId) {
        await service.updateAnnouncement(editingId, request);
        notice.success('公告更新成功');
      } else {
        await service.createAnnouncement(request);
        notice.success('公告创建成功');
      }
      setDrawerOpen(false);
      setEditingId(undefined);
      form.resetFields();
      actionRef.current?.reload();
    } catch (error: unknown) {
      if (!(error instanceof Error)) throw error;
      notice.error(drawerMode === 'edit' ? '公告更新失败' : '公告创建失败');
    } finally {
      setSubmitting(false);
    }
  };

  const publishAnnouncement = async (announcement: AnnouncementResp) => {
    try {
      await service.updateAnnouncement(announcement.id, { status: 1 });
      notice.success('公告发布成功');
      actionRef.current?.reload();
    } catch (error: unknown) {
      if (!(error instanceof Error)) throw error;
      notice.error('公告发布失败');
    }
  };

  const archiveAnnouncement = async (announcement: AnnouncementResp) => {
    try {
      await service.updateAnnouncement(announcement.id, { status: 2 });
      notice.success('公告废弃成功');
      actionRef.current?.reload();
    } catch (error: unknown) {
      if (!(error instanceof Error)) throw error;
      notice.error('公告废弃失败');
    }
  };

  return (
    <>
      <AnnouncementTable
        service={service}
        actionRef={actionRef}
        onCreate={openCreate}
        onEdit={announcement => void openEdit(announcement)}
        onPublish={announcement => void publishAnnouncement(announcement)}
        onArchive={announcement => void archiveAnnouncement(announcement)}
        onLoadError={() => notice.error('公告列表加载失败')}
      />
      <AnnouncementFormDrawer
        open={drawerOpen}
        mode={drawerMode}
        form={form}
        roles={roles}
        orgTree={orgTree}
        userService={authService}
        optionsLoading={optionsLoading}
        optionsError={optionsError}
        detailLoading={detailLoading}
        submitting={submitting}
        onRetryOptions={() => void loadOptions()}
        onClose={closeDrawer}
        onSubmit={(values, status) => void submitAnnouncement(values, status)}
      />
    </>
  );
}

export default AnnouncementManagementPage;
