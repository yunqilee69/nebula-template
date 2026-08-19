import { UserSelect } from '@/components/user-select';
import { useNebulaI18n } from '@/hooks/use-nebula-i18n';
import type { AuthManagementService } from '@/api/auth-management';
import type { OrgTreeResp, RoleOptionResp, UserResp } from '@/types/auth-management';

interface AddUsersToOrgModalProps {
  readonly open: boolean;
  readonly tree: OrgTreeResp[];
  readonly roles: RoleOptionResp[];
  readonly service: AuthManagementService;
  readonly onClose: () => void;
  readonly onSubmit: (userIds: string[]) => void;
}

export function AddUsersToOrgModal({ open, tree, roles, service, onClose, onSubmit }: AddUsersToOrgModalProps) {
  const { t } = useNebulaI18n();

  function handleChange(value: string | string[] | undefined, _users: UserResp[]) {
    const userIds = Array.isArray(value) ? value : value ? [value] : [];
    if (userIds.length > 0) {
      onSubmit(userIds);
    }
  }

  return (
    <UserSelect
      open={open}
      title={t('auth.orgManagement.addUsers.title')}
      mode="multiple"
      treeData={tree}
      roles={roles}
      service={service}
      onClose={onClose}
      onChange={handleChange}
    />
  );
}
