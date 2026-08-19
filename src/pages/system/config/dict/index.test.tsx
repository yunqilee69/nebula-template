import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NebulaProvider } from '@/providers/nebula-provider';
import type { DictService } from '@/services/dict';
import type { DictItemDetailResp, DictItemTreeResp, DictTypeDetailResp } from '@/types/dict';
import type { PageResp } from '@/types/auth-management';
import { DictManagementPage } from './index';

const dictType: DictTypeDetailResp = { id: 'type-1', code: 'SYS_STATUS', name: 'System Status', remark: 'Status dictionary' };

const dictItem: DictItemDetailResp = {
  id: 'item-1',
  dictCode: 'SYS_STATUS',
  name: 'Enabled',
  itemValue: '1',
  sort: 1,
  enabled: true,
  tagColor: 'green',
  remark: 'Enabled status',
};

const dictItemOption: DictItemTreeResp = { ...dictItem };

function createDictService(overrides: Partial<DictService> = {}): DictService {
  const typePage: PageResp<DictTypeDetailResp> = {
    data: [dictType],
    total: 1,
  };
  const itemPage: PageResp<DictItemDetailResp> = { data: [dictItem], total: 1 };

  return {
    pageTypes: overrides.pageTypes ?? vi.fn().mockResolvedValue(typePage),
    getType: overrides.getType ?? vi.fn().mockResolvedValue(dictType),
    createType: overrides.createType ?? vi.fn().mockResolvedValue(undefined),
    updateType: overrides.updateType ?? vi.fn().mockResolvedValue(undefined),
    deleteType: overrides.deleteType ?? vi.fn().mockResolvedValue(undefined),
    pageItems: overrides.pageItems ?? vi.fn().mockResolvedValue(itemPage),
    getItem: overrides.getItem ?? vi.fn(),
    createItem: overrides.createItem ?? vi.fn().mockResolvedValue(undefined),
    updateItem: overrides.updateItem ?? vi.fn().mockResolvedValue(undefined),
    deleteItem: overrides.deleteItem ?? vi.fn().mockResolvedValue(undefined),
    listItemsByCode: overrides.listItemsByCode ?? vi.fn().mockResolvedValue([dictItemOption]),
  };
}

function renderDictPage(service = createDictService()) {
  render(
    <NebulaProvider>
      <DictManagementPage service={service} />
    </NebulaProvider>,
  );
  return service;
}

function getModalByTitle(title: string): HTMLElement {
  const titleElement = screen.getAllByText(title).find((element) => element.classList.contains('ant-modal-title'));
  const modal = titleElement?.closest('.ant-modal');
  if (modal instanceof HTMLElement) return modal;
  throw new Error(`Unable to find modal for title: ${title}`);
}

function getPopoverActionButton(name: RegExp): HTMLElement {
  const button = screen.getAllByRole('button', { name }).find((element) => element.closest('.ant-popover') instanceof HTMLElement);
  if (button instanceof HTMLElement) return button;
  throw new Error(`Unable to find popover action button: ${name.source}`);
}

describe('DictManagementPage', () => {
  afterEach(() => {
    cleanup();
  });

  it('loads dictionary types through NebulaProTable and submits code/name search', async () => {
    const user = userEvent.setup();
    const service = renderDictPage();

    expect(await screen.findByText('SYS_STATUS')).toBeInTheDocument();
    expect(screen.getByText('System Status')).toBeInTheDocument();
    expect(service.pageTypes).toHaveBeenCalledWith({ pageNum: 1, pageSize: 10 });

    const proTable = screen.getByTestId('pro-table');
    await user.type(within(proTable).getByLabelText('字典编码'), ' SYS ');
    await user.type(within(proTable).getByLabelText('字典名称'), ' Status ');
    await user.click(screen.getByRole('button', { name: /查\s*询/ }));

    await waitFor(() => {
      expect(service.pageTypes).toHaveBeenLastCalledWith({
        pageNum: 1,
        pageSize: 10,
        code: 'SYS',
        name: 'Status',
      });
    });
  });

  it('opens the create modal from the toolbar and creates a dictionary type', async () => {
    const user = userEvent.setup();
    const service = renderDictPage();

    await user.click(screen.getByRole('button', { name: /新增字典类型/ }));

    const modal = screen.getByRole('dialog', { name: '新增字典类型' });
    expect(modal).toBeInTheDocument();
    await user.type(within(modal).getByLabelText('字典编码'), ' NEW_TYPE ');
    await user.type(within(modal).getByLabelText('字典名称'), ' New Type ');
    await user.type(within(modal).getByLabelText('备注'), ' Created by table ');
    await user.click(within(modal).getByRole('button', { name: /保\s*存/ }));

    await waitFor(() => {
      expect(service.createType).toHaveBeenCalledWith({
        code: 'NEW_TYPE',
        name: 'New Type',
        remark: 'Created by table',
      });
    });
  });

  it('opens dictionary items only from the explicit row action', async () => {
    const user = userEvent.setup();
    const service = renderDictPage();

    await user.click(await screen.findByText('SYS_STATUS'));

    expect(screen.queryByText('字典项管理 - System Status')).not.toBeInTheDocument();
    expect(service.listItemsByCode).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /^字典项$/ }));

    expect(await screen.findByText('字典项管理 - System Status')).toBeInTheDocument();
    expect(service.listItemsByCode).toHaveBeenCalledWith('SYS_STATUS');
  });

  it('updates a dictionary type from the edit action without opening the item modal', async () => {
    const user = userEvent.setup();
    const service = renderDictPage();

    await screen.findByText('SYS_STATUS');

    await user.click(screen.getByRole('button', { name: /编辑/ }));

    const modal = screen.getByRole('dialog', { name: '编辑字典类型' });
    expect(modal).toBeInTheDocument();
    expect(screen.queryByText('字典项管理 - System Status')).not.toBeInTheDocument();
    expect(service.listItemsByCode).not.toHaveBeenCalled();

    await waitFor(() => expect(within(modal).getByDisplayValue('System Status')).toBeInTheDocument());
    await user.clear(within(modal).getByLabelText('字典名称'));
    await user.type(within(modal).getByLabelText('字典名称'), ' System Status Updated ');
    await user.clear(within(modal).getByLabelText('备注'));
    await user.type(within(modal).getByLabelText('备注'), ' Updated type remark ');
    await user.click(within(modal).getByRole('button', { name: /保\s*存/ }));

    await waitFor(() => {
      expect(service.updateType).toHaveBeenCalledWith('type-1', {
        name: 'System Status Updated',
        remark: 'Updated type remark',
      });
    });
  });

  it('deletes a dictionary type through confirmation without opening the item modal', async () => {
    const user = userEvent.setup();
    const service = renderDictPage();

    await screen.findByText('SYS_STATUS');
    await user.click(screen.getByRole('button', { name: /删除/ }));
    expect(await screen.findByText('确定删除该字典类型吗？')).toBeInTheDocument();
    const confirmButtons = screen.getAllByRole('button', { name: /删\s*除/ });
    await user.click(confirmButtons[1]);

    await waitFor(() => {
      expect(service.deleteType).toHaveBeenCalledWith('type-1');
    });
    expect(screen.queryByText('字典项管理 - System Status')).not.toBeInTheDocument();
    expect(service.listItemsByCode).not.toHaveBeenCalled();
  });

  it('shows the empty state when no dictionary types are returned', async () => {
    const emptyPage: PageResp<DictTypeDetailResp> = { data: [], total: 0 };
    renderDictPage(createDictService({ pageTypes: vi.fn().mockResolvedValue(emptyPage) }));

    expect(await screen.findAllByText('暂无数据')).not.toHaveLength(0);
  });

  it('creates, edits, and deletes dictionary items through the item modal', async () => {
    const user = userEvent.setup();
    const service = renderDictPage();

    await screen.findByText('SYS_STATUS');
    await user.click(screen.getByRole('button', { name: /^字典项$/ }));
    expect(await screen.findByText('字典项管理 - System Status')).toBeInTheDocument();
    const itemDialog = getModalByTitle('字典项管理 - System Status');
    expect(await within(itemDialog).findByText('Enabled')).toBeInTheDocument();
    expect(service.pageItems).toHaveBeenCalledWith({ pageNum: 1, pageSize: 10, dictCode: 'SYS_STATUS' });

    await user.click(within(itemDialog).getByRole('button', { name: /新增字典项/ }));
    await waitFor(() => expect(getModalByTitle('新增字典项')).toBeInTheDocument());
    const createDialog = getModalByTitle('新增字典项');
    await user.type(within(createDialog).getByPlaceholderText('请输入字典名称'), ' Disabled ');
    await user.type(within(createDialog).getByPlaceholderText('请输入字典项值'), ' 0 ');
    await user.clear(within(createDialog).getByRole('spinbutton', { name: '排序' }));
    await user.type(within(createDialog).getByRole('spinbutton', { name: '排序' }), '2');
    await user.type(within(createDialog).getByPlaceholderText('请选择标签颜色'), ' default ');
    await user.click(within(createDialog).getByRole('button', { name: /保\s*存/ }));

    await waitFor(() => {
      expect(service.createItem).toHaveBeenCalledWith({
        dictCode: 'SYS_STATUS',
        name: 'Disabled',
        itemValue: '0',
        sort: 2,
        enabled: true,
        tagColor: 'default',
      });
    });

    await user.click(within(itemDialog).getByRole('button', { name: /编辑/ }));
    await waitFor(() => expect(getModalByTitle('编辑字典项')).toBeInTheDocument());
    const editDialog = getModalByTitle('编辑字典项');
    await user.clear(within(editDialog).getByPlaceholderText('请输入字典名称'));
    await user.type(within(editDialog).getByPlaceholderText('请输入字典名称'), ' Enabled Updated ');
    await user.clear(within(editDialog).getByPlaceholderText('请输入字典项值'));
    await user.type(within(editDialog).getByPlaceholderText('请输入字典项值'), ' enabled ');
    await user.click(within(editDialog).getByRole('button', { name: /保\s*存/ }));

    await waitFor(() => {
      expect(service.updateItem).toHaveBeenCalledWith('item-1', expect.objectContaining({
        name: 'Enabled Updated',
        itemValue: 'enabled',
      }));
    });

    await user.click(within(itemDialog).getByRole('button', { name: /删除/ }));
    expect(await screen.findByText('确定删除该字典项吗？')).toBeInTheDocument();
    await user.click(getPopoverActionButton(/删\s*除/));

    await waitFor(() => {
      expect(service.deleteItem).toHaveBeenCalledWith('item-1');
    });
  });
});
