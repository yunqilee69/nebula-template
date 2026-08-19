import { Modal } from 'antd';
import { useCallback, useRef, useState } from 'react';
import { useNebulaI18n } from '@/hooks/use-nebula-i18n';
import { useNotice } from '@/hooks/use-notice';
import type { AuthManagementService } from '@/api/auth-management';
import type { BatchUpdateUserAssignmentsReq, OrgResp, OrgTreeResp } from '@/types/auth-management';
import {
  buildCreatePayload,
  buildUpdatePayload,
  type OrgDrawerFormValues,
} from './components/org-form-drawer';
import type { OrgTableHandle } from './components/org-table';
import { useOrgManagementData } from './use-org-management-data';

interface UseOrgManagementControllerOptions {
  readonly service: AuthManagementService;
}

function describeError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export function useOrgManagementController({ service }: UseOrgManagementControllerOptions) {
  const { t } = useNebulaI18n();
  const notice = useNotice();
  const [modalApi, modalContextHolder] = Modal.useModal();
  const tableRef = useRef<OrgTableHandle>(null);
  const { tree, orgs, roles, refreshTreeAndOrgs } = useOrgManagementData({ service });

  const [modalOpen, setModalOpen] = useState(false);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [assignmentOpen, setAssignmentOpen] = useState(false);
  const [assignmentSubmitting, setAssignmentSubmitting] = useState(false);
  const [assignmentUserIds, setAssignmentUserIds] = useState<readonly string[]>([]);
  const [unassignedTableKey, setUnassignedTableKey] = useState(0);
  const [orgUsersTableKey, setOrgUsersTableKey] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingOrgId, setEditingOrgId] = useState<string>();
  const [drawerInitialValues, setDrawerInitialValues] = useState<Partial<OrgDrawerFormValues>>();
  const [drawerSubmitting, setDrawerSubmitting] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [moveOrgOpen, setMoveOrgOpen] = useState(false);
  const [movingOrg, setMovingOrg] = useState<OrgTreeResp>();
  const [moveSubmitting, setMoveSubmitting] = useState(false);
  const [addUsersOpen, setAddUsersOpen] = useState(false);
  const [addUsersSubmitting, setAddUsersSubmitting] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState<string | undefined>();
  const [showUnassignedUsers, setShowUnassignedUsers] = useState(false);

  const openCreateModal = useCallback(() => setModalOpen(true), []);
  const closeModal = useCallback(() => setModalOpen(false), []);

  const openUpdateDrawer = useCallback(async (record: OrgResp) => {
    setEditingOrgId(record.id);
    setDrawerInitialValues(undefined);
    setDrawerOpen(true);
    setDetailLoading(true);
    try {
      const detail = await service.getOrgDetail(record.id);
      setDrawerInitialValues({
        name: detail.name,
        code: detail.code,
        parentId: detail.parentId,
        type: detail.type,
        status: detail.status,
      });
    } catch (error: unknown) {
      notice.error(t('auth.orgManagement.feedback.detailLoadFailed'));
      console.error('Failed to load org detail', describeError(error));
      setDrawerOpen(false);
    } finally {
      setDetailLoading(false);
    }
  }, [service, notice, t]);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    setEditingOrgId(undefined);
    setDrawerInitialValues(undefined);
  }, []);

  const handleModalSubmit = useCallback(async (values: OrgDrawerFormValues) => {
    setModalSubmitting(true);
    try {
      await service.createOrg(buildCreatePayload(values));
      notice.success(t('auth.orgManagement.feedback.createSuccess'));
      closeModal();
      await refreshTreeAndOrgs();
      await tableRef.current?.reload();
    } catch (error: unknown) {
      notice.error(t('auth.orgManagement.feedback.createFailed'));
      console.error('Org create failed', describeError(error));
    } finally {
      setModalSubmitting(false);
    }
  }, [closeModal, notice, refreshTreeAndOrgs, service, t]);

  const handleDrawerSubmit = useCallback(async (values: OrgDrawerFormValues) => {
    if (!editingOrgId) return;
    setDrawerSubmitting(true);
    try {
      await service.updateOrg(buildUpdatePayload(editingOrgId, values));
      notice.success(t('auth.orgManagement.feedback.updateSuccess'));
      closeDrawer();
      await refreshTreeAndOrgs();
      await tableRef.current?.reload();
    } catch (error: unknown) {
      notice.error(t('auth.orgManagement.feedback.updateFailed'));
      console.error('Org update failed', describeError(error));
    } finally {
      setDrawerSubmitting(false);
    }
  }, [closeDrawer, editingOrgId, notice, refreshTreeAndOrgs, service, t]);

  const openAssignment = useCallback((userId: string) => {
    setAssignmentUserIds([userId]);
    setAssignmentOpen(true);
  }, []);

  const selectOrg = useCallback((orgId: string) => {
    setSelectedOrgId(orgId);
    setShowUnassignedUsers(false);
  }, []);

  const selectUnassignedUsers = useCallback(() => {
    setSelectedOrgId(undefined);
    setShowUnassignedUsers(true);
  }, []);

  const closeAssignment = useCallback(() => {
    setAssignmentOpen(false);
    setAssignmentUserIds([]);
  }, []);

  const submitAssignment = useCallback(async (data: BatchUpdateUserAssignmentsReq) => {
    setAssignmentSubmitting(true);
    try {
      await service.batchUpdateUserAssignments(data);
      notice.success(t('auth.assignment.feedback.success'));
      closeAssignment();
      setUnassignedTableKey((value) => value + 1);
    } catch (error: unknown) {
      notice.error(t('auth.assignment.feedback.failed'));
      console.error('Org unassigned user assignment failed', describeError(error));
    } finally {
      setAssignmentSubmitting(false);
    }
  }, [closeAssignment, notice, service, t]);

  const openMoveOrg = useCallback((org: OrgTreeResp) => {
    setMovingOrg(org);
    setMoveOrgOpen(true);
  }, []);

  const closeMoveOrg = useCallback(() => {
    setMoveOrgOpen(false);
    setMovingOrg(undefined);
  }, []);

  const submitMoveOrg = useCallback(async (newParentId: string) => {
    if (!movingOrg) return;
    setMoveSubmitting(true);
    try {
      await service.updateOrg({ id: movingOrg.id, parentId: newParentId });
      notice.success(t('auth.orgManagement.feedback.moveSuccess'));
      closeMoveOrg();
      await refreshTreeAndOrgs();
      await tableRef.current?.reload();
    } catch (error: unknown) {
      notice.error(t('auth.orgManagement.feedback.moveFailed'));
      console.error('Org move failed', describeError(error));
    } finally {
      setMoveSubmitting(false);
    }
  }, [closeMoveOrg, movingOrg, notice, refreshTreeAndOrgs, service, t]);

  const deleteOrg = useCallback(async (org: OrgTreeResp) => {
    try {
      await service.deleteOrg(org.id);
      notice.success(t('auth.orgManagement.feedback.deleteSuccess'));
      if (selectedOrgId === org.id) {
        setSelectedOrgId(undefined);
      }
      await refreshTreeAndOrgs();
      await tableRef.current?.reload();
    } catch (error: unknown) {
      notice.error(t('auth.orgManagement.feedback.deleteFailed'));
      console.error('Org delete failed', describeError(error));
    }
  }, [notice, refreshTreeAndOrgs, selectedOrgId, service, t]);

  const confirmDeleteOrg = useCallback((org: OrgTreeResp) => {
    modalApi.confirm({
      title: `${t('auth.orgManagement.actions.delete')}?`,
      okText: t('auth.orgManagement.actions.delete'),
      cancelText: t('auth.orgManagement.actions.cancel'),
      okButtonProps: { danger: true },
      onOk: () => deleteOrg(org),
    });
  }, [deleteOrg, modalApi, t]);

  const openAddUsersToOrg = useCallback(() => setAddUsersOpen(true), []);

  const closeAddUsersToOrg = useCallback(() => {
    if (!addUsersSubmitting) {
      setAddUsersOpen(false);
    }
  }, [addUsersSubmitting]);

  const submitAddUsersToOrg = useCallback(async (userIds: string[]) => {
    if (!selectedOrgId || userIds.length === 0) {
      setAddUsersOpen(false);
      return;
    }
    setAddUsersSubmitting(true);
    try {
      await service.batchUpdateUserAssignments({ userIds, orgIds: [selectedOrgId] });
      notice.success(t('auth.orgManagement.feedback.addUsersSuccess'));
      setAddUsersOpen(false);
      setOrgUsersTableKey((value) => value + 1);
    } catch (error: unknown) {
      notice.error(t('auth.orgManagement.feedback.addUsersFailed'));
      console.error('Org add users failed', describeError(error));
    } finally {
      setAddUsersSubmitting(false);
    }
  }, [notice, selectedOrgId, service, t]);

  return {
    t,
    modalContextHolder,
    tableRef,
    tree,
    orgs,
    roles,
    selectedOrgId,
    showUnassignedUsers,
    unassignedTableKey,
    orgUsersTableKey,
    modalOpen,
    modalSubmitting,
    drawerOpen,
    drawerInitialValues,
    drawerSubmitting,
    detailLoading,
    assignmentOpen,
    assignmentSubmitting,
    assignmentUserIds,
    moveOrgOpen,
    movingOrg,
    moveSubmitting,
    addUsersOpen,
    openCreateModal,
    openUpdateDrawer,
    closeModal,
    closeDrawer,
    handleModalSubmit,
    handleDrawerSubmit,
    openAssignment,
    closeAssignment,
    submitAssignment,
    selectOrg,
    selectUnassignedUsers,
    openMoveOrg,
    closeMoveOrg,
    submitMoveOrg,
    confirmDeleteOrg,
    openAddUsersToOrg,
    closeAddUsersToOrg,
    submitAddUsersToOrg,
  };
}
