import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ApiPermissionService } from '@/api/api-permission';
import { clearAuthForTest, signInAsAdminForTest } from '@/test/auth-test-helpers';
import { ApiManagementPage } from './index';

// 生产环境的 t / notice 是稳定引用，mock 也要稳定，否则会触发页面 effect 反复重新请求。
const mocks = vi.hoisted(() => ({
  t: (key: string) => key,
  notice: { error: vi.fn(), success: vi.fn() },
}));

vi.mock('@/hooks/use-nebula-i18n', () => ({
  useNebulaI18n: () => ({ t: mocks.t }),
}));

vi.mock('@/hooks/use-notice', () => ({
  useNotice: () => mocks.notice,
}));

vi.mock('@/components/dict-select', () => ({
  DictLabel: ({ value }: { readonly dictCode: string; readonly value: string }) => <span>{value}</span>,
  DictSelect: () => <select aria-label="所属模块" />,
}));

vi.mock('@/api/api-permission', () => ({
  apiPermissionService: {
    pageApis: vi.fn().mockResolvedValue({ data: [], total: 0 }),
    getReconciliation: vi.fn().mockResolvedValue({ unregisteredPermissions: [], unusedApiPermissions: [] }),
  },
}));

describe('ApiManagementPage', () => {
  afterEach(() => {
    clearAuthForTest();
  });

  it('renders without crashing', () => {
    signInAsAdminForTest();
    render(<ApiManagementPage />);
    expect(screen.getByText('auth.apiManagement.tabs.list')).toBeInTheDocument();
  });

  it('loads the reconciliation view only when its tab becomes active', async () => {
    const getReconciliation = vi.fn().mockResolvedValue({
      unregisteredPermissions: [
        {
          code: 'STORAGE_FILE_QUERY',
          resourceType: 'API',
          endpoints: [{ httpMethod: 'GET', pathPattern: '/api/storage/files/{id}', handler: 'StorageController#getStorageFile' }],
        },
      ],
      unusedApiPermissions: [],
    });
    const service: ApiPermissionService = {
      createApi: vi.fn().mockResolvedValue('api-1'),
      updateApi: vi.fn().mockResolvedValue('api-1'),
      removeApi: vi.fn().mockResolvedValue(undefined),
      getApiById: vi.fn().mockResolvedValue({ id: 'api-1', code: 'STORAGE_FILE_QUERY', name: '查询文件', status: 1 }),
      pageApis: vi.fn().mockResolvedValue({ data: [], total: 0 }),
      listApis: vi.fn().mockResolvedValue([]),
      getReconciliation,
    };

    signInAsAdminForTest();
    const user = userEvent.setup();
    render(<ApiManagementPage service={service} />);

    expect(getReconciliation).not.toHaveBeenCalled();
    expect(await screen.findByText('auth.apiManagement.tabs.list')).toBeInTheDocument();

    await user.click(screen.getByText('auth.apiManagement.tabs.reconciliation'));

    expect(getReconciliation).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('STORAGE_FILE_QUERY')).toBeInTheDocument();
    expect(screen.getByText('GET /api/storage/files/{id} → StorageController#getStorageFile')).toBeInTheDocument();
    // 未登记有 1 条 → 表格；未使用为空 → 空态
    expect(screen.getByText('auth.apiManagement.reconciliation.unusedEmpty')).toBeInTheDocument();
  });
});
