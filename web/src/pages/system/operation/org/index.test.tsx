import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NebulaProvider } from '@/providers/nebula-provider';
import type { AuthManagementService } from '@/api/auth-management';
import { useLocaleStore } from '@/stores/locale-store';
import { clearAuthForTest, echoAuthAdapter, signInAsAdminForTest } from '@/test/auth-test-helpers';
import type { OrgResp, OrgTreeResp, PageResp, UserResp } from '@/types/auth-management';
import { OrgManagementPage } from './index';

const orgTree: OrgTreeResp[] = [
  {
    id: 'org-root',
    name: 'Cludix Nebula',
    code: 'CLUDIX',
    type: 'COMPANY',
    status: 1,
    children: [
      { id: 'org-1', name: '研发中心', code: 'RND', type: 'DEPARTMENT', status: 1 },
    ],
  },
];

const orgPage: PageResp<OrgResp> = {
  data: [
    { id: 'org-1', name: '研发中心', code: 'RND', type: 'DEPARTMENT', status: 1 },
  ],
  total: 1,
};

function createService(overrides: Partial<AuthManagementService> = {}): AuthManagementService {
  return {
    pageUsers: vi.fn().mockResolvedValue({
      data: [{ id: 'user-1', username: 'yunqi', nickname: '云起', status: 1 }],
      total: 0,
    } satisfies PageResp<UserResp>),
    createUser: vi.fn().mockResolvedValue(undefined),
    updateUser: vi.fn().mockResolvedValue(undefined),
    deleteUser: vi.fn().mockResolvedValue(undefined),
    getUserDetail: vi.fn().mockResolvedValue({
      id: 'user-1',
      username: 'yunqi',
      nickname: '云起',
      status: 1,
    }),
    resetUserPassword: vi.fn().mockResolvedValue(undefined),
    changeUserPassword: vi.fn().mockResolvedValue(undefined),
    batchUpdateUserAssignments: vi.fn().mockResolvedValue(undefined),
    listRoles: vi.fn().mockResolvedValue([]),
    listOrgs: vi.fn().mockResolvedValue([]),
    getOrgTree: vi.fn().mockResolvedValue(orgTree),
    pageOrgs: vi.fn().mockResolvedValue(orgPage satisfies PageResp<OrgResp>),
    createOrg: vi.fn().mockResolvedValue(undefined),
    updateOrg: vi.fn().mockResolvedValue(undefined),
    deleteOrg: vi.fn().mockResolvedValue(undefined),
    getOrgDetail: vi.fn().mockResolvedValue({
      id: 'org-1',
      name: '研发中心',
      code: 'RND',
      type: 'DEPARTMENT',
      status: 1,
    }),
    ...overrides,
  };
}

function renderPage(service = createService()) {
  signInAsAdminForTest();
  render(
    <NebulaProvider authAdapter={echoAuthAdapter}>
      <OrgManagementPage service={service} />
    </NebulaProvider>,
  );
  return service;
}

describe('OrgManagementPage', () => {
  afterEach(() => {
    act(() => {
      useLocaleStore.getState().setLocale('zh-CN');
    });
    clearAuthForTest();
  });

  it('renders the org tree and selected organization users tab', async () => {
    const service = renderPage();

    expect(await screen.findByRole('treeitem', { name: /Cludix Nebula/ })).toBeInTheDocument();
    expect(screen.getByRole('treeitem', { name: /未分配组织用户/ })).toBeInTheDocument();
    expect(screen.queryByText('组织树')).not.toBeInTheDocument();
    expect(screen.queryByText(/个根节点/)).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /组织用户/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /下级组织/ })).toBeInTheDocument();
    expect(await screen.findByText('yunqi')).toBeInTheDocument();

    expect(service.getOrgTree).toHaveBeenCalledTimes(1);
    expect(service.pageUsers).toHaveBeenCalledWith({ pageNum: 1, pageSize: 10 });
  });

  it('filters child organizations by parentId when a tree node is selected', async () => {
    const user = userEvent.setup();
    const service = renderPage();

    await user.click(screen.getByRole('tab', { name: /下级组织/ }));

    const tree = await screen.findByRole('tree');
    expect(tree).toBeInTheDocument();

    const rootNode = await screen.findByRole('treeitem', { name: /Cludix Nebula/ });
    expect(rootNode).toBeInTheDocument();

    const childNode = await screen.findByRole('treeitem', { name: /研发中心/ });
    await user.click(childNode);

    await waitFor(() => {
      expect(service.pageOrgs).toHaveBeenLastCalledWith({
        pageNum: 1,
        pageSize: 10,
        parentId: 'org-1',
      });
    });
  });

  it('opens create org dialog from toolbar button', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(screen.queryByRole('button', { name: /新增组织/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /下级组织/ }));
    await user.click(screen.getByRole('button', { name: /新增组织/ }));

    const dialog = await screen.findByRole('dialog', { name: '新增组织' });
    expect(within(dialog).getByLabelText('组织名称')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('组织编码')).toBeInTheDocument();
  });

  it('loads users without organizations from the tree record while keeping the tree visible', async () => {
    const user = userEvent.setup();
    const service = createService({
      pageUsers: vi.fn().mockResolvedValue({
        data: [{ id: 'user-1', username: 'yunqi', nickname: '云起', status: 1 }],
        total: 1,
      } satisfies PageResp<UserResp>),
    });
    renderPage(service);

    await user.click(await screen.findByRole('treeitem', { name: '未分配组织用户' }));

    expect(await screen.findByText('yunqi')).toBeInTheDocument();
    expect(screen.getByRole('tree')).toBeInTheDocument();
    expect(service.pageUsers).toHaveBeenCalledWith({ pageNum: 1, pageSize: 10, withoutOrg: true });
  });

  it('renders page labels from the active English locale', async () => {
    act(() => {
      useLocaleStore.getState().setLocale('en-US');
    });

    renderPage();

    expect(await screen.findByRole('treeitem', { name: /Cludix Nebula/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /New Organization/ })).not.toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('tab', { name: /Child Organizations/ }));
    expect(screen.getByRole('button', { name: /New Organization/ })).toBeInTheDocument();
  });

  it('shows only rename for root organization tree actions', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Cludix Nebula 更多操作' }));

    const actionGroup = screen.getByRole('group', { name: 'Cludix Nebula 更多操作' });
    expect(within(actionGroup).getByRole('button', { name: '重命名' })).toBeInTheDocument();
    expect(within(actionGroup).queryByRole('button', { name: '移动' })).not.toBeInTheDocument();
    expect(within(actionGroup).queryByRole('button', { name: '删除' })).not.toBeInTheDocument();
  });

  it('shows rename delete and move for child organization tree actions', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: '研发中心 更多操作' }));

    const actionGroup = screen.getByRole('group', { name: '研发中心 更多操作' });
    expect(within(actionGroup).getByRole('button', { name: '重命名' })).toBeInTheDocument();
    expect(within(actionGroup).getByRole('button', { name: '移动' })).toBeInTheDocument();
    expect(within(actionGroup).getByRole('button', { name: '删除' })).toBeInTheDocument();
  });

  it('opens move dialog from a child organization tree action', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: '研发中心 更多操作' }));
    const actionGroup = screen.getByRole('group', { name: '研发中心 更多操作' });
    fireEvent.click(within(actionGroup).getByRole('button', { name: '移动' }));

    const dialogTitle = await screen.findByText('移动组织');
    expect(dialogTitle.closest('.ant-modal')).toBeInstanceOf(HTMLElement);
  });

  it('adds selected users to the selected organization from the org users toolbar', async () => {
    const user = userEvent.setup();
    const service = renderPage();

    await user.click(await screen.findByRole('treeitem', { name: /Cludix Nebula/ }));
    await user.click(screen.getByRole('button', { name: '新增' }));
    const dialogTitle = await screen.findByText('添加用户到组织');
    const dialog = dialogTitle.closest('.ant-modal');
    if (!(dialog instanceof HTMLElement)) {
      throw new Error('Expected add-users modal');
    }
    await user.click(await within(dialog).findByText('yunqi'));

    const userRow = within(dialog).getByText('yunqi').closest('tr');
    expect(userRow).toBeInTheDocument();
    if (!userRow) {
      throw new Error('Expected selected user row to render');
    }

    await user.click(within(userRow).getByRole('checkbox'));
    await user.click(within(dialog).getByRole('button', { name: /确认/ }));

    await waitFor(() => {
      expect(service.batchUpdateUserAssignments).toHaveBeenCalledWith({ userIds: ['user-1'], orgIds: ['org-root'] });
    });
  });
});
