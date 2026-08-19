import type { CurrentUser, CurrentUserResp, Organization } from '@/types/auth';

function toOrganizations(orgCodes?: string[]): Organization[] {
  return orgCodes?.map((code) => ({ id: code, name: code, code })) ?? [];
}

export function toCurrentUser(resp: CurrentUserResp): CurrentUser {
  const organizations = toOrganizations(resp.orgCodeList);

  return {
    id: resp.id,
    name: resp.nickname ?? resp.username ?? resp.id,
    username: resp.username,
    avatar: resp.avatar,
    roles: resp.roleCodeList ?? [],
    permissions: resp.permissionCodeList ?? [],
    organizations,
    currentOrganizationId: organizations[0]?.id,
    menuList: resp.menuList ?? [],
  };
}
