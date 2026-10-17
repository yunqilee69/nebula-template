import { DataType, type CreateSystemParamReq, type DataType as ParamDataType, type SystemParamDetailResp, type UpdateSystemParamReq } from '@/types/param';
import type { EncryptedValueChange, EncryptedValueChangeKind } from '@/components/encrypted-value-field';
import type { ParamValueInputValue } from './components/param-value-input';
import { normalizeParamValue } from './param-page-shared';

export const PARAM_DATA_TYPE_VALUES = [
  DataType.STRING,
  DataType.INT,
  DataType.DOUBLE,
  DataType.BOOLEAN,
  DataType.SINGLE,
  DataType.MULTIPLE,
] as const;

export const PARAM_MASKED_VALUE = '****';

export const paramI18n = {
  actions: {
    create: 'system.config.param.actions.create',
    edit: 'system.config.param.actions.edit',
    delete: 'system.config.param.actions.delete',
    save: 'system.config.param.actions.save',
    cancel: 'system.config.param.actions.cancel',
    revealValue: 'system.config.param.actions.revealValue',
    hideValue: 'system.config.param.actions.hideValue',
  },
  inputs: {
    value: 'system.config.param.inputs.value',
  },
  encrypted: {
    label: 'system.config.param.encrypted.label',
  },
  columns: {
    paramKey: 'system.config.param.columns.paramKey',
    paramName: 'system.config.param.columns.paramName',
    paramValue: 'system.config.param.columns.paramValue',
    dataType: 'system.config.param.columns.dataType',
    moduleCode: 'system.config.param.columns.moduleCode',
    actions: 'system.config.param.columns.actions',
  },
  fields: {
    paramKey: 'system.config.param.fields.paramKey',
    paramName: 'system.config.param.fields.paramName',
    description: 'system.config.param.fields.description',
    paramValue: 'system.config.param.fields.paramValue',
    dataType: 'system.config.param.fields.dataType',
    optionCode: 'system.config.param.fields.optionCode',
    moduleCode: 'system.config.param.fields.moduleCode',
  },
  placeholders: {
    paramKey: 'system.config.param.placeholders.paramKey',
    paramName: 'system.config.param.placeholders.paramName',
    description: 'system.config.param.placeholders.description',
    dataType: 'system.config.param.placeholders.dataType',
    optionCode: 'system.config.param.placeholders.optionCode',
    moduleCode: 'system.config.param.placeholders.moduleCode',
  },
  validation: {
    paramKeyRequired: 'system.config.param.validation.paramKeyRequired',
    paramNameRequired: 'system.config.param.validation.paramNameRequired',
    dataTypeRequired: 'system.config.param.validation.dataTypeRequired',
  },
  modal: {
    createTitle: 'system.config.param.modal.createTitle',
    editTitle: 'system.config.param.modal.editTitle',
  },
  dataTypes: {
    [DataType.STRING]: 'system.config.param.dataTypes.string',
    [DataType.INT]: 'system.config.param.dataTypes.int',
    [DataType.DOUBLE]: 'system.config.param.dataTypes.double',
    [DataType.BOOLEAN]: 'system.config.param.dataTypes.boolean',
    [DataType.SINGLE]: 'system.config.param.dataTypes.single',
    [DataType.MULTIPLE]: 'system.config.param.dataTypes.multiple',
  },
  feedback: {
    listLoadFailed: 'system.config.param.feedback.listLoadFailed',
    detailLoadFailed: 'system.config.param.feedback.detailLoadFailed',
    moduleOptionsLoadFailedTitle: 'system.config.param.feedback.moduleOptionsLoadFailedTitle',
    moduleOptionsLoadFailed: 'system.config.param.feedback.moduleOptionsLoadFailed',
    createSuccess: 'system.config.param.feedback.createSuccess',
    updateSuccess: 'system.config.param.feedback.updateSuccess',
    deleteSuccess: 'system.config.param.feedback.deleteSuccess',
  },
  confirm: {
    deleteTitle: 'system.config.param.confirm.deleteTitle',
  },
} as const;

export type ParamFormMode = 'create' | 'update';

export interface ParamFormValues {
  readonly paramKey: string;
  readonly paramName: string;
  readonly description?: string;
  readonly paramValue?: ParamValueInputValue;
  readonly dataType: ParamDataType;
  readonly optionCode?: string;
  readonly moduleCode?: string;
  /** 仅创建：是否加密存储，勾选后 dataType 锁定为 STRING。 */
  readonly encrypted?: boolean;
  /** 仅更新加密参数：加密值三态意图（keep/set/clear）。 */
  readonly encryptedValue?: EncryptedValueChange;
}

export type ParamFormState =
  | Readonly<{ mode: 'create' }>
  | Readonly<{ mode: 'update'; paramId: string }>;

export function assertNever(value: never): never {
  throw new Error(`Unsupported parameter form state: ${String(value)}`);
}

export function getParamRevealKey(record: SystemParamDetailResp): string | undefined {
  return normalizeOptionalText(record.id) ?? normalizeOptionalText(record.paramKey);
}

export function formatParamCellText(value: string | number | boolean | null | undefined): string {
  if (value === undefined || value === null || value === '') return '-';
  return String(value);
}

export function usesDictionaryOptions(dataType: ParamDataType): boolean {
  return dataType === DataType.SINGLE || dataType === DataType.MULTIPLE;
}

export function toCreateParamReq(values: ParamFormValues): CreateSystemParamReq {
  const req: CreateSystemParamReq = {
    paramKey: normalizeRequiredText(values.paramKey),
    paramName: normalizeRequiredText(values.paramName),
    dataType: values.dataType,
    ...buildOptionalParamPayload(values),
  };
  setIfDefined(req, 'encrypted', values.encrypted ? true : undefined);
  return req;
}

export function toUpdateParamReq(values: ParamFormValues): UpdateSystemParamReq {
  return {
    paramName: normalizeRequiredText(values.paramName),
    dataType: values.dataType,
    ...buildOptionalParamPayload(values),
  };
}

export function toParamFormValues(detail: SystemParamDetailResp): Partial<ParamFormValues> {
  const values: Partial<ParamFormValues> = {};
  setIfDefined(values, 'paramKey', detail.paramKey);
  setIfDefined(values, 'paramName', detail.paramName);
  setIfDefined(values, 'description', detail.description);
  // 加密参数的详情不回传明文（null）：不写入表单，避免被当成待提交的值。
  setIfDefined(values, 'paramValue', detail.paramValue ?? undefined);
  setIfDefined(values, 'dataType', detail.dataType);
  setIfDefined(values, 'optionCode', detail.optionCode);
  setIfDefined(values, 'moduleCode', detail.moduleCode);
  return values;
}

function buildOptionalParamPayload(values: ParamFormValues): Partial<CreateSystemParamReq> {
  const payload: Partial<CreateSystemParamReq> = {};
  const paramValue = resolveParamValue(values);
  setIfDefined(payload, 'description', normalizeOptionalText(values.description));
  setIfDefined(payload, 'paramValue', paramValue);
  if (usesDictionaryOptions(values.dataType)) {
    setIfDefined(payload, 'optionCode', normalizeOptionalText(values.optionCode));
  }
  setIfDefined(payload, 'moduleCode', normalizeOptionalText(values.moduleCode));
  return payload;
}

/**
 * 加密参数的编辑意图翻译：`keep` 省略 paramValue 字段（不修改值）；`set` 提交新明文；`clear` 提交空串。
 * 明文非加密参数直接走常规归一化。
 */
function resolveParamValue(values: ParamFormValues): string | undefined {
  const intent = values.encryptedValue;
  if (!intent) return normalizeParamValueForPayload(values);

  const kind: EncryptedValueChangeKind = intent.kind;
  switch (kind) {
    case 'keep':
      return undefined;
    case 'clear':
      return '';
    case 'set': {
      // 空明文等价于「不修改」：空串在本接口另有「清除值」的语义，两者不能混用。
      const plaintext = intent.value ?? '';
      return plaintext === '' ? undefined : plaintext;
    }
    default:
      return assertNever(kind);
  }
}

function normalizeParamValueForPayload(values: ParamFormValues): string | undefined {
  const normalized = normalizeParamValue(values.paramValue, values.dataType);
  if (normalized === undefined) return undefined;
  return typeof normalized === 'string' ? normalized : String(normalized);
}

function normalizeOptionalText(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized || undefined;
}

function normalizeRequiredText(value: string): string {
  return normalizeOptionalText(value) ?? '';
}

function setIfDefined<Key extends keyof ParamFormValues>(
  values: Partial<ParamFormValues>,
  key: Key,
  value: ParamFormValues[Key] | undefined,
): void;
function setIfDefined<Key extends keyof CreateSystemParamReq>(
  values: Partial<CreateSystemParamReq>,
  key: Key,
  value: CreateSystemParamReq[Key] | undefined,
): void;
function setIfDefined(values: Record<string, unknown>, key: string, value: unknown): void {
  if (value !== undefined) values[key] = value;
}
