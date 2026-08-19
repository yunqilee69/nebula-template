import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { dictService } from '@/services/dict';
import { useDictCacheStore } from '@/stores/dict-cache-store';
import { DataType } from '@/types/param';
import type { DictItemTreeResp } from '@/types/dict';
import {
  ParamValueInput,
  buildParamValueRules,
  toParamInputValue,
} from './param-value-input';

vi.mock('@/hooks/use-nebula-i18n', () => ({
  useNebulaI18n: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/services/dict', () => ({
  dictService: {
    listItemsByCode: vi.fn(),
  },
}));

const listItemsByCode = vi.mocked(dictService.listItemsByCode);

const enabledItem: DictItemTreeResp = {
  id: 'enabled',
  dictCode: 'FEATURE_FLAG',
  name: 'Enabled',
  itemValue: 'enabled',
  sort: 1,
  enabled: true,
};

const disabledChildItem: DictItemTreeResp = {
  id: 'disabled-child',
  dictCode: 'FEATURE_FLAG',
  name: 'Disabled Child',
  itemValue: 'disabled-child',
  sort: 2,
  enabled: false,
};

describe('ParamValueInput helpers', () => {
  it('normalizes API values into input-friendly values by data type', () => {
    expect(toParamInputValue('  text  ', DataType.STRING)).toBe('text');
    expect(toParamInputValue('42', DataType.INT)).toBe(42);
    expect(toParamInputValue('3.5', DataType.DOUBLE)).toBe(3.5);
    expect(toParamInputValue('1', DataType.BOOLEAN)).toBe(true);
    expect(toParamInputValue('enabled', DataType.SINGLE)).toBe('enabled');
    expect(toParamInputValue('["enabled","disabled-child"]', DataType.MULTIPLE)).toEqual([
      'enabled',
      'disabled-child',
    ]);
  });

  it('does not build backend-deleted validation rules', () => {
    expect(buildParamValueRules()).toEqual([]);
  });
});

describe('ParamValueInput', () => {
  beforeEach(() => {
    useDictCacheStore.getState().reset();
    listItemsByCode.mockReset();
  });

  it('renders the matching Ant Design control for scalar data types', () => {
    const handleChange = vi.fn();
    const { rerender } = render(
      <ParamValueInput dataType={DataType.STRING} value="hello" onChange={handleChange} />,
    );

    expect(screen.getByRole('textbox', { name: 'system.config.param.inputs.value' }).tagName).toBe('TEXTAREA');

    rerender(<ParamValueInput dataType={DataType.INT} value={7} onChange={handleChange} />);
    expect(screen.getByRole('spinbutton', { name: 'system.config.param.inputs.value' })).toHaveValue('7');

    rerender(<ParamValueInput dataType={DataType.DOUBLE} value={3.5} onChange={handleChange} />);
    expect(screen.getByRole('spinbutton', { name: 'system.config.param.inputs.value' })).toHaveValue('3.5');

    rerender(<ParamValueInput dataType={DataType.BOOLEAN} value={true} onChange={handleChange} />);
    expect(screen.getByRole('switch', { name: 'system.config.param.inputs.value' })).toBeChecked();
  });

  it('loads SINGLE and MULTIPLE options from the dictionary service', async () => {
    listItemsByCode.mockResolvedValueOnce([{ ...enabledItem, children: [disabledChildItem] }]);

    const { container } = render(
      <ParamValueInput dataType={DataType.SINGLE} optionCode="FEATURE_FLAG" value="enabled" />,
    );

    await waitFor(() => expect(listItemsByCode).toHaveBeenCalledWith('FEATURE_FLAG'));
    expect(await screen.findByText('Enabled')).toBeInTheDocument();
    expect(container.querySelector('.ant-select-multiple')).not.toBeInTheDocument();
  });

  it('keeps Select usable with empty options when option loading fails', async () => {
    listItemsByCode.mockRejectedValueOnce(new Error('network unavailable'));

    render(<ParamValueInput dataType={DataType.SINGLE} optionCode="FEATURE_FLAG" />);

    await waitFor(() => expect(listItemsByCode).toHaveBeenCalledWith('FEATURE_FLAG'));
    expect(screen.getByRole('combobox', { name: 'system.config.param.inputs.value' })).toBeInTheDocument();
  });
});
