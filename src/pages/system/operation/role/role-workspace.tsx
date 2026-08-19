import { DeleteOutlined, EditOutlined, PlusOutlined, TeamOutlined, UserOutlined } from '@ant-design/icons';
import { Button, Flex, Popconfirm, Tag } from 'antd';
import { createStyles } from 'antd-style';
import { useMemo, type ReactNode } from 'react';
import { Access } from '@/components/access';
import { NeTree } from '@/components/ne-tree';
import type { NeTreeNode } from '@/components/ne-tree/types';
import { AUTH_BUTTON_CODES } from '@/constants/auth-button-codes';
import { useNebulaI18n } from '@/hooks/use-nebula-i18n';
import type { RoleOptionResp } from '@/types/auth-management';
import { TreeNodeActionGroup } from '../components/tree-node-action-group';
import type { RoleUserScope } from './role-users-table';

interface RoleWorkspaceProps {
  readonly roles: readonly RoleOptionResp[];
  readonly selectedScope: RoleUserScope;
  readonly children: ReactNode;
  readonly onSelectScope: (scope: RoleUserScope) => void;
  readonly onCreateRole: () => void;
  readonly onEditRole: (roleId: string) => void | Promise<void>;
  readonly onDeleteRole: (roleId: string) => void | Promise<void>;
}

export const ROLE_SCOPE_WITH_ROLE_KEY = '__role_scope_with_role__';
export const ROLE_SCOPE_WITHOUT_ROLE_KEY = '__role_scope_without_role__';

const useStyles = createStyles(({ token }) => ({
  workspace: {
    display: 'grid',
    gridTemplateColumns: '280px minmax(0, 1fr)',
    gap: token.marginMD,
    minHeight: 0,
    height: '100%',
    '@media (max-width: 768px)': {
      gridTemplateColumns: '1fr',
    },
  },
  leftPane: {
    minHeight: 0,
  },
  rightPane: {
    minWidth: 0,
    minHeight: 0,
  },
}));

export function RoleWorkspace({
  roles,
  selectedScope,
  children,
  onSelectScope,
  onCreateRole,
  onEditRole,
  onDeleteRole,
}: RoleWorkspaceProps) {
  const { styles } = useStyles();
  const { t } = useNebulaI18n();

  const treeNodes = useMemo<NeTreeNode[]>(() => [
    {
      key: ROLE_SCOPE_WITH_ROLE_KEY,
      title: t('auth.assignment.tabs.globalRoleUsers'),
      icon: <TeamOutlined />,
      tag: <Tag>{roles.length} {t('auth.roleManagement.tree.totalRoles')}</Tag>,
      children: roles.map((role) => ({
        key: role.id,
        title: role.name,
        searchText: `${role.name} ${role.code}`,
        icon: <UserOutlined />,
        tag: role.status === 1
          ? <Tag color="success">{t('auth.roleManagement.status.enabled')}</Tag>
          : <Tag>{t('auth.roleManagement.status.disabled')}</Tag>,
        actions: (
          <TreeNodeActionGroup ariaLabel={`${role.name} ${t('auth.roleManagement.actions.moreActions')}`}>
            {(close) => (
              <>
                <Access permission={AUTH_BUTTON_CODES.ROLE_EDIT} fallback={null}>
                  <Button
                    size="small"
                    type="text"
                    block
                    icon={<EditOutlined aria-hidden />}
                    onClick={() => {
                      close();
                      void onEditRole(role.id);
                    }}
                  >
                    {t('auth.roleManagement.actions.edit')}
                  </Button>
                </Access>
                <Access permission={AUTH_BUTTON_CODES.ROLE_DELETE} fallback={null}>
                  <Popconfirm
                    title={t('auth.roleManagement.confirm.deleteTitle')}
                    okText={t('auth.roleManagement.actions.delete')}
                    cancelText={t('auth.roleManagement.actions.cancel')}
                    onConfirm={() => {
                      close();
                      void onDeleteRole(role.id);
                    }}
                  >
                    <Button size="small" type="text" danger block icon={<DeleteOutlined aria-hidden />}>
                      {t('auth.roleManagement.actions.delete')}
                    </Button>
                  </Popconfirm>
                </Access>
              </>
            )}
          </TreeNodeActionGroup>
        ),
      })),
    },
    {
      key: ROLE_SCOPE_WITHOUT_ROLE_KEY,
      title: t('auth.assignment.tabs.unassignedRoleUsers'),
      icon: <UserOutlined />,
    },
  ], [onDeleteRole, onEditRole, roles, t]);

  function selectScope(key: string) {
    if (key === ROLE_SCOPE_WITH_ROLE_KEY) {
      onSelectScope({ kind: 'withRole', key, title: t('auth.assignment.tabs.globalRoleUsers') });
      return;
    }
    if (key === ROLE_SCOPE_WITHOUT_ROLE_KEY) {
      onSelectScope({ kind: 'withoutRole', key, title: t('auth.assignment.tabs.unassignedRoleUsers') });
      return;
    }

    const role = roles.find((item) => item.id === key);
    if (role) {
      onSelectScope({ kind: 'role', key: role.id, roleId: role.id, title: role.name });
    }
  }

  return (
    <div className={styles.workspace}>
      <Flex vertical gap="middle" className={styles.leftPane}>
        <NeTree
          title={t('auth.roleManagement.tree.title')}
          dataSource={treeNodes}
          selectedKey={selectedScope.key}
          defaultExpandedKeys={[ROLE_SCOPE_WITH_ROLE_KEY]}
          searchable
          searchPlaceholder={t('auth.roleManagement.tree.searchPlaceholder')}
          extra={(
            <Access permission={AUTH_BUTTON_CODES.ROLE_CREATE} fallback={null}>
              <Button type="primary" icon={<PlusOutlined />} onClick={onCreateRole}>
                {t('auth.roleManagement.actions.create')}
              </Button>
            </Access>
          )}
          onSelect={selectScope}
          style={{ minHeight: 0, flex: 1 }}
        />
      </Flex>
      <div className={styles.rightPane}>{children}</div>
    </div>
  );
}
