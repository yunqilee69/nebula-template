import { DataType, type CreateSystemParamReq, type DataType as ParamDataType, type SystemParamDetailResp, type UpdateSystemParamReq } from '@/types/param';
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

export function formatParamCellText(value: string | number | boolean | undefined): string {
  if (value === undefined || value === '') return '-';
  return String(value);
}

export function usesDictionaryOptions(dataType: ParamDataType): boolean {
  return dataType === DataType.SINGLE || dataType === DataType.MULTIPLE;
}

export function toCreateParamReq(values: ParamFormValues): CreateSystemParamReq {
  return {
    paramKey: normalizeRequiredText(values.paramKey),
    paramName: normalizeRequiredText(values.paramName),
    dataType: values.dataType,
    ...buildOptionalParamPayload(values),
  };
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
  setIfDefined(values, 'paramValue', detail.paramValue);
  setIfDefined(values, 'dataType', detail.dataType);
  setIfDefined(values, 'optionCode', detail.optionCode);
  setIfDefined(values, 'moduleCode', detail.moduleCode);
  return values;
}

function buildOptionalParamPayload(values: ParamFormValues): Partial<CreateSystemParamReq> {
  const payload: Partial<CreateSystemParamReq> = {};
  const paramValue = normalizeParamValueForPayload(values);
  setIfDefined(payload, 'description', normalizeOptionalText(values.description));
  setIfDefined(payload, 'paramValue', paramValue);
  if (usesDictionaryOptions(values.dataType)) {
    setIfDefined(payload, 'optionCode', normalizeOptionalText(values.optionCode));
  }
  setIfDefined(payload, 'moduleCode', normalizeOptionalText(values.moduleCode));
  return payload;
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
