import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NebulaProvider } from '@/providers/nebula-provider';
import { EncryptedValueField } from './index';
import type { EncryptedValueFieldProps } from './types';

function renderField(props: EncryptedValueFieldProps) {
  render(
    <NebulaProvider>
      <div data-testid="encrypted-value-field">
        <EncryptedValueField {...props} />
      </div>
    </NebulaProvider>,
  );
  return screen.getByTestId('encrypted-value-field');
}

/** 二次确认按钮渲染在 Popconfirm 浮层里，需按浮层归属挑出确定键。 */
function getConfirmationButton(name: RegExp): HTMLElement {
  const button = screen
    .getAllByRole('button', { name })
    .find((element) => element.closest('.ant-popover') instanceof HTMLElement);
  if (button instanceof HTMLElement) return button;
  throw new Error(`Unable to find confirmation button: ${name.source}`);
}

describe('EncryptedValueField', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the unconfigured state with a set action and no value input', () => {
    const scope = renderField({ editing: true, value: { configured: false } });

    expect(within(scope).getByText('未配置')).toBeInTheDocument();
    expect(within(scope).getByRole('button', { name: /设\s*置/ })).toBeInTheDocument();
    expect(within(scope).queryByRole('button', { name: /修\s*改/ })).not.toBeInTheDocument();
    expect(within(scope).queryByRole('button', { name: /清\s*除/ })).not.toBeInTheDocument();
    expect(within(scope).queryByText('****')).not.toBeInTheDocument();
    expect(scope.querySelector('input')).toBeNull();
  });

  it('renders the configured state as a fixed mask with no ciphertext and no input', () => {
    const scope = renderField({ editing: true, value: { configured: true } });

    expect(within(scope).getByText('已配置')).toBeInTheDocument();
    expect(within(scope).getByText('****')).toBeInTheDocument();
    expect(within(scope).getByRole('button', { name: /修\s*改/ })).toBeInTheDocument();
    expect(within(scope).getByRole('button', { name: /清\s*除/ })).toBeInTheDocument();
    expect(scope.querySelector('input')).toBeNull();
  });

  it('offers no action at all when the form is not editable', () => {
    const scope = renderField({ value: { configured: true } });

    expect(within(scope).getByText('已配置')).toBeInTheDocument();
    expect(within(scope).getByText('****')).toBeInTheDocument();
    expect(within(scope).queryAllByRole('button')).toHaveLength(0);
  });

  it('opens an empty password input with the keep hint and never seeds it with a stored value', async () => {
    const user = userEvent.setup();
    const scope = renderField({ editing: true, value: { configured: true } });

    await user.click(within(scope).getByRole('button', { name: /修\s*改/ }));

    const input = within(scope).getByLabelText('参数值');
    expect(input).toHaveAttribute('type', 'password');
    expect(input).toHaveValue('');
    expect(within(scope).getByText('留空则不修改')).toBeInTheDocument();
    expect(within(scope).queryByText('****')).not.toBeInTheDocument();
  });

  it('emits set while typing, keep when the input is emptied, and toggles visibility', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const scope = renderField({ editing: true, value: { configured: true }, onChange });

    await user.click(within(scope).getByRole('button', { name: /修\s*改/ }));
    const input = within(scope).getByLabelText('参数值');

    await user.type(input, 'new-secret');
    expect(onChange).toHaveBeenLastCalledWith({ kind: 'set', value: 'new-secret' });

    await user.clear(input);
    expect(onChange).toHaveBeenLastCalledWith({ kind: 'keep' });

    await user.type(input, 'rotated');
    expect(input).toHaveAttribute('type', 'password');
    await user.click(within(scope).getByRole('button', { name: '显示' }));
    expect(input).toHaveAttribute('type', 'text');
  });

  it('returns to keep when a draft is cancelled', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const scope = renderField({ editing: true, value: { configured: true }, onChange });

    await user.click(within(scope).getByRole('button', { name: /修\s*改/ }));
    await user.type(within(scope).getByLabelText('参数值'), 'discarded');
    await user.click(within(scope).getByRole('button', { name: /取\s*消/ }));

    expect(onChange).toHaveBeenLastCalledWith({ kind: 'keep' });
    expect(within(scope).getByText('已配置')).toBeInTheDocument();
    expect(within(scope).getByText('****')).toBeInTheDocument();
  });

  it('requires a confirmation before emitting clear and then renders the unconfigured state', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const scope = renderField({ editing: true, value: { configured: true }, onChange });

    await user.click(within(scope).getByRole('button', { name: /清\s*除/ }));
    expect(onChange).not.toHaveBeenCalled();

    expect(await screen.findByText('确定清除该加密参数的值吗？')).toBeInTheDocument();
    await user.click(getConfirmationButton(/清\s*除/));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({ kind: 'clear' });
    expect(within(scope).getByText('未配置')).toBeInTheDocument();
    expect(scope.querySelector('input')).toBeNull();
  });

  it('lets an unconfigured field accept a new value without offering a clear action', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const scope = renderField({ editing: true, value: { configured: false }, onChange });

    await user.click(within(scope).getByRole('button', { name: /设\s*置/ }));
    expect(within(scope).queryByText('留空则不修改')).not.toBeInTheDocument();

    await user.type(within(scope).getByLabelText('参数值'), 'fresh-secret');
    expect(onChange).toHaveBeenLastCalledWith({ kind: 'set', value: 'fresh-secret' });
  });
});
