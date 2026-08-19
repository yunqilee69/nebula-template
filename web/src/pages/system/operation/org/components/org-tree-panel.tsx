import { TeamOutlined } from '@ant-design/icons';
import { useMemo, type ReactNode } from 'react';
import { OrgTree } from '@/components/org-tree';
import { useNebulaI18n } from '@/hooks/use-nebula-i18n';
import type { OrgTreeResp } from '@/types/auth-management';

export const UNASSIGNED_ORG_USERS_TREE_KEY = 'unassigned-users';

interface OrgTreePanelProps {
  readonly tree: OrgTreeResp[];
  readonly selectedKey?: string;
  readonly onSelectOrg: (orgId: string, org: OrgTreeResp) => void;
  readonly onSelectUnassignedUsers: () => void;
  readonly renderNodeActions?: (org: OrgTreeResp, isRoot: boolean) => ReactNode;
}

export function OrgTreePanel({ tree, selectedKey, onSelectOrg, onSelectUnassignedUsers, renderNodeActions }: OrgTreePanelProps) {
  const { t } = useNebulaI18n();
  const extraRootNodes = useMemo(
    () => [
      {
        key: UNASSIGNED_ORG_USERS_TREE_KEY,
        title: t('auth.assignment.tabs.unassignedOrgUsers'),
        icon: <TeamOutlined />,
      },
    ],
    [t],
  );

  return (
    <OrgTree
      dataSource={tree}
      selectedKey={selectedKey}
      title={null}
      extra={null}
      extraRootNodes={extraRootNodes}
      renderNodeActions={renderNodeActions}
      onSelect={(orgId, org) => {
        if (orgId === UNASSIGNED_ORG_USERS_TREE_KEY) {
          onSelectUnassignedUsers();
          return;
        }
        if (org) {
          onSelectOrg(orgId, org);
        }
      }}
    />
  );
}
