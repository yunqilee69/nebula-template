import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { NebulaProvider } from '@/providers/nebula-provider';
import type { OrgTreeResp } from '@/types/auth-management';
import { OrgTree } from './org-tree';

const orgTree: OrgTreeResp[] = [
  {
    id: 'root',
    name: 'Cludix Nebula',
    code: 'CLUDIX',
    type: 'COMPANY',
    status: 1,
    children: [
      {
        id: 'child',
        name: '研发中心',
        code: 'RND',
        type: 'DEPARTMENT',
        status: 1,
        parentId: 'root',
      },
    ],
  },
];

function renderOrgTree(node: React.ReactElement) {
  render(<NebulaProvider>{node}</NebulaProvider>);
}

describe('OrgTree', () => {
  it('renders extra root nodes and reports undefined org details for virtual nodes', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    renderOrgTree(
      <OrgTree
        dataSource={orgTree}
        extraRootNodes={[{ key: 'unassigned-users', title: '未分配组织用户' }]}
        onSelect={onSelect}
      />,
    );

    await user.click(await screen.findByRole('treeitem', { name: '未分配组织用户' }));

    expect(onSelect).toHaveBeenCalledWith('unassigned-users', undefined);
  });

  it('renders node actions with root awareness', () => {
    renderOrgTree(
      <OrgTree
        dataSource={orgTree}
        renderNodeActions={(org, isRoot) => (
          <button type="button">{isRoot ? '根组织操作' : '下级组织操作'} {org.name}</button>
        )}
      />,
    );

    expect(screen.getByRole('button', { name: '根组织操作 Cludix Nebula' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '下级组织操作 研发中心' })).toBeInTheDocument();
  });

  it('does not fall back to the default header when title and extra are null', () => {
    renderOrgTree(<OrgTree dataSource={orgTree} title={null} extra={null} />);

    expect(screen.queryByText('组织树')).not.toBeInTheDocument();
    expect(screen.queryByText(/个根节点/)).not.toBeInTheDocument();
  });
});
