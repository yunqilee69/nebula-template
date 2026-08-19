import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { NeTree } from './index';
import type { NeTreeNode } from './types';

const treeData: NeTreeNode[] = [
  {
    key: 'root',
    title: '全部组织',
    tag: '全部',
    children: [
      {
        key: 'rnd',
        title: '研发中心',
        children: [
          { key: 'platform', title: '平台工程组' },
          { key: 'product', title: '产品体验组' },
        ],
      },
      { key: 'ops', title: '业务运营部', disabled: true },
    ],
  },
];

describe('NeTree', () => {
  it('renders a reusable tree panel with title, extra content, and selected item', () => {
    const { container } = render(
      <NeTree
        title="按组织过滤"
        dataSource={treeData}
        selectedKey="root"
        extra={<span>5 个节点</span>}
      />,
    );

    expect(screen.getByText('按组织过滤')).toBeInTheDocument();
    expect(screen.getByText('5 个节点')).toBeInTheDocument();
    expect(screen.getByText('全部组织')).toBeInTheDocument();
    expect(screen.getByText('研发中心')).toBeInTheDocument();
    expect(screen.getByText('平台工程组')).toBeInTheDocument();
    expect(screen.getByText('全部')).toBeInTheDocument();
    expect(screen.getByRole('treeitem', { name: /全部组织/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tree').parentElement).toHaveStyle({ overflowY: 'auto' });
    expect(container.firstElementChild).toHaveStyle({ overflow: 'hidden' });
  });

  it('calls onSelect with the selected tree node', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(<NeTree title="角色树" dataSource={treeData} onSelect={onSelect} />);

    await user.click(screen.getByText('研发中心'));

    expect(onSelect).toHaveBeenCalledWith('rnd', expect.objectContaining({ title: '研发中心' }));
  });

  it('filters nodes by keyword when searchable is enabled', async () => {
    const user = userEvent.setup();

    render(<NeTree title="按组织过滤" dataSource={treeData} searchable searchPlaceholder="搜索组织" />);

    await user.type(screen.getByPlaceholderText('搜索组织'), '平台');

    expect(screen.getByText('平台工程组')).toBeInTheDocument();
    expect(screen.queryByText('产品体验组')).not.toBeInTheDocument();
  });

  it('filters nodes by optional search text without changing the visible title', async () => {
    const user = userEvent.setup();
    const roleTreeData: NeTreeNode[] = [
      { key: 'admin', title: '管理员', searchText: '管理员 ADMIN' },
      { key: 'auditor', title: '审计员', searchText: '审计员 AUDITOR' },
    ];

    render(<NeTree title="角色树" dataSource={roleTreeData} searchable searchPlaceholder="搜索角色" />);

    await user.type(screen.getByPlaceholderText('搜索角色'), 'AUD');

    expect(screen.getByText('审计员')).toBeInTheDocument();
    expect(screen.queryByText('管理员')).not.toBeInTheDocument();
    expect(screen.queryByText('AUDITOR')).not.toBeInTheDocument();
  });

  it('allows parent nodes to collapse and expand their children', async () => {
    const user = userEvent.setup();

    render(<NeTree title="按组织过滤" dataSource={treeData} />);

    expect(screen.getByText('产品体验组')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '折叠 研发中心' }));

    expect(screen.queryByText('产品体验组')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '展开 研发中心' }));

    expect(screen.getByText('产品体验组')).toBeInTheDocument();
  });

  it('renders per-node actions without selecting the node', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const actionTreeData: NeTreeNode[] = [
      {
        key: 'root',
        title: '全部组织',
        actions: <button type="button">更多操作</button>,
      },
    ];

    render(<NeTree title="按组织过滤" dataSource={actionTreeData} onSelect={onSelect} />);

    await user.click(screen.getByRole('button', { name: '更多操作' }));

    expect(onSelect).not.toHaveBeenCalled();
  });

  it('omits the title row when title and extra are null', () => {
    const { container } = render(<NeTree title={null} extra={null} dataSource={[{ key: 'root', title: '全部组织' }]} />);

    expect(container.firstElementChild?.children).toHaveLength(1);
  });
});
