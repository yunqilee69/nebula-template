import { authManagementService as defaultAuthManagementService } from '@/api/auth-management';
import type { AuthManagementService } from '@/api/auth-management';
import { BatchAssignmentModal } from '../components/batch-assignment-modal';
import { OrgFormDrawer } from './components/org-form-drawer';
import { OrgFormModal } from './components/org-form-modal';
import { AddUsersToOrgModal } from './components/add-users-to-org-modal';
import { MoveOrgModal } from './components/move-org-modal';
import { OrgWorkspace } from './components/org-workspace';
import { useOrgManagementController } from './use-org-management-controller';

export interface OrgManagementPageProps {
  service?: AuthManagementService;
}

export function OrgManagementPage({ service: serviceProp }: OrgManagementPageProps) {
  const service = serviceProp ?? defaultAuthManagementService;
  const controller = useOrgManagementController({ service });

  return (
    <>
      {controller.modalContextHolder}
      <OrgWorkspace
        service={service}
        tableRef={controller.tableRef}
        tree={controller.tree}
        selectedOrgId={controller.selectedOrgId}
        showUnassignedUsers={controller.showUnassignedUsers}
        unassignedTableKey={controller.unassignedTableKey}
        orgUsersTableKey={controller.orgUsersTableKey}
        onSelectOrg={controller.selectOrg}
        onShowUnassignedUsers={controller.selectUnassignedUsers}
        onCreateOrg={controller.openCreateModal}
        onEditOrg={controller.openUpdateDrawer}
        onMoveOrg={controller.openMoveOrg}
        onDeleteOrg={controller.confirmDeleteOrg}
        onAddUsersToOrg={controller.openAddUsersToOrg}
        onAssignUser={controller.openAssignment}
      />
      <OrgFormModal
        open={controller.modalOpen}
        title={controller.t('auth.orgManagement.modal.createTitle')}
        submitting={controller.modalSubmitting}
        orgs={controller.orgs}
        onClose={controller.closeModal}
        onSubmit={(values) => void controller.handleModalSubmit(values)}
      />
      <OrgFormDrawer
        open={controller.drawerOpen}
        title={controller.t('auth.orgManagement.modal.editTitle')}
        initialValues={controller.drawerInitialValues}
        submitting={controller.drawerSubmitting || controller.detailLoading}
        orgs={controller.orgs}
        onClose={controller.closeDrawer}
        onSubmit={(values) => void controller.handleDrawerSubmit(values)}
      />
      <BatchAssignmentModal
        open={controller.assignmentOpen}
        selectedUserIds={controller.assignmentUserIds}
        roles={controller.roles}
        orgs={controller.orgs}
        submitting={controller.assignmentSubmitting}
        mode="orgs"
        onCancel={controller.closeAssignment}
        onSubmit={controller.submitAssignment}
      />
      <MoveOrgModal
        open={controller.moveOrgOpen}
        org={controller.movingOrg}
        tree={controller.tree}
        submitting={controller.moveSubmitting}
        onClose={controller.closeMoveOrg}
        onSubmit={(newParentId) => void controller.submitMoveOrg(newParentId)}
      />
      <AddUsersToOrgModal
        open={controller.addUsersOpen}
        tree={controller.tree}
        roles={controller.roles}
        service={service}
        onClose={controller.closeAddUsersToOrg}
        onSubmit={(userIds) => void controller.submitAddUsersToOrg(userIds)}
      />
    </>
  );
}

export default OrgManagementPage;
