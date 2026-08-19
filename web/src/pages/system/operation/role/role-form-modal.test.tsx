import { Form } from 'antd';
import { render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NebulaProvider } from '@/providers/nebula-provider';
import { useLocaleStore } from '@/stores/locale-store';
import { RoleFormModal } from './role-form-modal';
import type { RoleFormValues } from './role-form-modal';

function ModalHarness({ mode = 'create' }: { mode?: 'create' | 'update' }) {
  const [form] = Form.useForm<RoleFormValues>();

  return (
    <NebulaProvider>
      <RoleFormModal
        form={form}
        mode={mode}
        open
        submitting={false}
        detailLoading={false}
        onCancel={vi.fn()}
        onSubmit={vi.fn()}
      />
    </NebulaProvider>
  );
}

describe('RoleFormModal', () => {
  afterEach(() => {
    useLocaleStore.getState().setLocale('zh-CN');
  });

  it('renders the role form fields as a replaceable page-private modal component', () => {
    render(<ModalHarness />);

    const dialog = screen.getByRole('dialog', { name: '新增角色' });
    expect(within(dialog).getByLabelText('角色名称')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('角色编码')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('状态')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('角色描述')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: /保\s*存/ })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: /取\s*消/ })).toBeInTheDocument();
  });

  it('renders modal labels from the active English locale', () => {
    useLocaleStore.getState().setLocale('en-US');

    render(<ModalHarness mode="update" />);

    const dialog = screen.getByRole('dialog', { name: 'Edit Role' });
    expect(within(dialog).getByLabelText('Role Name')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Role Code')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Status')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Description')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Save' })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });
});
