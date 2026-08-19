import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearAuthForTest, signInAsAdminForTest } from '@/test/auth-test-helpers';
import { ButtonManagementPage } from './index';

vi.mock('@/hooks/use-nebula-i18n', () => ({
  useNebulaI18n: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/hooks/use-notice', () => ({
  useNotice: () => ({
    error: vi.fn(),
    success: vi.fn(),
  }),
}));

vi.mock('@/api/menu', () => ({
  menuService: {
    getMenuTree: vi.fn().mockResolvedValue([]),
    pageButtons: vi.fn().mockResolvedValue({ data: [], total: 0 }),
  },
}));

describe('ButtonManagementPage', () => {
  afterEach(() => {
    clearAuthForTest();
  });

  it('renders without crashing', () => {
    signInAsAdminForTest();
    render(<ButtonManagementPage />);
    expect(screen.getByText('auth.buttonManagement.tree.title')).toBeInTheDocument();
  });
});
