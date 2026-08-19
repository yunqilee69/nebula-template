import { describe, expect, it, vi } from 'vitest';
import type { PermissionService } from '@/api/permission';
import type { PermissionGrantResp, PermissionSubject } from '@/types/permission';
import { syncSubjectPermissions } from './permission-sync';

function createPermissionService(): PermissionService {
  return {
    listSubjects: vi.fn().mockResolvedValue({ orgs: [], roles: [], users: [] }),
    listMenuTree: vi.fn().mockResolvedValue([]),
    pageButtons: vi.fn().mockResolvedValue({ data: [], total: 0 }),
    pageSubjectPermissions: vi.fn().mockResolvedValue({ data: [], total: 0 }),
    createPermissions: vi.fn().mockResolvedValue([]),
    createPermissionItems: vi.fn().mockResolvedValue([]),
    updatePermissions: vi.fn().mockResolvedValue([]),
    updatePermission: vi.fn().mockResolvedValue('permission-id'),
    removePermissionsBySubjectAndResources: vi.fn().mockResolvedValue(undefined),
  };
}

const subject: PermissionSubject = {
  id: 'org-1',
  type: 'ORG',
  name: '研发中心',
  code: 'RND',
};

const existingMenuPermissions: PermissionGrantResp[] = [
  { id: 'grant-system', subjectType: 'ORG', subjectId: 'org-1', resourceType: 'MENU', resourceId: 'menu-system', effect: 'Allow' },
  { id: 'grant-user', subjectType: 'ORG', subjectId: 'org-1', resourceType: 'MENU', resourceId: 'menu-user', effect: 'Allow' },
  { id: 'grant-role', subjectType: 'ORG', subjectId: 'org-1', resourceType: 'MENU', resourceId: 'menu-role', effect: 'Allow' },
];

describe('syncSubjectPermissions', () => {
  it('uses one batch update when multiple existing resources change to the same effect', async () => {
    const service = createPermissionService();

    await syncSubjectPermissions({
      service,
      subject,
      existingPermissions: existingMenuPermissions,
      desiredPermissions: existingMenuPermissions.map((permission) => ({
        resourceType: permission.resourceType,
        resourceId: permission.resourceId,
        effect: 'Deny',
        scope: 'ALL',
      })),
    });

    expect(service.updatePermissions).toHaveBeenCalledTimes(1);
    expect(service.updatePermissions).toHaveBeenCalledWith({
      subjectType: 'ORG',
      subjectId: 'org-1',
      effect: 'Deny',
      scope: 'ALL',
      resources: [
        { resourceType: 'MENU', resourceId: 'menu-system' },
        { resourceType: 'MENU', resourceId: 'menu-user' },
        { resourceType: 'MENU', resourceId: 'menu-role' },
      ],
    });
    expect(service.updatePermission).not.toHaveBeenCalled();
  });
});
