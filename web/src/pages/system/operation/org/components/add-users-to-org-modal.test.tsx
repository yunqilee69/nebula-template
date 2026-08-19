import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { NebulaProvider } from '@/providers/nebula-provider';
import type { AuthManagementService } from '@/api/auth-management';
import type { OrgTreeResp, PageResp, UserResp } from '@/types/auth-management';
import { AddUsersToOrgModal } from './add-users-to-org-modal';

const orgTree: OrgTreeResp[] = [
  { id: 'org-1', name: '研发中心', code: 'RND', type: 'DEPARTMENT', status: 1 },
];

function createService(): AuthManagementService {
  return {
    pageUsers: vi.fn().mockResolvedValue({
      data: [{ id: 'user-1', username: 'yunqi', nickname: '云起', status: 1 }],
      total: 1,
    } satisfies PageResp<UserResp>),
    createUser: vi.fn().mockResolvedValue(undefined),
    updateUser: vi.fn().mockResolvedValue(undefined),
    deleteUser: vi.fn().mockResolvedValue(undefined),
    getUserDetail: vi.fn().mockResolvedValue({ id: 'user-1', username: 'yunqi', status: 1 }),
    resetUserPassword: vi.fn().mockResolvedValue(undefined),
    changeUserPassword: vi.fn().mockResolvedValue(undefined),
    batchUpdateUserAssignments: vi.fn().mockResolvedValue(undefined),
    listRoles: vi.fn().mockResolvedValue([]),
    listOrgs: vi.fn().mockResolvedValue([]),
    pageOrgs: vi.fn().mockResolvedValue({ data: [], total: 0 }),
    getOrgTree: vi.fn().mockResolvedValue([]),
    createOrg: vi.fn().mockResolvedValue(undefined),
    updateOrg: vi.fn().mockResolvedValue(undefined),
    deleteOrg: vi.fn().mockResolvedValue(undefined),
    getOrgDetail: vi.fn().mockResolvedValue({ id: 'org-1', name: '研发中心', code: 'RND', type: 'DEPARTMENT', status: 1 }),
  };
}

describe('AddUsersToOrgModal', () => {
  it('loads users and submits selected user ids', async () => {
    const user = userEvent.setup();
    const service = createService();
    const onSubmit = vi.fn();

    render(
      <NebulaProvider>
        <AddUsersToOrgModal
          open
          tree={orgTree}
          roles={[]}
          service={service}
          onClose={vi.fn()}
          onSubmit={onSubmit}
        />
      </NebulaProvider>,
    );

    expect(await screen.findByRole('dialog', { name: '添加用户到组织' })).toBeInTheDocument();
    await waitFor(() => expect(service.pageUsers).toHaveBeenCalledWith({ pageNum: 1, pageSize: 10, orgId: undefined, roleId: undefined, username: undefined }));

    const userRow = (await screen.findByText('yunqi')).closest('tr');
    expect(userRow).toBeInTheDocument();
    if (!userRow) {
      throw new Error('Expected selected user row to render');
    }

    await user.click(within(userRow).getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: /确认/ }));

    expect(onSubmit).toHaveBeenCalledWith(['user-1']);
  });
});
