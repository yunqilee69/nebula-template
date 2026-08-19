import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Form } from 'antd';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { NebulaProvider } from '@/providers/nebula-provider';
import type { OrgTreeResp, RoleOptionResp, UserResp } from '@/types/auth-management';
import type { AnnouncementStatus } from '@/types/notify';
import { AnnouncementFormDrawer } from './announcement-form-drawer';
import type { AnnouncementFormValues } from './announcement-form-drawer';

vi.mock('@/components/user-select', () => ({
  UserSelect: ({ open, onChange, onClose }: {
    readonly open: boolean;
    readonly onChange?: (value: string[], users: UserResp[]) => void;
    readonly onClose: () => void;
  }) => open ? (
    <button type="button" onClick={() => {
      onChange?.(['user-1'], [{ id: 'user-1', username: 'yunqi', nickname: '云起', status: 1 }]);
      onClose();
    }}>
      确认测试用户
    </button>
  ) : null,
}));

vi.mock('@/components/org-tree', () => ({
  OrgTree: ({ onSelect, extra }: {
    readonly onSelect?: (id: string, org: OrgTreeResp) => void;
    readonly extra?: ReactNode;
  }) => (
    <section aria-label="组织树">
      {extra}
      <button type="button" onClick={() => onSelect?.('org-1', ORG_TREE[0])}>研发中心</button>
    </section>
  ),
}));

const ROLES: RoleOptionResp[] = [{ id: 'role-1', name: '平台管理员', code: 'ADMIN' }];
const ORG_TREE: OrgTreeResp[] = [{
  id: 'org-1',
  name: '研发中心',
  code: 'RND',
  type: 'DEPARTMENT',
  status: 1,
}];

function DrawerHarness({
  onSubmit,
}: {
  readonly onSubmit: (values: AnnouncementFormValues, status: AnnouncementStatus) => void;
}) {
  const [form] = Form.useForm<AnnouncementFormValues>();
  return (
    <NebulaProvider>
      <AnnouncementFormDrawer
        form={form}
        mode="create"
        open
        submitting={false}
        detailLoading={false}
        optionsLoading={false}
        optionsError={false}
        roles={ROLES}
        orgTree={ORG_TREE}
        userService={{ pageUsers: vi.fn().mockResolvedValue({ data: [], total: 0 }) }}
        onRetryOptions={vi.fn()}
        onSubmit={onSubmit}
        onClose={vi.fn()}
      />
    </NebulaProvider>
  );
}

async function fillRequiredFields(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('公告标题'), '系统维护');
  await user.type(screen.getByLabelText('公告内容'), '今晚进行系统维护');
}

async function submitDrawer(
  user: ReturnType<typeof userEvent.setup>,
  action: '保存为草稿' | '保存并发布' = '保存为草稿',
) {
  const dialog = screen.getByRole('dialog', { name: '新建公告' });
  await user.click(within(dialog).getByRole('button', { name: action }));
}

describe('AnnouncementFormDrawer', () => {
  it('submits ALL without target values', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<DrawerHarness onSubmit={onSubmit} />);

    await fillRequiredFields(user);
    await submitDrawer(user);

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        targetType: 'ALL',
        targetValues: [],
      }),
      0,
    ));
  });

  it('removes the status field and submits the publish intent from the footer', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<DrawerHarness onSubmit={onSubmit} />);

    expect(screen.queryByLabelText('公告状态')).not.toBeInTheDocument();
    await fillRequiredFields(user);
    await submitDrawer(user, '保存并发布');

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ title: '系统维护' }),
      1,
    ));
  });

  it('uses UserSelect for USER and clears user values after changing mode', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<DrawerHarness onSubmit={onSubmit} />);
    await fillRequiredFields(user);

    await user.click(screen.getByText('指定用户'));
    await user.click(screen.getByRole('button', { name: '选择用户' }));
    await user.click(screen.getByRole('button', { name: '确认测试用户' }));
    expect(screen.getByText('云起')).toBeInTheDocument();

    await user.click(screen.getByText('全部用户'));
    await submitDrawer(user);

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        targetType: 'ALL',
        targetValues: [],
      }),
      0,
    ));
  });

  it('uses the existing role list in a multi-select for ROLE', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<DrawerHarness onSubmit={onSubmit} />);
    await fillRequiredFields(user);

    await user.click(screen.getByText('指定角色'));
    await user.click(screen.getByLabelText('目标角色'));
    await user.click(await screen.findByTitle('平台管理员'));
    await submitDrawer(user);

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        targetType: 'ROLE',
        targetValues: ['role-1'],
      }),
      0,
    ));
  });

  it('uses OrgTree and supports toggling organizations for ORG', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<DrawerHarness onSubmit={onSubmit} />);
    await fillRequiredFields(user);

    await user.click(screen.getByText('指定组织'));
    await user.click(screen.getByRole('button', { name: '研发中心' }));
    expect(screen.getByText('已选择 1 个组织')).toBeInTheDocument();
    await submitDrawer(user);

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        targetType: 'ORG',
        targetValues: ['org-1'],
      }),
      0,
    ));
  });
});
