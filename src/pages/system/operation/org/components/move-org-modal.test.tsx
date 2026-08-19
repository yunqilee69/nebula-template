import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { NebulaProvider } from '@/providers/nebula-provider';
import type { OrgTreeResp } from '@/types/auth-management';
import { MoveOrgModal, filterTreeForMove, toTreeSelectData } from './move-org-modal';

const orgTree: OrgTreeResp[] = [
  {
    id: 'root',
    name: '根组织',
    code: 'ROOT',
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
        children: [
          { id: 'grandchild', name: '平台组', code: 'PLATFORM', type: 'TEAM', status: 1, parentId: 'child' },
        ],
      },
      { id: 'sibling', name: '运营中心', code: 'OPS', type: 'DEPARTMENT', status: 1, parentId: 'root' },
    ],
  },
];

function renderWithProvider(node: React.ReactElement) {
  render(<NebulaProvider>{node}</NebulaProvider>);
}

describe('MoveOrgModal', () => {
  it('filters out the moving organization and its descendants', () => {
    const filtered = filterTreeForMove(orgTree, 'child');

    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.children?.map((org) => org.id)).toEqual(['sibling']);
  });

  it('maps organizations to tree select data', () => {
    expect(toTreeSelectData(orgTree)).toEqual([
      {
        value: 'root',
        title: '根组织',
        children: [
          {
            value: 'child',
            title: '研发中心',
            children: [{ value: 'grandchild', title: '平台组' }],
          },
          { value: 'sibling', title: '运营中心' },
        ],
      },
    ]);
  });

  it('renders a move dialog for the selected organization', () => {
    renderWithProvider(
      <MoveOrgModal
        open
        org={orgTree[0]?.children?.[0]}
        tree={orgTree}
        submitting={false}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByRole('dialog', { name: '移动组织' })).toBeInTheDocument();
    expect(screen.getByText('选择上级组织')).toBeInTheDocument();
    expect(screen.queryByText('平台组')).not.toBeInTheDocument();
  });
});
