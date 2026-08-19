import { useCallback } from 'react';
import type { NebulaPageReq } from '@/components/nebula-pro-table';
import { getMessages } from '@/i18n/messages';
import { useNebulaI18n } from '@/hooks/use-nebula-i18n';
import type {
  CreateDictItemReq,
  DictItemPageReq,
  DictItemTreeResp,
  UpdateDictItemReq,
} from '@/types/dict';
import type { DictItemQuery } from '../dict-page-params';
import { buildDictItemPageReq } from '../dict-page-params';

type DictMessageKey = `system.config.dict.${string}.${string}`;

function dictKey(key: DictMessageKey): DictMessageKey {
  return key;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function resolveDictMessage(key: DictMessageKey, messages: unknown): string {
  let current: unknown = messages;

  for (const segment of key.split('.')) {
    if (!isRecord(current)) return key;
    current = current[segment];
  }

  return typeof current === 'string' ? current : key;
}

export function useDictItemI18n() {
  const { locale } = useNebulaI18n();
  const messages = getMessages(locale);

  return useCallback((key: DictMessageKey) => resolveDictMessage(key, messages), [messages]);
}

export const dictI18n = {
  actions: {
    createItem: dictKey('system.config.dict.actions.createItem'),
    edit: dictKey('system.config.dict.actions.edit'),
    delete: dictKey('system.config.dict.actions.delete'),
    save: dictKey('system.config.dict.actions.save'),
    cancel: dictKey('system.config.dict.actions.cancel'),
  },
  columns: {
    code: dictKey('system.config.dict.columns.code'),
    name: dictKey('system.config.dict.columns.name'),
    itemValue: dictKey('system.config.dict.columns.itemValue'),
    parentId: dictKey('system.config.dict.columns.parentId'),
    sort: dictKey('system.config.dict.columns.sort'),
    status: dictKey('system.config.dict.columns.status'),
    actions: dictKey('system.config.dict.columns.actions'),
  },
  fields: {
    name: dictKey('system.config.dict.fields.name'),
    itemValue: dictKey('system.config.dict.fields.itemValue'),
    parentId: dictKey('system.config.dict.fields.parentId'),
    sort: dictKey('system.config.dict.fields.sort'),
    status: dictKey('system.config.dict.fields.status'),
    tagColor: dictKey('system.config.dict.fields.tagColor'),
    remark: dictKey('system.config.dict.fields.remark'),
  },
  modal: {
    itemTitle: dictKey('system.config.dict.modal.itemTitle'),
    createItemTitle: dictKey('system.config.dict.modal.createItemTitle'),
    editItemTitle: dictKey('system.config.dict.modal.editItemTitle'),
  },
  placeholders: {
    name: dictKey('system.config.dict.placeholders.name'),
    itemValue: dictKey('system.config.dict.placeholders.itemValue'),
    parentId: dictKey('system.config.dict.placeholders.parentId'),
    tagColor: dictKey('system.config.dict.placeholders.tagColor'),
    remark: dictKey('system.config.dict.placeholders.remark'),
  },
  validation: {
    nameRequired: dictKey('system.config.dict.validation.nameRequired'),
    itemValueRequired: dictKey('system.config.dict.validation.itemValueRequired'),
  },
  status: {
    enabled: dictKey('system.config.dict.status.enabled'),
    disabled: dictKey('system.config.dict.status.disabled'),
  },
  feedback: {
    itemOptionsLoadFailed: dictKey('system.config.dict.feedback.itemOptionsLoadFailed'),
    itemListLoadFailed: dictKey('system.config.dict.feedback.itemListLoadFailed'),
    itemCreateSuccess: dictKey('system.config.dict.feedback.itemCreateSuccess'),
    itemUpdateSuccess: dictKey('system.config.dict.feedback.itemUpdateSuccess'),
    itemDeleteSuccess: dictKey('system.config.dict.feedback.itemDeleteSuccess'),
  },
  confirm: {
    itemDeleteTitle: dictKey('system.config.dict.confirm.itemDeleteTitle'),
  },
} as const;

export interface DictItemTableQuery extends DictItemQuery, NebulaPageReq {
  readonly parentId?: string;
}

export interface DictItemFormValues {
  readonly name: string;
  readonly parentId?: string;
  readonly itemValue: string;
  readonly sort?: number;
  readonly enabled?: boolean;
  readonly tagColor?: string;
  readonly remark?: string;
}

export interface DictItemSelectOption {
  readonly label: string;
  readonly value: string;
}

export type DictItemPageReqWithParent = DictItemPageReq & { readonly parentId?: string };
export type DictItemUpdatePayload = UpdateDictItemReq & { readonly parentId?: string };
export type DictItemFormState = { readonly mode: 'create' } | { readonly mode: 'update'; readonly itemId: string };

export function assertNever(value: never): never {
  throw new Error(`Unhandled dictionary item form state: ${String(value)}`);
}

function normalizeOptionalText(value: string | undefined) {
  const normalized = value?.trim();
  return normalized || undefined;
}

export function buildDictItemTablePageReq(params: DictItemTableQuery): DictItemPageReqWithParent {
  const parentId = normalizeOptionalText(params.parentId);
  const req = buildDictItemPageReq(params);
  return parentId ? { ...req, parentId } : req;
}

function toDictItemPayload(values: DictItemFormValues): DictItemUpdatePayload {
  const parentId = normalizeOptionalText(values.parentId);
  const tagColor = normalizeOptionalText(values.tagColor);
  const remark = normalizeOptionalText(values.remark);

  return {
    name: values.name.trim(),
    itemValue: values.itemValue.trim(),
    sort: values.sort ?? 0,
    enabled: values.enabled ?? true,
    ...(parentId ? { parentId } : {}),
    ...(tagColor ? { tagColor } : {}),
    ...(remark ? { remark } : {}),
  };
}

export function toCreateDictItemReq(dictCode: string, values: DictItemFormValues): CreateDictItemReq {
  return { dictCode: dictCode.trim(), ...toDictItemPayload(values) };
}

export function toUpdateDictItemReq(values: DictItemFormValues): DictItemUpdatePayload {
  return toDictItemPayload(values);
}

export function flattenDictItemOptions(items: readonly DictItemTreeResp[], excludedId?: string): DictItemSelectOption[] {
  return items.flatMap((item) => {
    if (item.id === excludedId) return [];
    return [{ label: item.name, value: item.id }, ...flattenDictItemOptions(item.children ?? [], excludedId)];
  });
}
