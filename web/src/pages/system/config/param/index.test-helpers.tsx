import { render, screen, within } from '@testing-library/react';
import { vi } from 'vitest';
import type { NebulaPageResp } from '@/components/nebula-pro-table';
import { NebulaProvider } from '@/providers/nebula-provider';
import type { ParamService } from '@/services/param';
import type { DictItemTreeResp, DictTypeDetailResp } from '@/types/dict';
import { DataType, type SystemParamDetailResp, type SystemParamResp } from '@/types/param';
import { ParamManagementPage } from './index';

export const paramRecord: SystemParamResp = { id: 'param-1', paramKey: 'security.token', paramName: 'Security Token', dataType: DataType.STRING, moduleCode: 'system' };

export const paramDetailRecord: SystemParamDetailResp = { ...paramRecord, paramValue: 'secret-token' };

export const featureFlagDictType: DictTypeDetailResp = {
  id: 'dict-type-1',
  code: 'FEATURE_FLAG',
  name: 'Feature Flag',
};

export const enabledFeatureItem: DictItemTreeResp = {
  id: 'dict-item-1',
  dictCode: 'FEATURE_FLAG',
  name: 'Enabled',
  itemValue: 'enabled',
  sort: 1,
  enabled: true,
};

export const systemModuleItem: DictItemTreeResp = {
  id: 'module-system',
  dictCode: 'param_module',
  name: 'System Module',
  itemValue: 'system',
  sort: 1,
  enabled: true,
};

export function createParamPage(data: readonly SystemParamResp[] = [paramRecord]): NebulaPageResp<SystemParamResp> {
  return { data: [...data], total: data.length };
}

export function createParamService(overrides: Partial<ParamService> = {}): ParamService {
  return {
    pageParams: overrides.pageParams ?? vi.fn().mockResolvedValue(createParamPage()),
    getParam: overrides.getParam ?? vi.fn().mockResolvedValue(paramDetailRecord),
    createParam: overrides.createParam ?? vi.fn().mockResolvedValue(undefined),
    updateParam: overrides.updateParam ?? vi.fn().mockResolvedValue(undefined),
    deleteParam: overrides.deleteParam ?? vi.fn().mockResolvedValue(undefined),
    getValueByKey: overrides.getValueByKey ?? vi.fn(),
    saveOrUpdateByKey: overrides.saveOrUpdateByKey ?? vi.fn(),
    getByKey: overrides.getByKey ?? vi.fn().mockResolvedValue(paramDetailRecord),
    getIntegerValue: overrides.getIntegerValue ?? vi.fn(),
    getBooleanValue: overrides.getBooleanValue ?? vi.fn(),
    listByModule: overrides.listByModule ?? vi.fn(),
    batchUpdateValues: overrides.batchUpdateValues ?? vi.fn(),
    getGeneralConfig: overrides.getGeneralConfig ?? vi.fn(),
    updateGeneralConfig: overrides.updateGeneralConfig ?? vi.fn(),
  };
}

export function renderParamManagementPage(service = createParamService()) {
  render(
    <NebulaProvider>
      <ParamManagementPage service={service} />
    </NebulaProvider>,
  );
  return service;
}

export function getModalByTitle(title: string): HTMLElement {
  const titleElement = screen.getAllByText(title).find((element) => element.classList.contains('ant-modal-title'));
  const modal = titleElement?.closest('.ant-modal');
  if (modal instanceof HTMLElement) return modal;
  throw new Error(`Unable to find modal for title: ${title}`);
}

export function getPopoverActionButton(name: RegExp): HTMLElement {
  const button = screen.getAllByRole('button', { name }).find((element) => element.closest('.ant-popover') instanceof HTMLElement);
  if (button instanceof HTMLElement) return button;
  throw new Error(`Unable to find popover action button: ${name.source}`);
}

export function getSelectTrigger(container: HTMLElement, id: string): HTMLElement {
  const input = container.querySelector(`input#${id}[role="combobox"]`);
  const trigger = input?.closest('.ant-select');
  if (trigger instanceof HTMLElement) return trigger;
  throw new Error(`Unable to find select trigger: ${id}`);
}

export function getSelectTriggerByName(container: HTMLElement, name: string): HTMLElement {
  const input = within(container).getByRole('combobox', { name });
  const trigger = input.closest('.ant-select');
  if (trigger instanceof HTMLElement) return trigger;
  throw new Error(`Unable to find select trigger: ${name}`);
}

export function getTableRowByText(text: string): HTMLElement {
  const row = screen.getByText(text).closest('tr');
  if (row instanceof HTMLElement) return row;
  throw new Error(`Unable to find table row for: ${text}`);
}
