import { useCallback } from 'react';
import type { NebulaPageReq } from '@/components/nebula-pro-table';
import { getMessages } from '@/i18n/messages';
import { useNebulaI18n } from '@/hooks/use-nebula-i18n';
import type { CreateDictTypeReq, UpdateDictTypeReq } from '@/types/dict';
import type { DictTypeQuery } from './dict-page-params';

export type DictMessageKey = `system.config.dict.${string}.${string}`;
export type DictTypeTableQuery = DictTypeQuery & NebulaPageReq;
export type DictTypeFormState = { readonly mode: 'create' } | { readonly mode: 'update'; readonly typeId: string };

export interface DictTypeFormValues {
  readonly code: string;
  readonly name: string;
  readonly remark?: string;
}

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

export function useDictTypeI18n() {
  const { locale } = useNebulaI18n();
  const messages = getMessages(locale);

  return useCallback((key: DictMessageKey) => resolveDictMessage(key, messages), [messages]);
}

export const dictTypeI18n = {
  actions: {
    createType: dictKey('system.config.dict.actions.createType'),
    items: dictKey('system.config.dict.actions.items'),
    edit: dictKey('system.config.dict.actions.edit'),
    delete: dictKey('system.config.dict.actions.delete'),
    save: dictKey('system.config.dict.actions.save'),
    cancel: dictKey('system.config.dict.actions.cancel'),
  },
  columns: {
    code: dictKey('system.config.dict.columns.code'),
    name: dictKey('system.config.dict.columns.name'),
    remark: dictKey('system.config.dict.columns.remark'),
    actions: dictKey('system.config.dict.columns.actions'),
  },
  fields: {
    code: dictKey('system.config.dict.fields.code'),
    name: dictKey('system.config.dict.fields.name'),
    remark: dictKey('system.config.dict.fields.remark'),
  },
  modal: {
    createTypeTitle: dictKey('system.config.dict.modal.createTypeTitle'),
    editTypeTitle: dictKey('system.config.dict.modal.editTypeTitle'),
  },
  placeholders: {
    code: dictKey('system.config.dict.placeholders.code'),
    name: dictKey('system.config.dict.placeholders.name'),
    remark: dictKey('system.config.dict.placeholders.remark'),
  },
  validation: {
    codeRequired: dictKey('system.config.dict.validation.codeRequired'),
    nameRequired: dictKey('system.config.dict.validation.nameRequired'),
  },
  feedback: {
    typeListLoadFailed: dictKey('system.config.dict.feedback.typeListLoadFailed'),
    typeCreateSuccess: dictKey('system.config.dict.feedback.typeCreateSuccess'),
    typeUpdateSuccess: dictKey('system.config.dict.feedback.typeUpdateSuccess'),
    typeDeleteSuccess: dictKey('system.config.dict.feedback.typeDeleteSuccess'),
  },
  confirm: {
    typeDeleteTitle: dictKey('system.config.dict.confirm.typeDeleteTitle'),
  },
} as const;

export function assertNever(value: never): never {
  throw new Error(`Unhandled dictionary type form state: ${String(value)}`);
}

function normalizeOptionalText(value: string | undefined) {
  const normalized = value?.trim();
  return normalized || undefined;
}

export function toCreateDictTypeReq(values: DictTypeFormValues): CreateDictTypeReq {
  const remark = normalizeOptionalText(values.remark);

  return {
    code: values.code.trim(),
    name: values.name.trim(),
    ...(remark ? { remark } : {}),
  };
}

export function toUpdateDictTypeReq(values: DictTypeFormValues): UpdateDictTypeReq {
  const remark = normalizeOptionalText(values.remark);

  return {
    name: values.name.trim(),
    ...(remark ? { remark } : {}),
  };
}

export function getTypeFormTitle(formState: DictTypeFormState, t: ReturnType<typeof useDictTypeI18n>) {
  switch (formState.mode) {
    case 'create':
      return t(dictTypeI18n.modal.createTypeTitle);
    case 'update':
      return t(dictTypeI18n.modal.editTypeTitle);
    default:
      return assertNever(formState);
  }
}
