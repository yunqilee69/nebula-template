import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NebulaProvider } from '@/providers/nebula-provider';
import { useLocaleStore } from '@/stores/locale-store';
import { AuditLogPage } from './index';

const auditRecords = [
  {
    id: 'audit-1',
    operatorId: 'user-1',
    operatorName: 'Alice',
    module: 'user',
    action: 'UPDATE',
    resourceType: 'user',
    resourceId: 'user-2',
    resourceName: 'Bob',
    requestParams: '{"nickname":"Bob"}',
    responseData: '{"updated":true}',
    requestIp: '127.0.0.1',
    resultStatus: 'SUCCESS' as const,
    resultMessage: 'updated',
    createTime: '2026-08-06T10:00:00',
    updateTime: '2026-08-06T10:00:01',
  },
  {
    id: 'audit-2',
    operatorId: 'user-1',
    operatorName: 'Alice',
    module: 'user',
    action: 'UNKNOWN_ACTION',
    resourceType: 'user',
    resourceId: 'user-3',
    resourceName: 'Carol',
    requestIp: '127.0.0.1',
    resultStatus: 'FAILURE' as const,
    resultMessage: 'rejected',
    createTime: '2026-08-06T11:00:00',
    updateTime: '2026-08-06T11:00:01',
  },
  {
    id: 'audit-3',
    operatorId: 'user-1',
    operatorName: 'Alice',
    module: 'user',
    action: 'DELETE',
    resourceType: 'user',
    resourceId: 'user-4',
    resourceName: 'Dave',
    requestIp: '127.0.0.1',
    resultStatus: 'SUCCESS' as const,
    resultMessage: 'deleted',
    createTime: '2026-08-06T12:00:00',
    updateTime: '2026-08-06T12:00:01',
  },
];

const actionOptions = [
  { label: '更新', value: 'UPDATE', disabled: false },
  { label: '删除', value: 'DELETE', disabled: true },
];

vi.mock('@/components/dict-select', () => ({
  useDictItems: () => ({
    options: actionOptions,
    items: [],
    loading: false,
    getItemByValue: () => undefined,
    getLabelByValue: () => undefined,
  }),
}));

function createService() {
  return {
    pageRecords: vi.fn().mockResolvedValue({ data: auditRecords, total: auditRecords.length }),
    getRecordDetail: vi.fn().mockImplementation((id: string) => {
      const record = auditRecords.find((item) => item.id === id);
      return Promise.resolve(record);
    }),
  };
}

function renderPage() {
  const service = createService();
  render(
    <NebulaProvider>
      <AuditLogPage service={service} />
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

describe('AuditLogPage', () => {
  beforeEach(() => {
    useLocaleStore.getState().setLocale('en-US');
  });

  afterEach(() => {
    cleanup();
    useLocaleStore.getState().setLocale('zh-CN');
  });

  it('shows enabled audit_action Chinese names in every locale and falls back to raw codes', async () => {
    renderPage();

    expect(await screen.findByText('更新')).toBeInTheDocument();
    expect(screen.getByText('UNKNOWN_ACTION')).toBeInTheDocument();
    expect(screen.getByText('DELETE')).toBeInTheDocument();
    expect(screen.queryByText('删除')).not.toBeInTheDocument();
  });

  it('submits the selected audit_action itemValue as the action filter', async () => {
    const user = userEvent.setup();
    const service = renderPage();

    await screen.findByText('更新');
    const actionSelect = screen.getByRole('combobox', { name: 'Action' });
    await user.click(actionSelect);
    await user.click(await screen.findByText('更新', { selector: '.ant-select-item-option-content' }));
    await user.click(screen.getByRole('button', { name: /Query/ }));

    await waitFor(() => {
      expect(service.pageRecords).toHaveBeenLastCalledWith({
        pageNum: 1,
        pageSize: 20,
        action: 'UPDATE',
      });
    });
  });

  it('uses the same dictionary resolver in record detail', async () => {
    const user = userEvent.setup();
    const service = renderPage();

    await screen.findByText('更新');
    await user.click(screen.getByRole('button', { name: 'Details audit-1' }));

    await waitFor(() => expect(service.getRecordDetail).toHaveBeenCalledWith('audit-1'));
    await screen.findByText('Audit Record Detail');
    const dialog = getModalByTitle('Audit Record Detail');
    expect(within(dialog).getByText('更新')).toBeInTheDocument();
  });
});
