import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NebulaProvider } from '@/providers/nebula-provider';
import type { AuthManagementService } from '@/api/auth-management';
import { useLocaleStore } from '@/stores/locale-store';
import { clearAuthForTest, echoAuthAdapter, signInAsAdminForTest } from '@/test/auth-test-helpers';
import type { PageResp, UserResp } from '@/types/auth-management';
import { UserManagementPage } from './index';

function createService(overrides: Partial<AuthManagementService> = {}): AuthManagementService {
  return {
    pageUsers: vi.fn().mockResolvedValue({
      data: [
        { id: 'user-1', username: 'yunqi', nickname: '云起', email: 'yunqi@cludix.com', phone: '13800000001', status: 1 },
      ],
      total: 1,
    } satisfies PageResp<UserResp>),
    createUser: vi.fn().mockResolvedValue(undefined),
    updateUser: vi.fn().mockResolvedValue(undefined),
    deleteUser: vi.fn().mockResolvedValue(undefined),
    getUserDetail: vi.fn().mockResolvedValue({ id: 'user-1', username: 'yunqi', nickname: '云起', status: 1 }),
    resetUserPassword: vi.fn().mockResolvedValue(undefined),
    changeUserPassword: vi.fn().mockResolvedValue(undefined),
    batchUpdateUserAssignments: vi.fn().mockResolvedValue(undefined),
    listRoles: vi.fn().mockResolvedValue([{ id: 'role-1', name: '平台管理员', code: 'ADMIN' }]),
    listOrgs: vi.fn().mockResolvedValue([{ id: 'org-1', name: '研发中心', code: 'RND' }]),
    pageOrgs: vi.fn().mockResolvedValue({ data: [], total: 0 }),
    getOrgTree: vi.fn().mockResolvedValue([]),
    createOrg: vi.fn().mockResolvedValue(undefined),
    updateOrg: vi.fn().mockResolvedValue(undefined),
    deleteOrg: vi.fn().mockResolvedValue(undefined),
    getOrgDetail: vi.fn().mockResolvedValue({ id: 'org-1', name: '研发中心', code: 'RND', type: 'DEPARTMENT', status: 1 }),
    ...overrides,
  };
}

function renderPage(service = createService()) {
  signInAsAdminForTest();
  render(
    <NebulaProvider authAdapter={echoAuthAdapter}>
      <UserManagementPage service={service} />
    </NebulaProvider>,
  );
  return service;
}

describe('UserManagementPage', () => {
  afterEach(() => {
    act(() => {
      useLocaleStore.getState().setLocale('zh-CN');
    });
    clearAuthForTest();
  });

  it('renders a ProTable search form, toolbar, and user rows', async () => {
    const service = renderPage();

    expect(screen.getByLabelText('账号')).toBeInTheDocument();
    expect(screen.getByLabelText('昵称')).toBeInTheDocument();
    const toolbarActionLabels = screen
      .getAllByRole('button')
      .map((button) => button.textContent?.trim())
      .filter((text): text is string => ['新增', '追加组织', '追加角色', '重置密码'].includes(text ?? ''));
    expect(toolbarActionLabels).toEqual(['新增', '追加组织', '追加角色', '重置密码']);
    expect(await screen.findByText('yunqi')).toBeInTheDocument();
    expect(service.pageUsers).toHaveBeenCalledWith({ pageNum: 1, pageSize: 10 });
  });

  it('submits search values through ProTable request query', async () => {
    const user = userEvent.setup();
    const service = renderPage();

    await user.type(screen.getByLabelText('账号'), 'yunqi');
    await user.click(screen.getByRole('button', { name: /查\s*询/ }));

    await waitFor(() => {
      expect(service.pageUsers).toHaveBeenLastCalledWith({ pageNum: 1, pageSize: 10, username: 'yunqi' });
    });
  });

  it('opens the user drawer from the ProTable toolbar', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /新增/ }));

    const dialog = screen.getByRole('dialog', { name: '新增用户' });
    expect(within(dialog).getByLabelText('用户名')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('密码')).toBeInTheDocument();
  });

  it('resets the selected user password from the ProTable toolbar', async () => {
    const user = userEvent.setup();
    const service = renderPage();

    expect(await screen.findByText('yunqi')).toBeInTheDocument();
    const checkboxes = screen.getAllByRole('checkbox');
    const rowCheckbox = checkboxes[1];
    if (!rowCheckbox) {
      throw new Error('Expected user row selection checkbox');
    }

    await user.click(rowCheckbox);
    await user.click(screen.getByRole('button', { name: /重置密码/ }));
    const resetButtons = await screen.findAllByRole('button', { name: /重置密码/ });
    const confirmButton = resetButtons[resetButtons.length - 1];
    if (!confirmButton) {
      throw new Error('Expected reset password confirmation button');
    }
    await user.click(confirmButton);

    await waitFor(() => {
      expect(service.resetUserPassword).toHaveBeenCalledWith('user-1');
    });
  });

  it('submits role assignment for selected users from the toolbar', async () => {
    const user = userEvent.setup();
    const service = renderPage();

    expect(await screen.findByText('yunqi')).toBeInTheDocument();
    const checkboxes = screen.getAllByRole('checkbox');
    const rowCheckbox = checkboxes[1];
    if (!rowCheckbox) {
      throw new Error('Expected user row selection checkbox');
    }

    await user.click(rowCheckbox);
    expect(screen.queryByText(/已选择\s*1\s*项/)).not.toBeInTheDocument();
    const batchAssignButton = screen.getByRole('button', { name: /追加角色/ });
    await waitFor(() => {
      expect(batchAssignButton).toBeEnabled();
    });
    await user.click(batchAssignButton);

    const modalTitle = await screen.findByText('批量设置用户归属');
    const modal = modalTitle.closest('.ant-modal');
    if (!(modal instanceof HTMLElement)) {
      throw new Error('Expected batch assignment modal');
    }
    expect(within(modal).getByText(/已选择\s*1\s*个用户[:：]\s*云起/)).toBeInTheDocument();
    await user.click(within(modal).getByLabelText('角色'));
    await user.click(await screen.findByText('平台管理员'));
    expect(within(modal).queryByLabelText('组织')).not.toBeInTheDocument();
    expect(within(modal).queryByText(/勾选.*移除/)).not.toBeInTheDocument();
    await user.click(within(modal).getByRole('button', { name: '追加归属' }));

    await waitFor(() => {
      expect(service.batchUpdateUserAssignments).toHaveBeenCalledWith({
        userIds: ['user-1'],
        roleIds: ['role-1'],
        orgIds: null,
        operation: 'ADD',
      });
    });
  });

  it('submits organization assignment for selected users from the toolbar', async () => {
    const user = userEvent.setup();
    const service = renderPage();

    expect(await screen.findByText('yunqi')).toBeInTheDocument();
    const checkboxes = screen.getAllByRole('checkbox');
    const rowCheckbox = checkboxes[1];
    if (!rowCheckbox) {
      throw new Error('Expected user row selection checkbox');
    }

    await user.click(rowCheckbox);
    const batchAssignButton = screen.getByRole('button', { name: /追加组织/ });
    await waitFor(() => {
      expect(batchAssignButton).toBeEnabled();
    });
    await user.click(batchAssignButton);

    const modalTitle = await screen.findByText('批量设置用户归属');
    const modal = modalTitle.closest('.ant-modal');
    if (!(modal instanceof HTMLElement)) {
      throw new Error('Expected batch assignment modal');
    }
    expect(within(modal).getByText(/已选择\s*1\s*个用户[:：]\s*云起/)).toBeInTheDocument();
    expect(within(modal).queryByLabelText('角色')).not.toBeInTheDocument();
    expect(within(modal).getByLabelText('组织')).toBeInTheDocument();
    expect(within(modal).queryByText(/勾选.*移除/)).not.toBeInTheDocument();
    await user.click(within(modal).getByRole('button', { name: '追加归属' }));

    await waitFor(() => {
      expect(service.batchUpdateUserAssignments).toHaveBeenCalledWith({
        userIds: ['user-1'],
        roleIds: null,
        orgIds: null,
        operation: 'ADD',
      });
    });
  });

  it('renders page labels from the active English locale', async () => {
    act(() => {
      useLocaleStore.getState().setLocale('en-US');
    });

    renderPage();

    expect(screen.getByRole('button', { name: /Add User/ })).toBeInTheDocument();
    expect(await screen.findByText('yunqi')).toBeInTheDocument();
  });
});
