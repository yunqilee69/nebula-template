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
    tenantId: resp.tenantId,
    tenantCode: resp.tenantCode,
    tenantName: resp.tenantName,
    personId: resp.personId,
    platformAdmin: resp.platformAdmin,
    roles: resp.roleCodeList ?? [],
    permissions: resp.permissionCodeList ?? [],
    organizations,
    currentOrganizationId: organizations[0]?.id,
    menuList: resp.menuList ?? [],
  };
}
