import { UserSelect } from '@/components/user-select';
import { authManagementService as defaultAuthManagementService } from '@/api/auth-management';
import type { AuthManagementService } from '@/api/auth-management';
import { roleService as defaultRoleService, type RoleService } from '@/api/role';
import { BatchAssignmentModal } from '../components/batch-assignment-modal';
import { RoleFormModal } from './role-form-modal';
import { RoleUsersTable } from './role-users-table';
import { RoleWorkspace } from './role-workspace';
import { useRoleManagementController } from './use-role-management-controller';

export interface RoleManagementPageProps {
  roleService?: RoleService;
  authService?: AuthManagementService;
  defaultPageSize?: number;
}

export function RoleManagementPage({ roleService = defaultRoleService, authService = defaultAuthManagementService }: RoleManagementPageProps) {
  const controller = useRoleManagementController({ roleService, authService });

  return (
    <>
      <RoleWorkspace
        roles={controller.roles}
        selectedScope={controller.selectedScope}
        onSelectScope={controller.setSelectedScope}
        onCreateRole={controller.openCreateModal}
        onEditRole={controller.openUpdateModal}
        onDeleteRole={controller.removeRole}
      >
        <RoleUsersTable
          key={controller.selectedScope.key}
          ref={controller.usersTableRef}
          service={authService}
          scope={controller.selectedScope}
          onBindUsers={controller.openUserSelect}
          onUnbindUsers={controller.unbindUsers}
          onAssignUsers={controller.openAssignment}
          bindingLoading={controller.bindingSubmitting}
          assignmentLoading={controller.assignmentSubmitting}
        />
      </RoleWorkspace>

      <RoleFormModal
        form={controller.form}
        mode={controller.formMode}
        open={controller.modalOpen}
        submitting={controller.submitting}
        detailLoading={controller.detailLoading}
        onSubmit={() => void controller.submitRole()}
        onCancel={controller.closeModal}
      />
      <BatchAssignmentModal
        open={controller.assignmentOpen}
        selectedUserIds={controller.assignmentUserIds}
        selectedUserNames={controller.assignmentUserNames}
        roles={controller.roles}
        orgs={controller.orgs}
        submitting={controller.assignmentSubmitting}
        mode="roles"
        onCancel={controller.closeAssignment}
        onSubmit={controller.submitAssignment}
      />
      <UserSelect
        open={controller.userSelectOpen}
        title={controller.t('auth.roleManagement.addUsers.title')}
        mode="multiple"
        treeData={[]}
        roles={controller.roles}
        service={authService}
        disabled={controller.bindingSubmitting}
        onClose={controller.closeUserSelect}
        onChange={(value) => void controller.bindSelectedUsers(value)}
      />
    </>
  );
}
