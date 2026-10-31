import { App } from 'antd';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent, { PointerEventsCheckLevel } from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/stores/auth-store';
import { useLocaleStore } from '@/stores/locale-store';
import type { CurrentUser, PersonTenant } from '@/types/auth';
import { HeaderTenantSwitcher } from './header-tenant-switcher';

const personServiceMocks = vi.hoisted(() => ({
  switchableTenants: vi.fn(),
}));

vi.mock('@/api/person', () => ({
  personService: personServiceMocks,
}));

const currentTenant: PersonTenant = {
  tenantId: 'tenant-default',
  code: 'default',
  name: '默认企业',
  status: 'ACTIVE',
};

const otherTenant: PersonTenant = {
  tenantId: 'tenant-acme',
  code: 'acme',
  name: 'Acme 企业',
  status: 'ACTIVE',
};

function setLoggedInUser(overrides: Partial<CurrentUser> = {}) {
  useAuthStore.getState().setUser({
    id: 'user-1',
    name: 'Administrator',
    roles: [],
    permissions: [],
    tenantId: currentTenant.tenantId,
    tenantCode: currentTenant.code,
    tenantName: currentTenant.name,
    personId: 'person-1',
    ...overrides,
  });
}

function renderSwitcher() {
  render(
    <App>
      <HeaderTenantSwitcher />
    </App>,
  );
}

describe('HeaderTenantSwitcher', () => {
  beforeEach(() => {
    useLocaleStore.getState().setLocale('zh-CN');
    setLoggedInUser();
    personServiceMocks.switchableTenants.mockResolvedValue([currentTenant]);
  });

  afterEach(() => {
    cleanup();
    useAuthStore.getState().clearUser();
    personServiceMocks.switchableTenants.mockReset();
  });

  it('renders nothing when only the current enterprise is available', async () => {
    renderSwitcher();

    await waitFor(() => expect(personServiceMocks.switchableTenants).toHaveBeenCalledOnce());
    await waitFor(() => expect(screen.queryByRole('button')).not.toBeInTheDocument());
  });

  it('renders nothing when the account is not bound to a platform account', async () => {
    setLoggedInUser({ personId: undefined });
    renderSwitcher();

    await waitFor(() => expect(screen.queryByRole('button')).not.toBeInTheDocument());
    expect(personServiceMocks.switchableTenants).not.toHaveBeenCalled();
  });

  it('shows the current enterprise and lists the other switchable enterprises', async () => {
    personServiceMocks.switchableTenants.mockResolvedValue([currentTenant, otherTenant]);
    const user = userEvent.setup({ pointerEventsCheck: PointerEventsCheckLevel.Never });
    renderSwitcher();

    const trigger = await screen.findByRole('button', { name: '切换企业: 默认企业' });
    await user.click(trigger);

    const menu = await screen.findByRole('menu', { name: '可切换的企业' });
    expect(within(menu).getByRole('menuitem', { name: 'Acme 企业' })).toBeInTheDocument();
    expect(within(menu).queryByText('默认企业')).not.toBeInTheDocument();
  });
});
