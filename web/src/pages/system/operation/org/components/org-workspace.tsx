import { DeleteOutlined, EditOutlined, SwapOutlined } from '@ant-design/icons';
import { Button, Flex, Tabs } from 'antd';
import { useCallback, useMemo, type RefObject } from 'react';
import { Access } from '@/components/access';
import { AUTH_BUTTON_CODES } from '@/constants/auth-button-codes';
import { useNebulaI18n } from '@/hooks/use-nebula-i18n';
import type { AuthManagementService } from '@/api/auth-management';
import type { OrgResp, OrgTreeResp } from '@/types/auth-management';
import { TreeNodeActionGroup } from '../../components/tree-node-action-group';
import { UnassignedUsersTable } from '../../components/unassigned-users-table';
import { OrgTable, type OrgTableHandle } from './org-table';
import { OrgTreePanel, UNASSIGNED_ORG_USERS_TREE_KEY } from './org-tree-panel';

interface OrgWorkspaceProps {
  readonly service: AuthManagementService;
  readonly tableRef: RefObject<OrgTableHandle>;
  readonly tree: OrgTreeResp[];
  readonly selectedOrgId?: string;
  readonly showUnassignedUsers: boolean;
  readonly unassignedTableKey: number;
  readonly orgUsersTableKey: number;
  readonly onSelectOrg: (orgId: string) => void;
  readonly onShowUnassignedUsers: () => void;
  readonly onCreateOrg: () => void;
  readonly onEditOrg: (record: OrgResp) => void | Promise<void>;
  readonly onMoveOrg: (record: OrgTreeResp) => void;
  readonly onDeleteOrg: (record: OrgTreeResp) => void;
  readonly onAddUsersToOrg: () => void;
  readonly onAssignUser: (userId: string) => void;
}

export function OrgWorkspace({
  service,
  tableRef,
  tree,
  selectedOrgId,
  showUnassignedUsers,
  unassignedTableKey,
  orgUsersTableKey,
  onSelectOrg,
  onShowUnassignedUsers,
  onCreateOrg,
  onEditOrg,
  onMoveOrg,
  onDeleteOrg,
  onAddUsersToOrg,
  onAssignUser,
}: OrgWorkspaceProps) {
  const { t } = useNebulaI18n();
  const orgUserFilter = useMemo(() => ({ orgId: selectedOrgId }), [selectedOrgId]);
  const selectedTreeKey = showUnassignedUsers ? UNASSIGNED_ORG_USERS_TREE_KEY : selectedOrgId;

  const renderNodeActions = useCallback(
    (org: OrgTreeResp, isRoot: boolean) => {
      return (
        <TreeNodeActionGroup ariaLabel={`${org.name} ${t('auth.orgManagement.actions.moreActions')}`}>
          {(close) => (
            <>
              <Access permission={AUTH_BUTTON_CODES.ORG_EDIT} fallback={null}>
                <Button
                  type="text"
                  size="small"
                  block
                  icon={<EditOutlined aria-hidden />}
                  onClick={() => {
                    close();
                    void onEditOrg(org);
                  }}
                >
                  {t('auth.orgManagement.actions.rename')}
                </Button>
              </Access>
              {!isRoot ? (
                <>
                  <Access permission={AUTH_BUTTON_CODES.ORG_EDIT} fallback={null}>
                    <Button
                      type="text"
                      size="small"
                      block
                      icon={<SwapOutlined aria-hidden />}
                      onClick={() => {
                        close();
                        onMoveOrg(org);
                      }}
                    >
                      {t('auth.orgManagement.actions.move')}
                    </Button>
                  </Access>
                  <Access permission={AUTH_BUTTON_CODES.ORG_DELETE} fallback={null}>
                    <Button
                      type="text"
                      size="small"
                      danger
                      block
                      icon={<DeleteOutlined aria-hidden />}
                      onClick={() => {
                        close();
                        onDeleteOrg(org);
                      }}
                    >
                      {t('auth.orgManagement.actions.delete')}
                    </Button>
                  </Access>
                </>
              ) : null}
            </>
          )}
        </TreeNodeActionGroup>
      );
    },
    [onDeleteOrg, onEditOrg, onMoveOrg, t],
  );

  const orgTabItems = [
    {
      key: 'org-users',
      label: t('auth.assignment.tabs.orgUsers'),
      children: (
        <UnassignedUsersTable
          key={orgUsersTableKey}
          service={service}
          filter={orgUserFilter}
          onAddUsers={selectedOrgId ? onAddUsersToOrg : undefined}
        />
      ),
    },
    {
      key: 'child-orgs',
      label: t('auth.assignment.tabs.childOrgs'),
      children: (
        <OrgTable
          ref={tableRef}
          service={service}
          parentId={selectedOrgId}
          onCreate={onCreateOrg}
          onEdit={(record) => void onEditOrg(record)}
          showCreateButton
        />
      ),
    },
  ];

  return (
    <Flex gap={16} style={{ height: '100%' }}>
      <Flex vertical gap={16} style={{ flex: '0 0 280px' }}>
        <OrgTreePanel
          tree={tree}
          selectedKey={selectedTreeKey}
          onSelectOrg={(orgId) => onSelectOrg(orgId)}
          onSelectUnassignedUsers={onShowUnassignedUsers}
          renderNodeActions={renderNodeActions}
        />
      </Flex>
      <Flex vertical gap={16} style={{ flex: 1, minWidth: 0 }}>
        {showUnassignedUsers ? (
          <UnassignedUsersTable key={unassignedTableKey} service={service} filter="withoutOrg" onAssign={onAssignUser} />
        ) : (
          <Tabs items={orgTabItems} />
        )}
      </Flex>
    </Flex>
  );
}
