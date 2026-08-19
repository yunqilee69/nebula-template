import { Form } from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNebulaI18n } from '@/hooks/use-nebula-i18n';
import { useNotice } from '@/hooks/use-notice';
import type { AuthManagementService } from '@/api/auth-management';
import type { RoleService } from '@/api/role';
import type { BatchUpdateUserAssignmentsReq, OrgOptionResp, RoleOptionResp, UserResp } from '@/types/auth-management';
import type { CreateRoleReq, UpdateRoleReq } from '@/types/role';
import type { RoleFormMode, RoleFormValues } from './role-form-modal';
import type { RoleUserScope, RoleUsersTableHandle } from './role-users-table';
import { ROLE_SCOPE_WITH_ROLE_KEY } from './role-workspace';

interface UseRoleManagementControllerOptions {
  readonly roleService: RoleService;
  readonly authService: AuthManagementService;
}

function normalizeOptionalText(value: string | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function describeError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export function useRoleManagementController({ roleService, authService }: UseRoleManagementControllerOptions) {
  const usersTableRef = useRef<RoleUsersTableHandle>(null);
  const { t } = useNebulaI18n();
  const notice = useNotice();
  const [form] = Form.useForm<RoleFormValues>();
  const [modalOpen, setModalOpen] = useState(false);
  const [assignmentOpen, setAssignmentOpen] = useState(false);
  const [userSelectOpen, setUserSelectOpen] = useState(false);
  const [assignmentSubmitting, setAssignmentSubmitting] = useState(false);
  const [bindingSubmitting, setBindingSubmitting] = useState(false);
  const [assignmentUserIds, setAssignmentUserIds] = useState<readonly string[]>([]);
  const [assignmentUserNames, setAssignmentUserNames] = useState<readonly string[]>([]);
  const [formMode, setFormMode] = useState<RoleFormMode>('create');
  const [editingRoleId, setEditingRoleId] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [roles, setRoles] = useState<RoleOptionResp[]>([]);
  const [orgs, setOrgs] = useState<OrgOptionResp[]>([]);
  const [selectedScope, setSelectedScope] = useState<RoleUserScope>({
    kind: 'withRole',
    key: ROLE_SCOPE_WITH_ROLE_KEY,
    title: t('auth.assignment.tabs.globalRoleUsers'),
  });

  const refreshRoleOptions = useCallback(async () => {
    setRoles(await authService.listRoles());
  }, [authService]);

  useEffect(() => {
    let cancelled = false;

    Promise.all([authService.listRoles(), authService.listOrgs()])
      .then(([roleList, orgList]) => {
        if (!cancelled) {
          setRoles(roleList);
          setOrgs(orgList);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          notice.error(t('auth.userManagement.feedback.optionsLoadFailed'));
          console.error('Failed to load roles/orgs for role assignment', describeError(error));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authService, notice, t]);

  const openCreateModal = useCallback(() => {
    setFormMode('create');
    setEditingRoleId(undefined);
    form.resetFields();
    form.setFieldsValue({ status: 1 });
    setModalOpen(true);
  }, [form]);

  const openUpdateModal = useCallback(async (roleId: string) => {
    setFormMode('update');
    setEditingRoleId(roleId);
    form.resetFields();
    setModalOpen(true);
    setDetailLoading(true);
    try {
      const detail = await roleService.getRoleById(roleId);
      form.setFieldsValue({
        name: detail.name,
        code: detail.code,
        description: detail.description,
        status: detail.status,
      });
    } catch (error: unknown) {
      notice.error(t('auth.roleManagement.feedback.detailLoadFailed'));
      console.error('Failed to load role detail', describeError(error));
      setModalOpen(false);
    } finally {
      setDetailLoading(false);
    }
  }, [form, notice, roleService, t]);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditingRoleId(undefined);
    form.resetFields();
  }, [form]);

  const submitRole = useCallback(async () => {
    const values = await form.validateFields();
    const payload: CreateRoleReq = {
      name: values.name.trim(),
      code: values.code.trim(),
      description: normalizeOptionalText(values.description),
      status: values.status,
    };

    setSubmitting(true);
    try {
      if (formMode === 'create') {
        await roleService.createRole(payload);
        notice.success(t('auth.roleManagement.feedback.createSuccess'));
      } else if (editingRoleId) {
        const updatePayload: UpdateRoleReq = { id: editingRoleId, ...payload };
        await roleService.updateRole(editingRoleId, updatePayload);
        notice.success(t('auth.roleManagement.feedback.updateSuccess'));
      }
      closeModal();
      await refreshRoleOptions();
      await usersTableRef.current?.reload();
    } finally {
      setSubmitting(false);
    }
  }, [closeModal, editingRoleId, form, formMode, notice, refreshRoleOptions, roleService, t]);

  const removeRole = useCallback(async (roleId: string) => {
    await roleService.removeRole(roleId);
    notice.success(t('auth.roleManagement.feedback.deleteSuccess'));
    if (selectedScope.kind === 'role' && selectedScope.roleId === roleId) {
      setSelectedScope({ kind: 'withRole', key: ROLE_SCOPE_WITH_ROLE_KEY, title: t('auth.assignment.tabs.globalRoleUsers') });
    }
    await refreshRoleOptions();
    await usersTableRef.current?.reload();
  }, [notice, refreshRoleOptions, roleService, selectedScope, t]);

  const openAssignment = useCallback((users: readonly UserResp[]) => {
    if (users.length === 0) return;
    setAssignmentUserIds(users.map((user) => user.id));
    setAssignmentUserNames(users.map((user) => user.nickname || user.username));
    setAssignmentOpen(true);
  }, []);

  const closeAssignment = useCallback(() => {
    setAssignmentOpen(false);
    setAssignmentUserIds([]);
    setAssignmentUserNames([]);
  }, []);

  const submitAssignment = useCallback(async (data: BatchUpdateUserAssignmentsReq) => {
    setAssignmentSubmitting(true);
    try {
      await authService.batchUpdateUserAssignments(data);
      notice.success(t('auth.assignment.feedback.success'));
      closeAssignment();
      usersTableRef.current?.clearSelection();
      await usersTableRef.current?.reload();
    } catch (error: unknown) {
      notice.error(t('auth.assignment.feedback.failed'));
      console.error('Role unassigned user assignment failed', describeError(error));
    } finally {
      setAssignmentSubmitting(false);
    }
  }, [authService, closeAssignment, notice, t]);

  const openUserSelect = useCallback(() => setUserSelectOpen(true), []);
  const closeUserSelect = useCallback(() => setUserSelectOpen(false), []);

  const bindSelectedUsers = useCallback(async (value: string | string[] | undefined) => {
    if (selectedScope.kind !== 'role') return;
    const userIds = Array.isArray(value) ? value : value ? [value] : [];
    if (userIds.length === 0) {
      closeUserSelect();
      return;
    }
    setBindingSubmitting(true);
    try {
      await authService.batchUpdateUserAssignments({
        userIds,
        roleIds: [selectedScope.roleId],
        orgIds: null,
        operation: 'ADD',
      });
      notice.success(t('auth.assignment.feedback.success'));
      closeUserSelect();
      await usersTableRef.current?.reload();
    } catch (error: unknown) {
      notice.error(t('auth.assignment.feedback.failed'));
      console.error('Role user bind failed', describeError(error));
    } finally {
      setBindingSubmitting(false);
    }
  }, [authService, closeUserSelect, notice, selectedScope, t]);

  const unbindUsers = useCallback(async (userIds: readonly string[]) => {
    if (selectedScope.kind !== 'role' || userIds.length === 0) return;
    setAssignmentSubmitting(true);
    try {
      await authService.batchUpdateUserAssignments({
        userIds,
        roleIds: [selectedScope.roleId],
        orgIds: null,
        operation: 'REMOVE',
      });
      notice.success(t('auth.assignment.feedback.removeSuccess'));
    } catch (error: unknown) {
      notice.error(t('auth.assignment.feedback.removeFailed'));
      console.error('Role user unbind failed', describeError(error));
    } finally {
      setAssignmentSubmitting(false);
    }
  }, [authService, notice, selectedScope, t]);

  return {
    t,
    usersTableRef,
    form,
    modalOpen,
    assignmentOpen,
    userSelectOpen,
    assignmentSubmitting,
    bindingSubmitting,
    assignmentUserIds,
    assignmentUserNames,
    formMode,
    submitting,
    detailLoading,
    roles,
    orgs,
    selectedScope,
    setSelectedScope,
    openCreateModal,
    openUpdateModal,
    closeModal,
    submitRole,
    removeRole,
    openAssignment,
    closeAssignment,
    submitAssignment,
    openUserSelect,
    closeUserSelect,
    bindSelectedUsers,
    unbindUsers,
  };
}
