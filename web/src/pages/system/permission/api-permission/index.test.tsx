import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PermissionService } from '@/api/permission';
import { clearAuthForTest, signInAsAdminForTest } from '@/test/auth-test-helpers';
import { ApiPermissionPage } from './index';

// 生产环境的 t / notice 是稳定引用，mock 也要稳定，否则会触发页面 effect 反复重新请求。
const mocks = vi.hoisted(() => ({
  t: (key: string) => key,
  notice: { error: vi.fn(), success: vi.fn() },
  dictItems: {
    options: [],
    items: [],
    loading: false,
    getItemByValue: () => undefined,
    getLabelByValue: (value: string) => value,
  },
}));

vi.mock('@/hooks/use-nebula-i18n', () => ({
  useNebulaI18n: () => ({ t: mocks.t }),
}));

vi.mock('@/hooks/use-notice', () => ({
  useNotice: () => mocks.notice,
}));

vi.mock('@/components/dict-select', () => ({
  DictLabel: ({ value }: { readonly dictCode: string; readonly value: string }) => <span>{value}</span>,
  useDictItems: () => mocks.dictItems,
}));

vi.mock('@/api/permission', () => ({
  permissionService: {
    listSubjects: vi.fn().mockResolvedValue({ orgs: [], roles: [], users: [] }),
    listApis: vi.fn().mockResolvedValue([]),
    pageSubjectPermissions: vi.fn().mockResolvedValue({ data: [], total: 0 }),
  },
}));

function createPermissionService(apis: Awaited<ReturnType<PermissionService['listApis']>>): PermissionService {
  return {
    listSubjects: vi.fn().mockResolvedValue({
      orgs: [{ id: 'org1', type: 'ORG', name: 'Org 1', code: 'ORG1' }],
      roles: [],
      users: [],
    }),
    listMenuTree: vi.fn().mockResolvedValue([]),
    pageButtons: vi.fn().mockResolvedValue({ data: [], total: 0 }),
    listApis: vi.fn().mockResolvedValue(apis),
    pageSubjectPermissions: vi.fn().mockResolvedValue({
      data: [{ id: 'grant1', subjectType: 'ORG', subjectId: 'org1', resourceType: 'API', resourceId: 'api-1', effect: 'Deny', scope: 'ALL' }],
      total: 1,
    }),
    createPermissions: vi.fn().mockResolvedValue([]),
    createPermissionItems: vi.fn().mockResolvedValue([]),
    updatePermissions: vi.fn().mockResolvedValue([]),
    updatePermission: vi.fn().mockResolvedValue('permission-id'),
    removePermissionsBySubjectAndResources: vi.fn().mockResolvedValue(undefined),
  };
}

describe('ApiPermissionPage', () => {
  afterEach(() => {
    clearAuthForTest();
  });

  it('renders without crashing', async () => {
    signInAsAdminForTest();
    render(<ApiPermissionPage />);
    expect(await screen.findByText('auth.apiPermission.title')).toBeInTheDocument();
  });

  it('groups api resources by module and renders loaded denied grants as tri-state controls', async () => {
    const service = createPermissionService([
      { id: 'api-1', name: '查询文件', code: 'STORAGE_FILE_QUERY', module: 'storage', status: 1 },
      { id: 'api-2', name: '查询通用配置', code: 'PARAM_GENERAL_CONFIG_QUERY', module: 'param', status: 1 },
    ]);

    signInAsAdminForTest();
    render(<ApiPermissionPage service={service} />);

    // 模块名由字典解析，这里 mock 为原值；模块分组节点与模块筛选下拉都会出现同名文本
    expect((await screen.findAllByText('storage')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('param').length).toBeGreaterThan(0);
    expect(screen.getByText('查询文件')).toBeInTheDocument();
    expect(screen.getByText('STORAGE_FILE_QUERY')).toBeInTheDocument();

    const permissionToggle = await screen.findByRole('checkbox', { name: '查询文件 auth.apiPermission.effects.deny' });

    expect(permissionToggle).toHaveAttribute('aria-checked', 'mixed');
    expect(permissionToggle).toHaveAttribute('data-permission-effect', 'Deny');
  });

  it('renders api resources without a grant as unset', async () => {
    const service = createPermissionService([
      { id: 'api-1', name: '查询文件', code: 'STORAGE_FILE_QUERY', module: 'storage', status: 1 },
    ]);
    service.pageSubjectPermissions = vi.fn().mockResolvedValue({ data: [], total: 0 });

    signInAsAdminForTest();
    render(<ApiPermissionPage service={service} />);

    const permissionToggle = await screen.findByRole('checkbox', { name: '查询文件 auth.apiPermission.effects.none' });

    expect(permissionToggle).toHaveAttribute('aria-checked', 'false');
  });
});
