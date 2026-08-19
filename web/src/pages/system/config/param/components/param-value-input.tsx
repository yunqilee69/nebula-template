import { Input, InputNumber, Switch } from 'antd';
import type { Rule } from 'antd/es/form';
import { useCallback, useMemo } from 'react';
import { DictSelect } from '@/components/dict-select';
import { DataType, type DataType as ParamDataType } from '@/types/param';
import { normalizeParamValue } from '../param-page-shared';
import { useNebulaI18n } from '@/hooks/use-nebula-i18n';

const PARAM_VALUE_LABEL_KEY = 'system.config.param.inputs.value';
const PARAM_VALUE_PLACEHOLDER_KEY = 'system.config.param.placeholders.value';

export type ParamValueInputValue = string | number | boolean | string[] | undefined;

export interface ParamValueInputProps {
  readonly dataType: ParamDataType;
  readonly value?: ParamValueInputValue;
  readonly optionCode?: string;
  readonly disabled?: boolean;
  readonly onChange?: (value: ParamValueInputValue) => void;
}

function assertNever(value: never): never {
  throw new Error(`Unsupported parameter data type: ${String(value)}`);
}

function useParamTranslator(): (key: string) => string {
  const { t } = useNebulaI18n();
  return useCallback((key: string) => String(Reflect.apply(t, undefined, [key])), [t]);
}

function normalizeOptionValue(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  const normalized = String(value).trim();
  return normalized || undefined;
}

function parseMultipleValue(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeOptionValue(item))
      .filter((item): item is string => item !== undefined);
  }

  const normalized = normalizeParamValue(value, DataType.MULTIPLE);
  if (typeof normalized !== 'string') return [];
  if (!normalized.startsWith('[')) return [normalized];

  try {
    const parsed: unknown = JSON.parse(normalized);
    return Array.isArray(parsed) ? parseMultipleValue(parsed) : [];
  } catch (error: unknown) {
    if (error instanceof SyntaxError) return [];
    throw error;
  }
}

function normalizeNumericChange(value: string | number | null): number | undefined {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

export function toParamInputValue(value: unknown, dataType: ParamDataType): ParamValueInputValue {
  switch (dataType) {
    case DataType.STRING:
    case DataType.SINGLE:
    case DataType.INT:
    case DataType.DOUBLE:
    case DataType.BOOLEAN:
      return normalizeParamValue(value, dataType);
    case DataType.MULTIPLE:
      return parseMultipleValue(value);
    default:
      return assertNever(dataType);
  }
}

export function buildParamValueRules(): Rule[] {
  return [];
}

export function ParamValueInput({
  dataType,
  value,
  optionCode,
  disabled = false,
  onChange,
}: ParamValueInputProps) {
  const translate = useParamTranslator();
  const inputValue = useMemo(() => toParamInputValue(value, dataType), [dataType, value]);
  const valueLabel = translate(PARAM_VALUE_LABEL_KEY);
  const valuePlaceholder = translate(PARAM_VALUE_PLACEHOLDER_KEY);

  switch (dataType) {
    case DataType.STRING:
      return (
        <Input.TextArea
          key={DataType.STRING}
          aria-label={valueLabel}
          allowClear
          disabled={disabled}
          placeholder={valuePlaceholder}
          rows={3}
          value={typeof inputValue === 'string' ? inputValue : ''}
          onChange={(event) => onChange?.(event.target.value)}
        />
      );
    case DataType.INT:
    case DataType.DOUBLE:
      return (
        <InputNumber
          key={dataType}
          aria-label={valueLabel}
          disabled={disabled}
          placeholder={valuePlaceholder}
          precision={dataType === DataType.INT ? 0 : undefined}
          step={dataType === DataType.INT ? 1 : undefined}
          style={{ width: '100%' }}
          value={typeof inputValue === 'number' ? inputValue : null}
          onChange={(nextValue) => onChange?.(normalizeNumericChange(nextValue))}
        />
      );
    case DataType.BOOLEAN:
      return (
        <Switch
          key={DataType.BOOLEAN}
          aria-label={valueLabel}
          checked={inputValue === true}
          disabled={disabled}
          onChange={(checked) => onChange?.(checked)}
        />
      );
    case DataType.SINGLE:
      return (
        <DictSelect
          key={`${DataType.SINGLE}-${optionCode ?? ''}`}
          dictCode={optionCode ?? ''}
          aria-label={valueLabel}
          allowClear
          disabled={disabled}
          placeholder={valuePlaceholder}
          value={typeof inputValue === 'string' && inputValue ? inputValue : undefined}
          onChange={(nextValue) => onChange?.(typeof nextValue === 'string' ? nextValue : undefined)}
        />
      );
    case DataType.MULTIPLE:
      return (
        <DictSelect
          key={`${DataType.MULTIPLE}-${optionCode ?? ''}`}
          dictCode={optionCode ?? ''}
          mode="multiple"
          aria-label={valueLabel}
          allowClear
          disabled={disabled}
          placeholder={valuePlaceholder}
          value={parseMultipleValue(inputValue)}
          onChange={(nextValue) => onChange?.(Array.isArray(nextValue) ? nextValue : [])}
        />
      );
    default:
      return assertNever(dataType);
  }
}
