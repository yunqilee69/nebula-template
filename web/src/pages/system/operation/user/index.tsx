import { useCallback, useEffect, useRef, useState } from 'react';
import { useNebulaI18n } from '@/hooks/use-nebula-i18n';
import { useNotice } from '@/hooks/use-notice';
import { authManagementService as defaultAuthManagementService } from '@/api/auth-management';
import type { AuthManagementService, CreateTenantInvitationReq } from '@/api/auth-management';
import type { BatchUpdateUserAssignmentsReq, CreateUserReq, OrgOptionResp, RoleOptionResp, UpdateUserReq, UserResp } from '@/types/auth-management';
import type { TenantInvitation } from '@/types/auth';
import { BatchAssignmentModal, type BatchAssignmentMode } from '../components/batch-assignment-modal';
import { UserFormDrawer } from './components/user-form-drawer';
import { InviteMemberModal } from './components/invite-member-modal';
import { UserTable, type UserTableHandle } from './components/user-table';
import type { UserDrawerFormValues } from './components/user-page-shared';

export interface UserManagementPageProps {
  service?: AuthManagementService;
}

type DrawerMode = 'create' | 'update';

export function UserManagementPage({ service: serviceProp }: UserManagementPageProps) {
  const service = serviceProp ?? defaultAuthManagementService;
  const { t } = useNebulaI18n();
  const notice = useNotice();

  const tableRef = useRef<UserTableHandle>(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<DrawerMode>('create');
  const [drawerTitle, setDrawerTitle] = useState(t('auth.userManagement.modal.createTitle'));
  const [editingUserId, setEditingUserId] = useState<string>();
  const [drawerInitialValues, setDrawerInitialValues] = useState<Partial<UserDrawerFormValues>>();
  const [submitting, setSubmitting] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false);
  const [batchAssignmentOpen, setBatchAssignmentOpen] = useState(false);
  const [batchAssignmentSubmitting, setBatchAssignmentSubmitting] = useState(false);
  const [batchAssignmentUserIds, setBatchAssignmentUserIds] = useState<readonly string[]>([]);
  const [batchAssignmentUserNames, setBatchAssignmentUserNames] = useState<readonly string[]>([]);
  const [batchAssignmentMode, setBatchAssignmentMode] = useState<BatchAssignmentMode>('both');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [invitation, setInvitation] = useState<TenantInvitation | null>(null);

  const [roles, setRoles] = useState<RoleOptionResp[]>([]);
  const [orgs, setOrgs] = useState<OrgOptionResp[]>([]);

  useEffect(() => {
    let cancelled = false;

    Promise.all([service.listRoles(), service.listOrgs()])
      .then(([roleList, orgList]) => {
        if (!cancelled) {
          setRoles(roleList);
          setOrgs(orgList);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          notice.error(t('auth.userManagement.feedback.optionsLoadFailed'));
          const message = error instanceof Error ? error.message : String(error);
          console.error('Failed to load roles/orgs', message);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [service, notice, t]);

  const openCreateDrawer = useCallback(() => {
    setDrawerMode('create');
    setDrawerTitle(t('auth.userManagement.modal.createTitle'));
    setEditingUserId(undefined);
    setDrawerInitialValues(undefined);
    setDrawerOpen(true);
  }, [t]);

  const openUpdateDrawer = useCallback(
    async (record: UserResp) => {
      setDrawerMode('update');
      setDrawerTitle(t('auth.userManagement.modal.editTitle'));
      setEditingUserId(record.id);
      setDrawerInitialValues(undefined);
      setDrawerOpen(true);
      setDetailLoading(true);
      try {
        const detail = await service.getUserDetail(record.id);
        setDrawerInitialValues({
          username: detail.username,
          nickname: detail.nickname,
          email: detail.email,
          phone: detail.phone,
          status: detail.status,
          roleIds: detail.roles?.map((r) => r.id),
          orgIds: detail.organizations?.map((o) => o.id),
        });
      } catch (error: unknown) {
        notice.error(t('auth.userManagement.feedback.detailLoadFailed'));
        const message = error instanceof Error ? error.message : String(error);
        console.error('Failed to load user detail', message);
        setDrawerOpen(false);
      } finally {
        setDetailLoading(false);
      }
    },
    [service, notice, t],
  );

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    setEditingUserId(undefined);
    setDrawerInitialValues(undefined);
  }, []);

  const handleSubmit = useCallback(
    async (values: UserDrawerFormValues) => {
      setSubmitting(true);
      try {
        if (drawerMode === 'create') {
          const payload: CreateUserReq = {
            username: values.username,
            password: values.password ?? '',
            nickname: values.nickname,
            email: values.email,
            phone: values.phone,
            status: values.status,
            roleIds: values.roleIds,
            orgIds: values.orgIds,
          };
          await service.createUser(payload);
          notice.success(t('auth.userManagement.feedback.createSuccess'));
        } else if (editingUserId) {
          const payload: UpdateUserReq = {
            id: editingUserId,
            nickname: values.nickname,
            email: values.email,
            phone: values.phone,
            status: values.status,
            roleIds: values.roleIds,
            orgIds: values.orgIds,
          };
          await service.updateUser(payload);
          notice.success(t('auth.userManagement.feedback.updateSuccess'));
        }
        closeDrawer();
        await tableRef.current?.reload();
      } catch (error: unknown) {
        notice.error(drawerMode === 'create' ? t('auth.userManagement.feedback.createFailed') : t('auth.userManagement.feedback.updateFailed'));
        const message = error instanceof Error ? error.message : String(error);
        console.error('User submit failed', message);
      } finally {
        setSubmitting(false);
      }
    },
    [closeDrawer, drawerMode, editingUserId, notice, service, t],
  );

  const resetUserPasswords = useCallback(
    async (userIds: readonly string[]) => {
      if (userIds.length === 0) return;

      setResetPasswordLoading(true);
      try {
        await Promise.all(userIds.map((userId) => service.resetUserPassword(userId)));
        notice.success(t('auth.userManagement.feedback.resetPasswordSuccess'));
      } catch (error: unknown) {
        notice.error(t('auth.userManagement.feedback.resetPasswordFailed'));
        const message = error instanceof Error ? error.message : String(error);
        console.error('User password reset failed', message);
      } finally {
        setResetPasswordLoading(false);
      }
    },
    [notice, service, t],
  );

  const openBatchAssignment = useCallback((users: readonly UserResp[], mode: Exclude<BatchAssignmentMode, 'both'>) => {
    if (users.length === 0) return;
    setBatchAssignmentUserIds(users.map((user) => user.id));
    setBatchAssignmentUserNames(users.map((user) => user.nickname || user.username));
    setBatchAssignmentMode(mode);
    setBatchAssignmentOpen(true);
  }, []);

  const closeBatchAssignment = useCallback(() => {
    setBatchAssignmentOpen(false);
    setBatchAssignmentUserIds([]);
    setBatchAssignmentUserNames([]);
  }, []);

  const submitBatchAssignment = useCallback(
    async (data: BatchUpdateUserAssignmentsReq) => {
      setBatchAssignmentSubmitting(true);
      try {
        await service.batchUpdateUserAssignments(data);
        notice.success(t('auth.assignment.feedback.success'));
        closeBatchAssignment();
        tableRef.current?.clearSelection();
        await tableRef.current?.reload();
      } catch (error: unknown) {
        notice.error(t('auth.assignment.feedback.failed'));
        const message = error instanceof Error ? error.message : String(error);
        console.error('Batch user assignment failed', message);
      } finally {
        setBatchAssignmentSubmitting(false);
      }
    },
    [closeBatchAssignment, notice, service, t],
  );

  const openInvite = useCallback(() => {
    setInvitation(null);
    setInviteOpen(true);
  }, []);

  const closeInvite = useCallback(() => {
    setInviteOpen(false);
    setInvitation(null);
  }, []);

  const submitInvite = useCallback(
    async (values: CreateTenantInvitationReq) => {
      setInviteSubmitting(true);
      try {
        const created = await service.createTenantInvitation(values);
        setInvitation(created);
      } catch (error: unknown) {
        notice.error(t('auth.userManagement.feedback.inviteFailed'));
        const message = error instanceof Error ? error.message : String(error);
        console.error('Create tenant invitation failed', message);
      } finally {
        setInviteSubmitting(false);
      }
    },
    [notice, service, t],
  );

  return (
    <>
      <UserTable
        ref={tableRef}
        service={service}
        roles={roles}
        orgs={orgs}
        onAddUser={openCreateDrawer}
        onInviteUser={openInvite}
        onEditUser={(record) => void openUpdateDrawer(record)}
        onResetPassword={resetUserPasswords}
        onBatchAssign={openBatchAssignment}
        resetPasswordLoading={resetPasswordLoading}
        batchAssignLoading={batchAssignmentSubmitting}
      />
      <UserFormDrawer
        open={drawerOpen}
        title={drawerTitle}
        mode={drawerMode}
        initialValues={drawerInitialValues}
        submitting={submitting || detailLoading}
        roles={roles}
        orgs={orgs}
        onClose={closeDrawer}
        onSubmit={(values) => void handleSubmit(values)}
      />
      <BatchAssignmentModal
        open={batchAssignmentOpen}
        selectedUserIds={batchAssignmentUserIds}
        selectedUserNames={batchAssignmentUserNames}
        roles={roles}
        orgs={orgs}
        submitting={batchAssignmentSubmitting}
        mode={batchAssignmentMode}
        onCancel={closeBatchAssignment}
        onSubmit={submitBatchAssignment}
      />
      <InviteMemberModal
        open={inviteOpen}
        roles={roles}
        orgs={orgs}
        submitting={inviteSubmitting}
        invitation={invitation}
        onCancel={closeInvite}
        onSubmit={(values) => void submitInvite(values)}
      />
    </>
  );
}

export default UserManagementPage;
