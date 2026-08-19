import { Button } from 'antd';
import { render } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { NebulaProTable } from '.';
import type { NebulaProColumns } from '.';

interface DemoRecord {
  id: string;
  name: string;
}

const columns: NebulaProColumns<DemoRecord>[] = [
  { title: 'Name', dataIndex: 'name' },
];

function renderTable(props: Partial<React.ComponentProps<typeof NebulaProTable<DemoRecord>>> = {}) {
  return render(
    <NebulaProTable<DemoRecord>
      columns={columns}
      dataSource={[{ id: '1', name: 'Alpha' }]}
      pagination={false}
      search={false}
      {...props}
    />,
  );
}

describe('NebulaProTable toolbar', () => {
  it('keeps built-in toolbar actions on the right when there are no custom buttons', () => {
    const toolbarCss = readFileSync(`${process.cwd()}/src/components/nebula-pro-table/toolbar.css`, 'utf8');

    expect(toolbarCss).toMatch(/\.nebula-pro-table-toolbar \.ant-pro-table-list-toolbar-right \{[^}]*justify-content:\s*flex-end;/s);
  });

  it('keeps custom toolbar buttons on the left while built-in actions stay available', () => {
    const toolbarCss = readFileSync(`${process.cwd()}/src/components/nebula-pro-table/toolbar.css`, 'utf8');
    const { container } = renderTable({
      toolBarRender: () => [<Button key="create">Create</Button>],
    });

    const customActions = container.querySelector<HTMLElement>(
      '.nebula-pro-table-toolbar .ant-pro-table-list-toolbar-right > div:not(.ant-pro-table-list-toolbar-setting-items)',
    );
    const builtInActions = container.querySelector<HTMLElement>(
      '.nebula-pro-table-toolbar .ant-pro-table-list-toolbar-setting-items',
    );

    expect(customActions).toHaveTextContent('Create');
    expect(toolbarCss).toContain(
      '.nebula-pro-table-toolbar .ant-pro-table-list-toolbar-right > div:not(.ant-pro-table-list-toolbar-setting-items):first-child',
    );
    expect(toolbarCss).toMatch(/> div:not\(\.ant-pro-table-list-toolbar-setting-items\):first-child \{[^}]*justify-content:\s*flex-start;/s);
    expect(builtInActions).toBeInTheDocument();
  });

  it('does not enable the density toggle by default', () => {
    const { container } = renderTable();

    expect(container.querySelector('.anticon-column-height')).not.toBeInTheDocument();
  });

  it('hides the whole toolbar when toolbar is false', () => {
    const { container } = renderTable({ toolbar: false });

    expect(container.querySelector('.ant-pro-table-list-toolbar')).not.toBeInTheDocument();
  });
});
